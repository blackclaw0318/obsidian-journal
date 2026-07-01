// ============================================================
// lib/view-counter.ts - view_count 防刷逻辑 (v0.21.1 P1-13)
//  - 同 entity 24h 内仅 +1 (cookie 标记)
//  - 可复用: posts / chapters / videos / pages
//  - 纯函数, 易于 unit 测试
// ============================================================

/** 24 小时, 单位秒 */
export const VIEW_TTL_SEC = 24 * 60 * 60;

/**
 * 生成 view 防刷 cookie 名 (entityType + slug)
 * @param entityType 例如 "post" / "chapter" / "video" / "page"
 * @param slug
 */
export function viewCookieKey(entityType: string, slug: string): string {
  return `oj_view_${entityType}_${slug}`;
}

/**
 * 判断是否应该 +1 view_count
 *  - 未见过 → true (第一次访问)
 *  - 见过且在 24h 内 → false (防刷)
 *  - 见过但已过期 (> 24h) → true (刷新计数)
 *  - cookie 值非法 → true (重置)
 */
export function shouldCountView(cookieValue: string | undefined, nowMs: number = Date.now()): boolean {
  if (!cookieValue) return true;
  const ts = Number(cookieValue);
  if (!Number.isFinite(ts)) return true;
  return nowMs - ts > VIEW_TTL_SEC * 1000;
}
