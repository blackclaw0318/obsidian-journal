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