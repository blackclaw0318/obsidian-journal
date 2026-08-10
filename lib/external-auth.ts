// ============================================================
// External Publisher 共享鉴权 (v0.38 P2 抽取)
//  - HMAC 验签 (timestamp + body)
//  - 内存 rate limit (per IP, 10 req/min)
//  - publisher 白名单 + secret + author 映射
//  复用: app/api/external/posts/route.ts + app/api/external/chapters/route.ts
// ============================================================
import { createHmac, timingSafeEqual } from "node:crypto";
import { getAdminUserId, getBotUserId } from "@/lib/auth";

// ============ 鉴权配置 ============
export const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // ±5 分钟
export const RATE_LIMIT_MAX = 10;                 // 10 req
export const RATE_LIMIT_WINDOW_MS = 60_000;       // per min

/**
 * Publisher 白名单
 * - secret: 共享密钥 (HMAC-SHA256 over `${ts}.${body}`)
 * - resolveAuthorId(): 推送后内容显示的作者 user_id (懒求值, 避免模块加载时崩)
 *    - novel-publisher: admin 用户 (上坤) — 老板个人作品
 *    - yk-script:       yk-bot 系统用户 — 单元剧脚本固定署名
 */
export interface PublisherConfig {
  secret: string;
  resolveAuthorId: () => string;
  /** 允许推送的 category (posts 路由用; chapters 路由不校验 category) */
  allowedCategories: string[];
}

export const ALLOWED_PUBLISHERS: Record<string, PublisherConfig> = {
  "novel-publisher": {
    secret: process.env.OBSIDIAN_NOVEL_PUBLISH_SECRET ?? "",
    resolveAuthorId: () => getAdminUserId(),
    allowedCategories: ["novel", "tech"],
  },
  "yk-script": {
    secret: process.env.OBSIDIAN_YK_PUBLISH_SECRET ?? "",
    resolveAuthorId: () => getBotUserId("yk-bot"),
    allowedCategories: ["life"],
  },
};

// ============ 内存 rate limit (per IP) ============
// 注: 多实例部署需换 Redis. 单进程 dev/prod 4c16g 够用
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(ip: string, now = Date.now()): boolean {
  const arr = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, arr); // 保留以便再查
    return false;
  }
  arr.push(now);
  rateLimitMap.set(ip, arr);
  return true;
}

// ============ HMAC 验签 ============
export function verifyHmac(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
  now = Date.now()
): { ok: boolean; reason?: string } {
  if (!signature || !timestamp) return { ok: false, reason: "missing_headers" };
  if (!secret) return { ok: false, reason: "server_misconfigured" };

  // 1. 时间戳窗口
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  if (Math.abs(now - ts) > TIMESTAMP_WINDOW_MS) {
    return { ok: false, reason: "timestamp_expired" };
  }

  // 2. 签名
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  if (signature.length !== expected.length) return { ok: false, reason: "bad_signature" };
  try {
    const ok = timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
    return ok ? { ok: true } : { ok: false, reason: "bad_signature" };
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
}

// ============ 测试 helper ============
export function __resetRateLimitForTesting(): void {
  rateLimitMap.clear();
}