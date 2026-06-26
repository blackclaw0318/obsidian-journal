// ============================================================
// /admin/reindex — Phase 2.2 FTS5 重建
// POST: 重建 posts_fts 索引 (content='rebuild')
// 严守: 降级容错 (FTS5 失败返回 200 + error 字段, 不抛 500)
// ============================================================

import { NextResponse } from "next/server";
import { postRepo } from "@/lib/repo";

export async function POST() {
  const result = postRepo.reindexFts();
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      message: `FTS 索引重建成功, 共 ${result.count} 条`,
      count: result.count,
      ts: new Date().toISOString()
    });
  }
  return NextResponse.json(
    {
      ok: false,
      error: result.error ?? "unknown",
      ts: new Date().toISOString()
    },
    { status: 200 } // 200 + ok:false 让前端能展示, 不弹错误
  );
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /admin/reindex — 重建 FTS5 索引",
    status: postRepo.reindexFts().ok ? "available" : "broken"
  });
}
