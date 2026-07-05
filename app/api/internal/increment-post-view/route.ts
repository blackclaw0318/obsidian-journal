// ============================================================
// POST /api/internal/increment-post-view — 内部 API (供 middleware 调用)
// 老板 2026-07-05 08:12 v0.35.3 修复"浏览量不累加"
//  - 仅接 x-internal-record 头 (防外部误调)
//  - 不查 cookie (中间件已经做了 24h dedup)
//  - 仅 status='published' 文章 +1
//  - 静默: dedup / 不存在 / 草稿 都返回 200 ok
//  - Node runtime (better-sqlite3 不跑 Edge)
// ============================================================
import { NextResponse } from "next/server";
import { postRepo } from "@/lib/repo";

// 强制 Node Runtime (better-sqlite3 不跑 Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // 防外部调用
  if (request.headers.get("x-internal-record") !== "1") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { slug?: unknown };
    const slug = typeof body.slug === "string" ? body.slug : "";
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const post = postRepo.bySlug(slug);
    if (!post) {
      // 不存在 / 草稿 / 已删除 → 静默 200 (中间件 fire-and-forget 不需要重试)
      return NextResponse.json({ ok: true, counted: false, reason: "not_found" });
    }
    if (post.status !== "published") {
      return NextResponse.json({ ok: true, counted: false, reason: "not_published" });
    }

    postRepo.incrementView(post.id);
    return NextResponse.json({ ok: true, counted: true, view_count: post.view_count + 1 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
