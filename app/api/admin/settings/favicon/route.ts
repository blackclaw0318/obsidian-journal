// ============================================================
// /api/admin/settings/favicon - favicon 上传 (v0.31, P2-20 兑现)
// POST: multipart/form-data 上传 image, sharp resize → 64x64 webp
//       写到 public/uploads/favicons/{id}.webp, 写回 SiteConfig.favicon
// DELETE: 清空 favicon (回到 Next.js 自动生成的 app/icon.png)
// ============================================================

import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { siteConfigRepo } from "@/lib/repo";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB (favicon 小, 2MB 足够)
const OUTPUT_SIZE = 64; // 标准 favicon 尺寸 (浏览器会自动适应 16/32)
const UPLOAD_DIR = path.resolve("public/uploads/favicons");

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // sharp resize → 64x64 webp (透明背景保留, fit inside 保持比例)
  const processed = await sharp(buf)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: "inside",       // 保持原比例, 不足留空
      withoutEnlargement: false  // 小图也放大到 64x64
    })
    .webp({ quality: 90 })  // favicon 质量优先, 文件仍然小
    .toBuffer();

  const id = `favicon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const filename = `${id}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);
  // v0.31: 自动创建上传目录 (避免 ENOENT, 兼容全新部署)
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(filepath, processed);

  // 删旧 favicon (如果不是默认)
  const old = siteConfigRepo.get()?.favicon;
  if (old && old.startsWith("/uploads/favicons/")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* 可能已不存在 */ }
  }

  const url = `/uploads/favicons/${filename}`;
  const config = siteConfigRepo.upsert({ favicon: url });
  return NextResponse.json({ ok: true, url, config });
}

export async function DELETE() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 删旧文件
  const old = siteConfigRepo.get()?.favicon;
  if (old && old.startsWith("/uploads/favicons/")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* */ }
  }

  const config = siteConfigRepo.upsert({ favicon: null });
  return NextResponse.json({ ok: true, config });
}
