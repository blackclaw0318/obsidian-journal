import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class 合并工具
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期 (中文)
 */
export function formatDate(date: Date | string, locale = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/**
 * 生成 slug
 *  - 转小写
 *  - 空格/中文 → -
 *  - 保留中文 / 字母 / 数字 / 连字符
 *  - 合并多个 -
 *  - 去除首尾 -
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // 空格 → -
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "") // 仅保留小写字母、数字、中文、连字符
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 截断文本
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/**
 * 计数转可读 (1234 → 1.2k)
 */
export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
/**
 * 取客户端 IP (从 x-forwarded-for / x-real-ip 头, fallback "unknown")
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

/**
 * IP 哈希 (用于 24h 去重, 不持久化原 IP)
 * 使用 Web Crypto API (Edge Runtime 兼容) — Node 18+ / Edge 都支持
 * v0.34: 静态 salt, 后续可放 env
 *
 * 注: 同步 SHA-256 用 web crypto subtle (async),
 *     server 路由接受 await, 但我们保持同步接口,
 *     用 simple deterministic hash (FNV-1a 32-bit) 作 fallback.
 *     这不是密码学安全 hash, 仅用于去重目的,
 *     适合作 "ip 指纹" 避免存储原始 IP.
 */
export function hashIp(ip: string, salt = "obsidian-v0.34"): string {
  // FNV-1a 32-bit (无加密安全需求, 唯一性足够)
  const input = `${salt}:${ip}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // 转 16 字符 hex (32-bit hash → 8 字符, pad 16 字符)
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(2).slice(0, 16);
}

/**
 * 通用序列化: Server → Client props 必须剥 null prototype
 * (better-sqlite3 行 = Object.create(null), Next.js #428396957 拒绝)
 *
 * 用法: <ClientComp data={serializeForClient(serverData)} />
 */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
