// ============================================================
// lib/media-categories.ts - 资源 MIME 分类工具 (v0.34 砍计数后独立)
// 老板 2026-07-05 00:59 决策: 删所有计数功能
// 原 lib/counter.ts 拆分: 计数相关砍, 分类保留 (image / document / audio 三类)
// ============================================================

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
