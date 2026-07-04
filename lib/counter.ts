// ============================================================
// lib/counter.ts — v0.34 Phase 4 资源计数工具
// 老板 17:26 Q3 决策: 计数不设上限 + 显示真实数 + 初始随机百位数 (100-999)
// v0.35 升级: 种子可关 (seed_enabled) + view/download 种子独立 (老板装门面需求)
// ============================================================

import type { MediaCounter } from "./types";

/**
 * 生成 base_value (100-999 随机整数, 含端点)
 * 上传资源时调用一次, 写入 media_counters.base_value
 * 之后不再变化, 真实浏览/下载数累加到 view_count / download_count
 *
 * v0.35: admin 可通过 PATCH /api/admin/resources/[id]/seed 改 1-9999 (无 CHECK 限制)
 */
export function genBaseValue(): number {
  return 100 + Math.floor(Math.random() * 900); // [100, 999]
}

/**
 * 生成 seed_download_count (默认 50, 老板可调)
 * v0.35 新加, 老数据迁移时填 = base_value / 2
 */
export function genSeedDownload(baseValue: number = 100): number {
  return Math.max(50, Math.floor(baseValue / 2));
}

/**
 * 显示用浏览数 = seed_enabled ? (base_value + view_count) : view_count
 * v0.35: 尊重 seed_enabled 开关 (admin 可关掉只显示真实数)
 */
export function displayView(c: Pick<MediaCounter, "base_value" | "view_count"> & { seed_enabled?: number }): number {
  if (c.seed_enabled === 0) return c.view_count;
  return c.base_value + c.view_count;
}

/**
 * 显示用下载数 = seed_enabled ? (seed_download_count + download_count) : download_count
 * v0.35: view/download 种子独立, 优先用 seed_download_count, 兜底 base_value
 */
export function displayDownload(
  c: Pick<MediaCounter, "base_value" | "download_count"> & { seed_enabled?: number; seed_download_count?: number }
): number {
  if (c.seed_enabled === 0) return c.download_count;
  const seed = c.seed_download_count ?? c.base_value;
  return seed + c.download_count;
}

/**
 * view 真实数 (不含种子)
 */
export function realView(c: Pick<MediaCounter, "view_count">): number {
  return c.view_count;
}

/**
 * download 真实数 (不含种子)
 */
export function realDownload(c: Pick<MediaCounter, "download_count">): number {
  return c.download_count;
}

/**
 * view 种子值 (不含真实数) — UI tooltip "(基础 N + 真实 M)" 用
 */
export function viewSeed(c: Pick<MediaCounter, "base_value" | "seed_enabled">): number {
  if (c.seed_enabled === 0) return 0;
  return c.base_value;
}

/**
 * download 种子值
 */
export function downloadSeed(c: Pick<MediaCounter, "base_value" | "seed_enabled"> & { seed_download_count?: number }): number {
  if (c.seed_enabled === 0) return 0;
  return c.seed_download_count ?? c.base_value;
}

/**
 * 24h 去重窗口 (秒) — 同 ip_hash 在此时间内只 +1
 */
// 24h 同 ip 去重 — 同 IP 在此时间内只 +1 (老板 22:20 反馈: 太严看不到累计, 改 30 分钟)
// 个人博客场景, 30 分钟足够防刷 + 老板能看到表现。
export const VIEW_DEDUPE_WINDOW_SEC = 30 * 60;  // 30 分钟 (不是 24h)

/**
 * 检测 mime 是否属于合法资源分类 (v0.34 砍 video)
 * 老板 15:14 决策: image / document / audio 三类, 永久禁 video/*
 */
export const ALLOWED_MIME_PREFIXES = ["image/", "audio/", "application/pdf"] as const;

export function isAllowedResourceMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

/**
 * 从 mime 推断 category (image | document | audio)
 */
export function categoryFromMime(mime: string): "image" | "document" | "audio" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  // application/pdf, application/msword, application/vnd.*, text/* → document
  return "document";
}