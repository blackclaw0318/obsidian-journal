// ============================================================
// POST /api/resources/[id]/view — 浏览 +1 (24h 同 ip 去重)
// 老板 Q3: 真实累计, 无上限. 但同 IP 24h 内只 +1, 防刷.
// ============================================================
import { NextResponse } from "next/server";
import { mediaRepo, mediaCounterRepo, mediaAccessLogRepo } from "@/lib/repo";
import { displayView, VIEW_DEDUPE_WINDOW_SEC } from "@/lib/counter";
import { getClientIp, hashIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const item = mediaRepo.byId(params.id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  // 24h 去重 (同 ip + view)
  if (mediaAccessLogRepo.hasRecent(params.id, "view", ipHash, VIEW_DEDUPE_WINDOW_SEC)) {
    const counter = mediaCounterRepo.byId(params.id);
    return NextResponse.json({
      ok: true,
      deduplicated: true,
      display: counter ? displayView(counter) : 0
    });
  }

  // 计数 + 写日志
  const counter = mediaCounterRepo.incView(params.id);
  if (!counter) {
    return NextResponse.json({ ok: false, error: "counter_missing" }, { status: 500 });
  }
  mediaAccessLogRepo.insert({
    media_id: params.id,
    access_type: "view",
    ip_hash: ipHash,
    user_agent_hash: null,
    country: null
  });

  return NextResponse.json({
    ok: true,
    display: displayView(counter)
  });
}