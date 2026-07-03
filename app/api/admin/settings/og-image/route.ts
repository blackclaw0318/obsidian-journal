// ============================================================
// /api/admin/settings/og-image - og:image 上传 (v0.31, P2-21 兑现)
// POST: multipart/form-data 上传 image, sharp resize → 1200x630 webp
//       写到 public/uploads/og-images/{id}.webp, 写回 SiteConfig.og_image
// DELETE: 清空 og_image (公开页 fallback 到 avatar 或默认)
// 规格: 1200x630 是 Facebook/Twitter 推荐的 OG 卡片比例 (1.91:1)
// ============================================================

import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { siteConfigRepo } from "@/lib/repo";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (OG 卡片图大一点没问题)
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const UPLOAD_DIR = path.resolve("public/uploads/og-images");

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
  // sharp resize → 1200x630 webp (cover 模式, 居中裁切, 透明背景转白)
  const processed = await sharp(buf)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "center" })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // 透明 PNG 转白底 (社交平台对透明图不友好)
    .webp({ quality: 88 })
    .toBuffer();

  const id = `og-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const filename = `${id}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);
  // v0.31: 自动创建上传目录
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(filepath, processed);

  // 删旧 og_image
  const old = siteConfigRepo.get()?.og_image;
  if (old && old.startsWith("/uploads/og-images/")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* 可能已不存在 */ }
  }

  const url = `/uploads/og-images/${filename}`;
  const config = siteConfigRepo.upsert({ og_image: url });
  return NextResponse.json({ ok: true, url, config });
}

export async function DELETE() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 删旧文件
  const old = siteConfigRepo.get()?.og_image;
  if (old && old.startsWith("/uploads/og-images/")) {
    const oldPath = path.join("public", old);
    try { await unlink(oldPath); } catch { /* */ }
  }

  const config = siteConfigRepo.upsert({ og_image: null });
  return NextResponse.json({ ok: true, config });
}
