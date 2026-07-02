// ============================================================
// GET /api/public/posts - 公开端拉取 published posts (v0.26)
// ============================================================
// 供 PostsBlock 复合组件 (v0.6.1 §21.2) 在公开页面 + 后台预览调用
// 参数: ?category=tech|life&limit=6&sortBy=new|hot
// 返回: { ok: true, items: [...] }
//
// 不需要 auth (公开数据)
// 不暴露 draft / archived 文章
// ============================================================

import { NextResponse } from "next/server";
import { postRepo } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as "tech" | "life" | null;
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "6", 10);
  const limit = Math.max(1, Math.min(50, isNaN(limitRaw) ? 6 : limitRaw));
  const sortBy = (url.searchParams.get("sortBy") ?? "new") as "new" | "hot";

  try {
    let items;
    if (sortBy === "hot") {
      // 按 view_count 排序
      const result = category
        ? postRepo.listByCategory({ category, status: "published", limit: 50 })
        : postRepo.list({ status: "published", limit: 50 });
      items = [...result].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, limit);
    } else {
      // new — listAll 已经按 published_at DESC 排好
      const result = category
        ? postRepo.listByCategory({ category, status: "published", limit })
        : postRepo.list({ status: "published", limit });
      items = result;
    }

    // 公开端最小字段 (避免暴露 author_email 等)
    const safe = items.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      cover_image: p.cover_image,
      published_at: p.published_at,
      view_count: p.view_count ?? 0
    }));

    return NextResponse.json({ ok: true, items: safe, total: safe.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}