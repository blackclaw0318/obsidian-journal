// ============================================================
// /api/admin/media - 媒体库 CRUD (Phase 3.6, v0.33.1 流式写盘)
// GET:  列表 (mime 前缀 + 搜索)
// POST: 上传 (multipart, busboy 流式, pipe 到 fs.createWriteStream)
//  - 取消 await arrayBuffer() 全量读内存
//  - 边传边写: 大视频不再 524 (100s Cloudflare origin timeout)
// ============================================================
import { NextResponse } from "next/server";
import { existsSync, createWriteStream, unlinkSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import Busboy from "busboy";
import { requireUser } from "@/lib/auth";
import { mediaRepo } from "@/lib/repo";

export const runtime = "nodejs";
// Next.js framework max execution (Cloudflare 仍受 100s 限制, 流式大幅减少耗时)
export const maxDuration = 60;

// 允许的 mime 前缀
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB (硬限制)

const UPLOAD_DIR = resolve(process.cwd(), "public/uploads");

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function safeExt(filename: string): string {
  // 只允许字母数字, 否则替换为 ""
  const ext = extname(filename).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `.${ext}` : "";
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
  // Auth: req.body 是 ReadableStream, 不能同时 await json() / formData(),
  // 但 requireUser 不读 body, 所以可以先验证再 pipe
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!req.body) {
    return NextResponse.json({ ok: false, error: "no_body" }, { status: 400 });
  }

  ensureUploadDir();

  return new Promise<Response>((resolve) => {
    const bb = Busboy({
      headers: Object.fromEntries(req.headers as Headers),
      limits: {
        fileSize: MAX_SIZE,
        files: 1
      }
    });

    let storedFilename = "";
    let storedMimeType = "";
    let alt = "";
    let totalSize = 0;
    let errorCode: string | null = null;
    let errorDetail: string | null = null;
    let fileDone = false;
    let writeError: Error | null = null;
    let writeStream: ReturnType<typeof createWriteStream> | null = null;

    bb.on("file", (_fieldname, file, info) => {
      storedMimeType = info.mimeType;

      // 早期 mime 校验
      if (!info.mimeType || !ALLOWED_MIME_PREFIXES.some((p) => info.mimeType.startsWith(p))) {
        errorCode = "unsupported_mime";
        errorDetail = info.mimeType || "unknown";
        file.resume(); // 必须消费 stream 否则 busboy hang
        return;
      }

      const hash = randomBytes(8).toString("hex");
      const ext = safeExt(info.filename);
      storedFilename = `${hash}${ext}`;
      const fullPath = join(UPLOAD_DIR, storedFilename);

      writeStream = createWriteStream(fullPath);

      file.on("limit", () => {
        errorCode = "file_too_large";
        errorDetail = `${MAX_SIZE} bytes max`;
        try { writeStream?.destroy(); } catch { /* ignore */ }
        // 清理半成品文件
        try { unlinkSync(fullPath); } catch { /* ignore */ }
      });

      file.on("error", (err: Error) => {
        writeError = err;
        errorCode = "write_error";
        errorDetail = err.message;
        try { writeStream?.destroy(); } catch { /* ignore */ }
      });

      file.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
      });

      file.on("end", () => {
        fileDone = true;
      });

      // pipe 到 writeStream (流式, 不读入内存)
      file.pipe(writeStream);
    });

    bb.on("field", (name, val) => {
      if (name === "alt" && typeof val === "string") alt = val;
    });

    bb.on("error", (err: Error) => {
      errorCode = "parse_error";
      errorDetail = err.message;
    });

    bb.on("close", () => {
      // 等 writeStream 关闭 (确保文件已 flush)
      const respond = () => {
        if (errorCode) {
          resolve(NextResponse.json({
            ok: false,
            error: errorCode,
            detail: errorDetail,
            allowed: ALLOWED_MIME_PREFIXES,
            maxSize: MAX_SIZE
          }, { status: 400 }));
          return;
        }
        if (writeError) {
          resolve(NextResponse.json({ ok: false, error: "write_error", detail: writeError.message }, { status: 500 }));
          return;
        }
        if (!fileDone || !storedFilename) {
          resolve(NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 }));
          return;
        }

        const url = `/uploads/${storedFilename}`;
        const item = mediaRepo.create({
          filename: storedFilename,
          mime_type: storedMimeType,
          size: totalSize,
          width: null,
          height: null,
          alt: alt.trim() || null,
          url,
          storage_type: "local"
        });
        resolve(NextResponse.json({ ok: true, media: item }, { status: 201 }));
      };

      if (writeStream) {
        writeStream.on("close", respond);
        writeStream.on("error", (err: Error) => {
          errorCode = "write_error";
          errorDetail = err.message;
          respond();
        });
        // 触发 end 确保 close
        if (!fileDone) writeStream.end();
      } else {
        respond();
      }
    });

    // Web ReadableStream → Node.js Readable → busboy
    try {
      Readable.fromWeb(req.body as any).pipe(bb);
    } catch (err) {
      resolve(NextResponse.json({ ok: false, error: `stream_pipe_failed: ${(err as Error).message}` }, { status: 500 }));
    }
  });
}
