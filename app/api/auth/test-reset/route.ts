// ============================================================
// POST /api/auth/test-reset — dev-only test helper
// 清空 in-memory rate limit Map (e2e 跨 test 隔离用)
// ⚠️ 严禁生产使用: 进程级 NODE_ENV === 'production' 时返回 403
// ⚠️ Next.js 注意: 路由目录不能用 `_` 开头 (那是 private folder, 不注册)
// ============================================================
import { NextResponse } from "next/server";
import { __resetRateLimitForTesting } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "forbidden_in_production" }, { status: 403 });
  }
  __resetRateLimitForTesting();
  return NextResponse.json({ ok: true });
}
