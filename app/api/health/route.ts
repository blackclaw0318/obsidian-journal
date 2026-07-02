// ============================================================
// GET /api/health — 服务健康检查 (P1-10 v0.24)
// ============================================================
// 检查项 (5 项):
//   1. db        — SQLite 连接 (PRAGMA + SELECT 1)
//   2. config    — site_config 表有 singleton 行
//   3. avatar    — SiteConfig.avatar_url HEAD 请求可达 (有则查)
//   4. favicon   — SiteConfig.favicon HEAD 请求可达 (有则查)
//   5. og_image  — SiteConfig.og_image HEAD 请求可达 (有则查)
//
// 返回 JSON:
//   {
//     status: "ok" | "degraded" | "down",
//     timestamp: <unix ms>,
//     uptime_s: <seconds since process start>,
//     checks: {
//       db:        { status: "ok"|"down", latency_ms, error? },
//       config:    { status: "ok"|"down", latency_ms, error?, site_name? },
//       avatar:    { status: "ok"|"down"|"skip", latency_ms?, error?, url? },
//       favicon:   { status: "ok"|"down"|"skip", latency_ms?, error?, url? },
//       og_image:  { status: "ok"|"down"|"skip", latency_ms?, error?, url? }
//     }
//   }
//
// HTTP 状态码:
//   200 — status === "ok"
//   503 — status === "degraded" | "down" (用于 LB/监控触发告警)
//
// 注意:
//   - 不需要 auth (供监控/部署脚本/老板 curl 用)
//   - 任何 URL 检查都加 5s 超时, 防止慢挂的 CDN 拖死 endpoint
//   - DB error 不 throw, 捕获后返回 status: "down" 让监控看到
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteConfigRepo } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 不缓存, 每次都是实时

const URL_FETCH_TIMEOUT_MS = 5000;

const PROCESS_START = Date.now();

type CheckResult =
  | { status: "ok"; latency_ms: number; [extra: string]: unknown }
  | { status: "down"; latency_ms: number; error: string; [extra: string]: unknown }
  | { status: "skip"; reason: string };

async function checkDb(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    // 双保险: PRAGMA + SELECT 1
    db.exec("PRAGMA quick_check");
    const row = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    if (!row || row.ok !== 1) throw new Error("SELECT 1 returned unexpected result");
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch (e) {
    return { status: "down", latency_ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

function checkConfig(): CheckResult {
  const t0 = Date.now();
  try {
    const cfg = siteConfigRepo.get();
    if (!cfg) {
      return { status: "down", latency_ms: Date.now() - t0, error: "site_config singleton not found" };
    }
    return {
      status: "ok",
      latency_ms: Date.now() - t0,
      site_name: cfg.site_name,
      default_theme: cfg.default_theme
    };
  } catch (e) {
    return { status: "down", latency_ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkUrl(url: string): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    // 相对路径 → 拼绝对 URL (localhost 部署自检用)
    let target = url;
    if (url.startsWith("/")) {
      const base = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      target = `${base.replace(/\/$/, "")}${url}`;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), URL_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(target, {
        method: "HEAD",
        signal: ctrl.signal,
        redirect: "follow"
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { status: "down", latency_ms: Date.now() - t0, error: `HTTP ${res.status}`, url: target };
      }
      return { status: "ok", latency_ms: Date.now() - t0, url: target };
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      return { status: "down", latency_ms: Date.now() - t0, error: msg, url: target };
    }
  } catch (e) {
    return { status: "down", latency_ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e), url };
  }
}

export async function GET() {
  // 5 项检查并行 (URL 检查慢, 并行省时间)
  const cfg = (() => {
    try {
      return siteConfigRepo.get();
    } catch {
      return null;
    }
  })();

  const [dbCheck, configCheck, avatarCheck, faviconCheck, ogImageCheck] = await Promise.all([
    Promise.resolve(checkDb()),
    Promise.resolve(checkConfig()),
    cfg?.avatar_url ? checkUrl(cfg.avatar_url) : Promise.resolve({ status: "skip", reason: "no avatar configured" } as CheckResult),
    cfg?.favicon ? checkUrl(cfg.favicon) : Promise.resolve({ status: "skip", reason: "no favicon configured" } as CheckResult),
    cfg?.og_image ? checkUrl(cfg.og_image) : Promise.resolve({ status: "skip", reason: "no og_image configured" } as CheckResult)
  ]);

  const checks = {
    db: dbCheck,
    config: configCheck,
    avatar: avatarCheck,
    favicon: faviconCheck,
    og_image: ogImageCheck
  };

  // 计算总状态
  // ok:        所有检查都 ok 或 skip
  // degraded:  有 url 检查失败 (avatar/favicon/og_image) 但核心 (db+config) 健康
  // down:      db 或 config 失败
  const hasDbOrConfigDown = dbCheck.status === "down" || configCheck.status === "down";
  const hasAnyUrlDown = avatarCheck.status === "down" || faviconCheck.status === "down" || ogImageCheck.status === "down";

  let status: "ok" | "degraded" | "down";
  if (hasDbOrConfigDown) status = "down";
  else if (hasAnyUrlDown) status = "degraded";
  else status = "ok";

  const body = {
    status,
    timestamp: Date.now(),
    uptime_s: Math.floor((Date.now() - PROCESS_START) / 1000),
    checks
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}