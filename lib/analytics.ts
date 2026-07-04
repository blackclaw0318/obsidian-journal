// ============================================================
// lib/analytics.ts - 板块访问监控 (v0.35.2, 老板 2026-07-05 01:18 拍板)
// Q1 = 24h 同 ip_hash+path 去重
// Q2 = 含 /admin (老板看自己访问)
// Q3 = +UA (浏览器/设备分布)
// Q4 = 365 天保留 (老板决策)
// ============================================================
import { db } from "./db";

/** 板块归类: /posts/x → "posts"; /admin/posts → "admin/posts"; / → "home" */
export function pathToSection(pathname: string): string {
  // 去掉 query / fragment
  const path = pathname.split("?")[0].split("#")[0];
  // 首页特殊
  if (path === "/" || path === "") return "home";
  // /admin/* → admin/第二段 (如 /admin/posts/123 → admin/posts)
  if (path.startsWith("/admin")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) return `admin/${parts[1]}`;
    return "admin";
  }
  // 其它: 第一段 (如 /posts/2026-07-04 → posts; /uploads/x → uploads 但会被 middleware 排除)
  const seg = path.split("/").filter(Boolean)[0] ?? "other";
  return seg;
}

/** 当前日期 (UTC+8, YYYY-MM-DD) — 用于 daily aggregation 键 */
export function todayDate(tzOffsetMin = 8 * 60): string {
  const now = new Date();
  const local = new Date(now.getTime() + tzOffsetMin * 60_000);
  return local.toISOString().slice(0, 10);
}

/** 给个唯一 id (analytics 自己用, 不污染 lib/repo.ts 的 uid) */
function pvUid(): string {
  return `pv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** dedup window (秒) — Q1 = 24h */
export const PV_DEDUPE_WINDOW_SEC = 24 * 60 * 60;

/** 365 天保留秒数 (Q4 老板决策) */
export const PV_RETENTION_SEC = 365 * 24 * 60 * 60;

export interface PageView {
  id: string;
  path: string;
  section: string;
  ip_hash: string;
  user_agent: string | null;
  visited_at: number;
}

export interface PageViewDaily {
  section: string;
  date: string;
  pv: number;
  uv: number;
}

/** 检查 24h 内同 ip_hash+path 是否已有记录 (用于 dedup) */
export function hasRecentView(
  path: string,
  ipHash: string,
  windowSec: number = PV_DEDUPE_WINDOW_SEC,
  now: number = Math.floor(Date.now() / 1000)
): boolean {
  const since = now - windowSec;
  const row = db.prepare(`
    SELECT 1 AS x FROM page_views
    WHERE path = ? AND ip_hash = ? AND visited_at >= ?
    LIMIT 1
  `).get(path, ipHash, since);
  return !!row;
}

/**
 * 记录一次访问 (含 dedup + 日聚合缓存更新)
 * 返回 true = 新记录, false = dedup 跳过
 */
export function recordView(args: {
  path: string;
  ipHash: string;
  userAgent?: string | null;
  now?: number; // 便于测试
}): { inserted: boolean } {
  const now = args.now ?? Math.floor(Date.now() / 1000);
  const section = pathToSection(args.path);

  // 1. dedup: 24h 内同 ip_hash + path 跳过 (用 args.now 与 hasRecentView 同步)
  if (hasRecentView(args.path, args.ipHash, PV_DEDUPE_WINDOW_SEC, now)) {
    // 即使跳过也要更新每日 pv (1 个 ip 1 天访问 100 次只在原始表 1 条,
    // 但 daily.pv 反映真实曝光数 — 这里选择: dedup 时 daily 也不增, 只 +uv 第一次)
    // 简化决策: dedup 命中 → 当日 PV 不增, UV 也不增 (一访问一记)
    return { inserted: false };
  }

  // 2. INSERT 原始表
  db.prepare(`
    INSERT INTO page_views (id, path, section, ip_hash, user_agent, visited_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    pvUid(),
    args.path,
    section,
    args.ipHash,
    args.userAgent ?? null,
    now
  );

  // 3. UPSERT 日聚合 (PV +1, UV +1)
  const date = todayDate();
  db.prepare(`
    INSERT INTO page_views_daily (section, date, pv, uv)
    VALUES (?, ?, 1, 1)
    ON CONFLICT(section, date) DO UPDATE SET
      pv = pv + 1,
      uv = uv + 1
  `).run(section, date);

  return { inserted: true };
}

