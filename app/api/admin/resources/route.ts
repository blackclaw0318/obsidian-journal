// ============================================================
// /api/admin/resources - 资源库 CRUD (v0.34 Phase 4, 旧 media 升级 + 砍 video)
// GET:  列表 (mime 前缀 + 搜索)
// POST: 上传 (multipart, busboy 流式, race-safe respond)
//  - finish + writableFinished 检查 (消 race)
//  - 错误路径立即 respond (不依赖 bb close)
//  - 幂等 + 超时 + abort 信号
// ============================================================
import { NextResponse } from "next/server";
import { existsSync, createWriteStream, unlinkSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import Busboy from "busboy";
import { requireUser } from "@/lib/auth";
import { mediaRepo } from "@/lib/repo";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const UPLOAD_DIR = resolve(process.cwd(), "public/uploads");

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function safeExt(filename: string): string {
  const ext = extname(filename).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `.${ext}` : "";
}

function errBody(code: string, detail?: string) {
  return {
    ok: false,
    error: code,
    detail,
    allowed: ALLOWED_MIME_PREFIXES,
    maxSize: MAX_SIZE
  };
}

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mimePrefix = url.searchParams.get("mime_prefix") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const result = mediaRepo.listAll({ mimePrefix, q, limit: 200 });
  return NextResponse.json({ ok: true, ...result, totalSize: mediaRepo.totalSize() });
}

export async function POST(req: Request) {
  // Auth (不读 body)
  try { await requireUser(); }
  catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  if (!req.body) {
    return NextResponse.json({ ok: false, error: "no_body" }, { status: 400 });
  }

  ensureUploadDir();

  return new Promise<Response>((resolve) => {
    // === 修 #3: 幂等 + 超时 + abort ===
    let responded = false;
    let writeStream: ReturnType<typeof createWriteStream> | null = null;
    let pendingStorageDir = ""; // 失败的半成品文件路径, 用于清理

    const respond = (status: number, body: any) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeoutHandle);
      // 清理半成品文件 (如果未响应 201)
      if (status !== 201 && pendingStorageDir) {
        try { unlinkSync(pendingStorageDir); } catch { /* ignore */ }
      }
      try { writeStream?.destroy(); } catch { /* ignore */ }
      try { nodeStream?.destroy(); } catch { /* ignore */ }
      resolve(NextResponse.json(body, { status }));
    };

    // 超时兜底 (maxDuration - 1s)
    const timeoutHandle = setTimeout(() => {
      respond(408, errBody("upload_timeout", `> ${maxDuration}s`));
    }, (maxDuration - 1) * 1000);

    // client 断开感知 (Next.js AbortSignal)
    req.signal?.addEventListener("abort", () => {
      respond(499, errBody("client_aborted", "client disconnected"));
    });

    // === busboy ===
    const bb = Busboy({
      headers: Object.fromEntries(req.headers as Headers),
      limits: { fileSize: MAX_SIZE, files: 1 }
    });

    let totalSize = 0;
    let storedFilename = "";
    let storedMimeType = "";
    let alt = "";
    let fileDone = false;
    let writeError: Error | null = null;

    bb.on("file", (_fieldname, file, info) => {
      storedMimeType = info.mimeType;

      // 早期 mime 校验 (修 #2: 立即 respond, 不等 bb close)
      if (!info.mimeType || !ALLOWED_MIME_PREFIXES.some((p) => info.mimeType.startsWith(p))) {
        file.resume(); // 必须消费 stream 否则 busboy hang
        respond(400, errBody("unsupported_mime", info.mimeType || "unknown"));
        return;
      }

      const hash = randomBytes(8).toString("hex");
      const ext = safeExt(info.filename);
      storedFilename = `${hash}${ext}`;
      const fullPath = join(UPLOAD_DIR, storedFilename);
      pendingStorageDir = fullPath;

      writeStream = createWriteStream(fullPath);

      file.on("limit", () => {
        respond(400, errBody("file_too_large", `${MAX_SIZE} bytes max`));
      });

      file.on("error", (err: Error) => {
        writeError = err;
        respond(500, errBody("upload_stream_error", err.message));
      });

      file.on("data", (chunk: Buffer) => { totalSize += chunk.length; });

      file.on("end", () => { fileDone = true; });

      file.pipe(writeStream);
    });

    bb.on("field", (name, val) => {
      if (name === "alt" && typeof val === "string") alt = val;
    });

    bb.on("error", (err: Error) => {
      respond(500, errBody("parse_error", err.message));
    });

    // === 修 #1: race-safe respond 触发 ===
    // 用 'finish' (在 'close' 前) + writableFinished 立即检查 (race-safe)
    const tryRespond = () => {
      if (responded) return;

      if (writeError) {
        respond(500, errBody("write_error", writeError.message));
        return;
      }

      if (!writeStream || !storedFilename) {
        // 没有 file 字段
        respond(400, errBody("missing_file"));
        return;
      }

      // race-safe 检查: writeStream 已 finish?
      if (writeStream.writableFinished) {
        // 已 flush, 立即 DB insert + 201
        insertAndRespond();
        return;
      }

      // 还没 finish, 监听 'finish' (早于 'close', 更稳妥)
      writeStream.once("finish", tryRespond);
      writeStream.once("error", (err: Error) =>
        respond(500, errBody("write_error", err.message))
      );
      // 确保 end 触发 (no-op if file 触发了 auto-end via pipe)
      if (!fileDone) writeStream.end();
    };

    const insertAndRespond = () => {
      try {
        const url = `/uploads/${storedFilename}`;
        const { categoryFromMime } = require("@/lib/counter");
        const item = mediaRepo.create({
          filename: storedFilename,
          mime_type: storedMimeType,
          size: totalSize,
          width: null,
          height: null,
          alt: alt.trim() || null,
          url,
          storage_type: "local",
          category: categoryFromMime(storedMimeType),
          is_paid: false
        });
        respond(201, { ok: true, media: item });
      } catch (err) {
        respond(500, errBody("db_error", (err as Error).message));
      }
    };

    bb.on("close", () => {
      tryRespond();
    });

    // === Web ReadableStream → Node.js Readable → busboy ===
    const nodeStream = Readable.fromWeb(req.body as any);
    nodeStream.on("error", (err: Error) => {
      respond(500, errBody("request_stream_error", err.message));
    });

    try {
      nodeStream.pipe(bb);
    } catch (err) {
      respond(500, errBody("stream_pipe_failed", (err as Error).message));
    }
  });
}
