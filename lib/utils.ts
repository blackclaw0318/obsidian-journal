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
 * 使用简单 SHA-256 + 截断 + salt (v0.34: 暂用静态 salt, 后续可放 env)
 */
export function hashIp(ip: string, salt = "obsidian-v0.34"): string {
  // 简化: 浏览器 crypto.subtle 在 server 端不可用 (Next.js server 跑在 Node)
  // 用 Node:crypto 的 createHash 同步版本 (lightweight)
  const nodeCrypto = require("node:crypto") as typeof import("node:crypto");
  return nodeCrypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}
