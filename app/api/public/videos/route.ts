// ============================================================
// GET /api/public/videos - 公开端拉取 published videos (v0.26)
// ============================================================
// 供 VideosBlock 复合组件 (v0.6.1 §21.2) 在公开页面 + 后台预览调用
// 参数: ?limit=6
// 返回: { ok: true, items: [...] }
// ============================================================

import { NextResponse } from "next/server";
import { videoRepo } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "6", 10);
  const limit = Math.max(1, Math.min(50, isNaN(limitRaw) ? 6 : limitRaw));

  try {
    const all = videoRepo.list().filter((v) => v.status === "published");
    const items = all.slice(0, limit);

    // 公开端最小字段
    const safe = items.map((v) => ({
      slug: v.slug,
      title: v.title,
      description: v.description,
      cover_image: v.cover_image,
      embed_url: v.embed_url,
      duration: v.duration,
      published_at: v.published_at
    }));

    return NextResponse.json({ ok: true, items: safe, total: safe.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}