/** 清理 N 天前数据 (Q4 = 365 天保留) */
export function purgeOldViews(retentionSec: number = PV_RETENTION_SEC): { deleted: number } {
  const cutoff = Math.floor(Date.now() / 1000) - retentionSec;
  const result = db.prepare(`DELETE FROM page_views WHERE visited_at < ?`).run(cutoff);
  const dateResult = db.prepare(`
    DELETE FROM page_views_daily
    WHERE date < date(?, 'unixepoch', '+8 hours')
  `).run(cutoff);
  return { deleted: Number(result.changes) + Number(dateResult.changes) };
}

// ============================================================
// 聚合查询 (供 /admin/analytics 用)
// ============================================================

/** 板块 (section) × N 天 PV/UV 总览 */
export interface SectionStat {
  section: string;
  pv: number;
  uv: number;
  path_count: number;
}

export function sectionStats(days: number, now: number = Math.floor(Date.now() / 1000)): SectionStat[] {
  const since = now - days * 86400;
  // pv/uv 从 page_views_daily 取 (O(1) per day), path_count 从 page_views 取 (最近天数)
  const rows = db.prepare(`
    SELECT
      d.section,
      COALESCE(SUM(d.pv), 0) AS pv,
      COALESCE(SUM(d.uv), 0) AS uv,
      (SELECT COUNT(DISTINCT p.path)
       FROM page_views p
       WHERE p.section = d.section AND p.visited_at >= ?) AS path_count
    FROM page_views_daily d
    WHERE d.date >= date(?, 'unixepoch', '+8 hours')
    GROUP BY d.section
    ORDER BY pv DESC
  `).all(since, since);
  return rows as SectionStat[];
}

/** 每日 PV/UV 趋势 (供 SVG 画图) */
export interface DailyTrendPoint {
  date: string;
  pv: number;
  uv: number;
}

export function dailyTrend(days: number): DailyTrendPoint[] {
  const today = todayDate();
  const from = new Date(Date.now() - (days - 1) * 86400_000 + 8 * 3600_000)
    .toISOString()
    .slice(0, 10);
  return db.prepare(`
    SELECT date, COALESCE(SUM(pv), 0) AS pv, COALESCE(SUM(uv), 0) AS uv
    FROM page_views_daily
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `).all(from, today) as DailyTrendPoint[];
}

/** Top N 路径 (按 PV) */
export interface PathStat {
  path: string;
  section: string;
  pv: number;
  uv: number;
}

export function topPaths(days: number, limit: number = 20): PathStat[] {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db.prepare(`
    SELECT path, section,
           COUNT(*) AS pv,
           COUNT(DISTINCT ip_hash) AS uv
    FROM page_views
    WHERE visited_at >= ?
    GROUP BY path
    ORDER BY pv DESC
    LIMIT ?
  `).all(since, limit) as PathStat[];
}

/** 最近 N 条原始访问 (实时流) */
export function recentViews(limit: number = 30): (PageView & { ua_browser?: string })[] {
  return db.prepare(`
    SELECT * FROM page_views ORDER BY visited_at DESC LIMIT ?
  `).all(limit) as PageView[];
}

/** 摘要卡: 今日/7d/30d/365d 的 PV/UV 和活跃板块数 */
export interface StatsSummary {
  today: { pv: number; uv: number };
  last7d: { pv: number; uv: number };
  last30d: { pv: number; uv: number };
  last365d: { pv: number; uv: number };
  activeSectionsToday: number;
}

export function statsSummary(): StatsSummary {
  const today = todayDate();
  const d7 = new Date(Date.now() - 6 * 86400_000 + 8 * 3600_000).toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 29 * 86400_000 + 8 * 3600_000).toISOString().slice(0, 10);
  const d365 = new Date(Date.now() - 364 * 86400_000 + 8 * 3600_000).toISOString().slice(0, 10);

  const sum = (from: string) => {
    const row = db.prepare(`
      SELECT COALESCE(SUM(pv), 0) AS pv, COALESCE(SUM(uv), 0) AS uv
      FROM page_views_daily
      WHERE date BETWEEN ? AND ?
    `).get(from, today) as { pv: number; uv: number };
    return { pv: Number(row.pv), uv: Number(row.uv) };
  };

  const todayRow = db.prepare(`
    SELECT COALESCE(SUM(pv), 0) AS pv, COALESCE(SUM(uv), 0) AS uv,
           COUNT(DISTINCT section) AS sections
    FROM page_views_daily WHERE date = ?
  `).get(today) as { pv: number; uv: number; sections: number };

  return {
    today: { pv: Number(todayRow.pv), uv: Number(todayRow.uv) },
    last7d: sum(d7),
    last30d: sum(d30),
    last365d: sum(d365),
    activeSectionsToday: Number(todayRow.sections)
  };
}
