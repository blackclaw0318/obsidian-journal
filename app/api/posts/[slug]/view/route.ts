// ============================================================
// POST /api/posts/[slug]/view - 文章阅读计数 (v0.21.1 P1-13 防刷)
//  - 同 slug 24h 内仅 +1 (cookie 标记)
//  - 客户端 ViewCounter 组件 'use client' 触发 fetch POST
//  - 防刷逻辑: lib/view-counter.ts (shouldCountView)
// ============================================================
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { postRepo } from "@/lib/repo";
import { shouldCountView, viewCookieKey, VIEW_TTL_SEC } from "@/lib/view-counter";

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
): Promise<Response> {
  const slug = params.slug;
  const cookieStore = cookies();
  const cKey = viewCookieKey("post", slug);

  // 仅 published 文章可计数 (与公开页可见性对齐)
  const post = postRepo.bySlug(slug);
  if (!post || post.status !== "published") {
    return NextResponse.json({ counted: false, error: "not_found" }, { status: 404 });
  }

  // 防刷: 同 cookie 24h 内不重复 +1
  const seen = cookieStore.get(cKey)?.value;
  if (!shouldCountView(seen)) {
    return NextResponse.json({
      counted: false,
      view_count: post.view_count,
      reason: "seen_in_24h"
    });
  }

  // +1 + 写 cookie
  postRepo.incrementView(post.id);
  cookieStore.set(cKey, String(Date.now()), {
    maxAge: VIEW_TTL_SEC,
    path: "/",
    sameSite: "lax",
    httpOnly: false
  });

  const updated = postRepo.bySlug(slug);
  return NextResponse.json({
    counted: true,
    view_count: updated?.view_count ?? post.view_count + 1
  });
}
