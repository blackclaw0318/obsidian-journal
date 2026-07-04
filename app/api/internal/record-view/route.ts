// ============================================================
// POST /api/internal/record-view — 内部 API (供 middleware 调用)
// 老板 2026-07-05 01:18 v0.35.2 板块访问监控
//  - 仅接 x-internal-record 头 (防外部误调)
//  - 24h 同 ip_hash+path 去重 (Q1)
//  - +UA 存 (Q3)
//  - 含 admin 路径 (Q2)
//  - 数据保留 365 天 (Q4, 通过 purgeOldViews 清理)
// ============================================================
import { NextResponse } from "next/server";
import { recordView } from "@/lib/analytics";
import { hashIp, getClientIp } from "@/lib/utils";

// 强制 Node Runtime (better-sqlite3 不跑 Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // 防外部调用
  if (request.headers.get("x-internal-record") !== "1") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { path?: string };
    const path = body?.path;
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: false, error: "missing_path" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipHash = hashIp(ip);
    const ua = request.headers.get("user-agent");

    const result = recordView({ path, ipHash, userAgent: ua });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
