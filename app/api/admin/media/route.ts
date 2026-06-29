// ============================================================
// /api/admin/media - 媒体库 CRUD (Phase 3.6)
// GET:  列表 (支持 mime 前缀过滤 + 搜索)
// POST: 上传 (multipart/form-data, file 字段)
// ============================================================
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { requireUser } from "@/lib/auth";
import { mediaRepo } from "@/lib/repo";

export const runtime = "nodejs";

// 允许的 mime 前缀
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const UPLOAD_DIR = resolve(process.cwd(), "public/uploads");

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    // 同步创建, 不阻塞主流程
    require("node:fs").mkdirSync(UPLOAD_DIR, { recursive: true });
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
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_formdata" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }
  const alt = (formData.get("alt") ?? "").toString().trim();

  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "file_too_large", maxSize: MAX_SIZE }, { status: 400 });
  }
  if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json(
      { ok: false, error: "unsupported_mime", allowed: ALLOWED_MIME_PREFIXES, got: file.type },
      { status: 400 }
    );
  }

  ensureUploadDir();

  // 文件名: {8字节随机 hex}{ext}
  const hash = randomBytes(8).toString("hex");
  const ext = safeExt(file.name);
  const storedFilename = `${hash}${ext}`;
  const fullPath = join(UPLOAD_DIR, storedFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  const url = `/uploads/${storedFilename}`;

  const item = mediaRepo.create({
    filename: storedFilename,
    mime_type: file.type,
    size: file.size,
    width: null,
    height: null,
    alt: alt || null,
    url,
    storage_type: "local"
  });

  return NextResponse.json({ ok: true, media: item }, { status: 201 });
}
