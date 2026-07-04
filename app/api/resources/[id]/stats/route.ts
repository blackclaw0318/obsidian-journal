// ============================================================
// GET /api/resources/[id]/stats — 公开统计 (老板 22:20 透明化)
// 返回: 24h 不同访客数 + 24h 总浏览次数 + 总累计
// ============================================================
import { NextResponse } from "next/server";
import { mediaCounterRepo, mediaAccessLogRepo, mediaRepo } from "@/lib/repo";
import { displayView, displayDownload } from "@/lib/counter";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = mediaRepo.byId(params.id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const counter = mediaCounterRepo.byId(params.id);
  if (!counter) {
    return NextResponse.json({ ok: false, error: "counter_missing" }, { status: 500 });
  }

  const visitors24h = mediaAccessLogRepo.countRecentVisitors(params.id, 86400);
  const views24h = mediaAccessLogRepo.countRecentViews(params.id, 86400);

  return NextResponse.json({
    ok: true,
    counter: {
      display_view: displayView(counter),
      display_download: displayDownload(counter),
      real_view_count: counter.view_count,
      real_download_count: counter.download_count,
    },
    recent_24h: {
      visitors: visitors24h,
      views: views24h,
    },
  });
}