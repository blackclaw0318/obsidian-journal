// ============================================================
// /api/admin/settings/avatar - 头像上传 (v0.18, 2026-06-30)
// POST: multipart/form-data 上传 image, sharp resize → public/uploads/avatars/{id}.webp
//       写回 SiteConfig.avatar_url
// DELETE: 清空 avatar_url (回到默认)
// ============================================================

import { NextResponse } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { siteConfigRepo } from "@/lib/repo";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 512; // resize to 512x512 (足够 retina)
const UPLOAD_DIR = path.resolve("public/uploads/avatars");

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
  // sharp 处理 + 输出 webp (更小, 现代浏览器全支持)
  const processed = await sharp(buf)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "center" })
    .webp({ quality: 88 })
    .toBuffer();

  const id = `avatar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const filename = `${id}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await writeFile(filepath, processed);

  // 删旧头像 (如果不是默认 / uploads 外)
  const old = siteConfigRepo.get()?.avatar_url;
  if (old && old.startsWith("/uploads/avatars/") && !old.includes("avatar-default")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* 可能已不存在 */ }
  }

  const url = `/uploads/avatars/${filename}`;
  const config = siteConfigRepo.upsert({ avatar_url: url });
  return NextResponse.json({ ok: true, url, config });
}

export async function DELETE() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 删旧文件
  const old = siteConfigRepo.get()?.avatar_url;
  if (old && old.startsWith("/uploads/avatars/") && !old.includes("avatar-default")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* */ }
  }

  const config = siteConfigRepo.upsert({ avatar_url: null });
  return NextResponse.json({ ok: true, config });
}