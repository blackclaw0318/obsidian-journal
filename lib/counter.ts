// ============================================================
// lib/counter.ts — v0.34 Phase 4 资源计数工具
// 老板 17:26 Q3 决策: 计数不设上限 + 显示真实数 + 初始随机百位数 (100-999)
// ============================================================

import type { MediaCounter } from "./types";

/**
 * 生成 base_value (100-999 随机整数, 含端点)
 * 上传资源时调用一次, 写入 media_counters.base_value
 * 之后不再变化, 真实浏览/下载数累加到 view_count / download_count
 */
export function genBaseValue(): number {
  return 100 + Math.floor(Math.random() * 900); // [100, 999]
}

/**
 * 显示用浏览数 = base_value + view_count
 * 不做区间, 不做模糊, 直接返回整数
 */
export function displayView(c: Pick<MediaCounter, "base_value" | "view_count">): number {
  return c.base_value + c.view_count;
}

/**
 * 显示用下载数 = base_value + download_count
 */
export function displayDownload(c: Pick<MediaCounter, "base_value" | "download_count">): number {
  return c.base_value + c.download_count;
}

/**
 * 24h 去重窗口 (秒) — 同 ip_hash 在此时间内只 +1
 */
export const VIEW_DEDUPE_WINDOW_SEC = 24 * 60 * 60;

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