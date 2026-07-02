// ============================================================
// 数据访问层 (Repository Pattern) - 基于 node:sqlite
// 替代 Prisma client, 完全可控
// ============================================================
import { db, initSchema } from "./db";
import type {
  Post,
  PostWithAuthor,
  PostWithSeries,
  Series,
  SeriesWithCount,
  Novel,
  NovelVolume,
  Chapter,
  VideoSeries,
  Video,
  MediaItem,
  MediaUsage,
  RefType,
  SiteConfig,
  Social,
  User,
  Page,
  DailyStat
} from "./types";

// 首次调用时建表
initSchema();

// ============ Helpers ============
function uid(prefix = ""): string {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return prefix ? `${prefix}_${id}` : id;
}

function rowToPost(row: any): Post {
  return row as Post;
}

function rowToPostWithAuthor(row: any): PostWithAuthor {
  return {
    ...rowToPost(row),
    author: { name: row.author_name ?? null, email: row.author_email ?? "" }
  };
}

// ============ Post ============
export const postRepo = {
  list({ status = "published", limit = 20 }: { status?: string; limit?: number } = {}): PostWithAuthor[] {
    const stmt = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.status = ?
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ?
    `);
    const rows = stmt.all(status, limit);
    return rows.map(rowToPostWithAuthor);
  },

  // Phase 2.1: 按 category 筛选 (tech/life)
  listByCategory({ category, status = "published", limit = 50 }: { category: string; status?: string; limit?: number }): PostWithAuthor[] {
    const stmt = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.category = ? AND p.status = ?
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ?
    `);
    const rows = stmt.all(category, status, limit);
    return rows.map(rowToPostWithAuthor);
  },

  countByCategory(category: string, status = "published"): number {
    const stmt = db.prepare(`SELECT COUNT(*) AS c FROM posts WHERE category = ? AND status = ?`);
    const row = stmt.get(category, status) as { c: number };
    return row.c;
  },

  count(status = "published"): number {
    const stmt = db.prepare(`SELECT COUNT(*) AS c FROM posts WHERE status = ?`);
    const row = stmt.get(status) as { c: number };
    return row.c;
  },

  bySlug(slug: string): PostWithAuthor | null {
    const stmt = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.slug = ?
    `);
    const row = stmt.get(slug);
    return row ? rowToPostWithAuthor(row) : null;
  },

  incrementView(id: string): void {
    db.prepare(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`).run(id);
  },

  create(data: Omit<Post, "id" | "created_at" | "updated_at" | "view_count" | "fts">): Post {
    const id = uid("post");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO posts (id, slug, title, excerpt, content, cover_image, status, category, tags, author_id, series_id, published_at, created_at, updated_at, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      data.slug,
      data.title,
      data.excerpt ?? null,
      data.content,
      data.cover_image ?? null,
      data.status,
      data.category,
      data.tags ?? null,
      data.author_id,
      data.series_id ?? null,
      data.published_at ?? null,
      now,
      now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0, fts: null };
  },

  // Phase 2.2 + v0.29 P2-19: FTS5 trigram 双轨搜索 (中文友好)
  //  - trigram 主搜:  3+ 字中文 (黑曜石/石日志), 英文 phrase
  //  - LIKE 兏底:      1-2 字中文 (曜石/咖啡) + FTS5 语法错误保护
  //  - 结果: FTS5 ∪ LIKE dedup
  search({ q, status = "published", limit = 20 }: { q: string; status?: string; limit?: number } = { q: "" }): { items: PostWithAuthor[]; degraded: boolean; tookMs: number } {
    const t0 = Date.now();
    if (!q || !q.trim()) {
      return { items: [], degraded: false, tookMs: 0 };
    }
    const qTrim = q.trim();

    // ============ 轨 1: FTS5 trigram (3+ 字中文 / 英文 phrase) ============
    let ftsRows: PostWithAuthor[] = [];
    let ftsFailed = false;
    try {
      // trigram: q 原样传, 带 * 后缀支持部分匹配 (仅对英文/数字有效, trigram 中文不需要)
      // 去除 FTS5 保留字符以防 syntax error
      const safeQ = qTrim.replace(/['"()]/g, " ");
      const ftsQuery = safeQ.split(/\s+/).filter(Boolean).map(t => `${t}*`).join(" OR ") || safeQ;
      const stmt = db.prepare(`
        SELECT p.*, u.name AS author_name, u.email AS author_email
        FROM posts_fts f
        JOIN posts p ON p.rowid = f.rowid
        JOIN users u ON u.id = p.author_id
        WHERE posts_fts MATCH ? AND p.status = ?
        ORDER BY rank
        LIMIT ?
      `);
      const rows = stmt.all(ftsQuery, status, limit);
      ftsRows = rows.map(rowToPostWithAuthor);
    } catch (e) {
      ftsFailed = true;
      console.warn(`[search] FTS5 trigram failed: ${(e as Error).message}`);
    }

    // ============ 轨 2: LIKE 兏底 (短中文 + FTS5 失败) ============
    // 检测: q 主要为中文且长度 1-2 → trigram 不会命中, 走 LIKE
    const cjkChars = qTrim.match(/[\u4e00-\u9fa5]/g) ?? [];
    const isShortCn = cjkChars.length >= 1 && qTrim.length <= 4;
    if (ftsFailed || isShortCn) {
      const like = `%${qTrim.replace(/[%_]/g, "")}%`;
      const stmt = db.prepare(`
        SELECT p.*, u.name AS author_name, u.email AS author_email
        FROM posts p JOIN users u ON u.id = p.author_id
        WHERE p.status = ? AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ? OR p.tags LIKE ?)
        ORDER BY COALESCE(p.published_at, p.created_at) DESC
        LIMIT ?
      `);
      const likeRows = stmt.all(status, like, like, like, like, limit).map(rowToPostWithAuthor);

      // 合并去重 (按 id), FTS5 优先
      const seen = new Set(ftsRows.map(r => r.id));
      const merged = [...ftsRows];
      for (const r of likeRows) {
        if (!seen.has(r.id)) {
          merged.push(r);
          seen.add(r.id);
        }
      }
      return {
        items: merged.slice(0, limit),
        degraded: ftsFailed, // FTS5 本身没失败 (仅走了 LIKE 补足) → degraded=false
        tookMs: Date.now() - t0
      };
    }

    return { items: ftsRows, degraded: ftsFailed, tookMs: Date.now() - t0 };
  },

  // Phase 2.2: 重建 FTS 索引 (Admin /admin/reindex 用)
  reindexFts(): { ok: boolean; count: number; error?: string } {
    try {
      db.exec("INSERT INTO posts_fts(posts_fts) VALUES('rebuild');");
      const row = db.prepare("SELECT COUNT(*) AS c FROM posts_fts").get() as { c: number };
      return { ok: true, count: row.c };
    } catch (e) {
      return { ok: false, count: 0, error: (e as Error).message };
    }
  },

  // ============ Phase 3.2: Admin CRUD ============

  byId(id: string): PostWithAuthor | null {
    const stmt = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.id = ?
    `);
    const row = stmt.get(id);
    return row ? rowToPostWithAuthor(row) : null;
  },

  // Admin 列表 (支持 status/category/搜索/分页, 状态不限 published)
  listAll({
    status,
    category,
    q,
    limit = 50,
    offset = 0
  }: {
    status?: string;
    category?: string;
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): { items: PostWithAuthor[]; total: number } {
    const where: string[] = [];
    const params: any[] = [];
    if (status) { where.push("p.status = ?"); params.push(status); }
    if (category) { where.push("p.category = ?"); params.push(category); }
    if (q && q.trim()) { where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.slug LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM posts p ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p JOIN users u ON u.id = p.author_id
      ${whereSql}
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { items: rows.map(rowToPostWithAuthor), total: countRow.c };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM posts WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM posts WHERE slug = ?`).get(slug);
    return !!row;
  },

  update(id: string, data: Partial<Omit<Post, "id" | "created_at" | "view_count" | "fts">>): Post | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE posts SET
        slug = ?, title = ?, excerpt = ?, content = ?, cover_image = ?,
        status = ?, category = ?, tags = ?, author_id = ?, series_id = ?,
        published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.slug, merged.title, merged.excerpt ?? null, merged.content,
      merged.cover_image ?? null, merged.status, merged.category,
      merged.tags ?? null, merged.author_id, merged.series_id ?? null,
      merged.published_at ?? null, now, id
    );
    return { ...merged, updated_at: now };
  },

  // 软删除: status -> archived
  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE posts SET status = 'archived', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  // 恢复: status -> draft
  restore(id: string): boolean {
    const result = db.prepare(`UPDATE posts SET status = 'draft', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  }
};

// ============ Series (v0.11 还原 v0.6.1 §6) ============
// tech/life 文章系列 (与 video_series 区分)
// 公开端可读 / Admin 可写

export const seriesRepo = {
  // 公开端: 按 category 列出有文章关联的系列
  listActive(category?: string): SeriesWithCount[] {
    const sql = category
      ? db.prepare(`
          SELECT s.*, COUNT(p.id) AS post_count
          FROM series s
          LEFT JOIN posts p ON p.series_id = s.id AND p.status = 'published'
          WHERE s.category = ?
          GROUP BY s.id
          HAVING post_count > 0
          ORDER BY s."order" ASC, s.created_at DESC
        `).all(category)
      : db.prepare(`
          SELECT s.*, COUNT(p.id) AS post_count
          FROM series s
          LEFT JOIN posts p ON p.series_id = s.id AND p.status = 'published'
          GROUP BY s.id
          HAVING post_count > 0
          ORDER BY s."order" ASC, s.created_at DESC
        `).all();
    return sql as SeriesWithCount[];
  },

  // Admin: 全部系列
  listAll(category?: string): SeriesWithCount[] {
    const sql = category
      ? db.prepare(`
          SELECT s.*, COUNT(p.id) AS post_count
          FROM series s
          LEFT JOIN posts p ON p.series_id = s.id
          WHERE s.category = ?
          GROUP BY s.id
          ORDER BY s."order" ASC, s.created_at DESC
        `).all(category)
      : db.prepare(`
          SELECT s.*, COUNT(p.id) AS post_count
          FROM series s
          LEFT JOIN posts p ON p.series_id = s.id
          GROUP BY s.id
          ORDER BY s."order" ASC, s.created_at DESC
        `).all();
    return sql as SeriesWithCount[];
  },

  byId(id: string): Series | null {
    const row = db.prepare(`SELECT * FROM series WHERE id = ?`).get(id) as Series | undefined;
    return row ?? null;
  },

  bySlug(slug: string): Series | null {
    const row = db.prepare(`SELECT * FROM series WHERE slug = ?`).get(slug) as Series | undefined;
    return row ?? null;
  },

  // 给 post 详情页用: 带 series 信息
  bySlugWithPosts(slug: string): { series: Series; posts: PostWithAuthor[] } | null {
    const s = this.bySlug(slug);
    if (!s) return null;
    const posts = db.prepare(`
      SELECT p.*, u.name AS author_name, u.email AS author_email
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.series_id = ? AND p.status = 'published'
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
    `).all(s.id) as any[];
    return { series: s, posts: posts.map(rowToPostWithAuthor) };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM series WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM series WHERE slug = ?`).get(slug);
    return !!row;
  },

  create(data: Omit<Series, "id" | "created_at" | "updated_at">): Series {
    const id = uid("ser");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO series (id, slug, name, description, cover_image, category, "order", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.slug, data.name, data.description ?? null, data.cover_image ?? null,
      data.category, data.order, now, now
    );
    return { ...data, id, created_at: now, updated_at: now };
  },

  update(id: string, data: Partial<Omit<Series, "id" | "created_at">>): Series | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE series SET
        slug = ?, name = ?, description = ?, cover_image = ?, category = ?, "order" = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.slug, merged.name, merged.description ?? null, merged.cover_image ?? null,
      merged.category, merged.order, now, id
    );
    return { ...merged, updated_at: now };
  },

  hardDelete(id: string): boolean {
    const result = db.prepare(`DELETE FROM series WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  count(category?: string): number {
    const row = category
      ? db.prepare(`SELECT COUNT(*) AS c FROM series WHERE category = ?`).get(category) as { c: number }
      : db.prepare(`SELECT COUNT(*) AS c FROM series`).get() as { c: number };
    return row.c;
  }
};

// ============ DailyStat (v0.11, Phase 4 监控铺路) ============

export const dailyStatsRepo = {
  upsert(date: string, fields: { pv?: number; uv?: number; post_views?: number; new_comments?: number }): DailyStat {
    const existing = this.byDate(date);
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      const merged = {
        pv: existing.pv + (fields.pv ?? 0),
        uv: existing.uv + (fields.uv ?? 0),
        post_views: existing.post_views + (fields.post_views ?? 0),
        new_comments: existing.new_comments + (fields.new_comments ?? 0)
      };
      db.prepare(`
        UPDATE daily_stats SET pv = ?, uv = ?, post_views = ?, new_comments = ? WHERE id = ?
      `).run(merged.pv, merged.uv, merged.post_views, merged.new_comments, existing.id);
      return { ...existing, ...merged };
    }
    const id = uid("ds");
    const row = {
      pv: fields.pv ?? 0,
      uv: fields.uv ?? 0,
      post_views: fields.post_views ?? 0,
      new_comments: fields.new_comments ?? 0
    };
    db.prepare(`
      INSERT INTO daily_stats (id, date, pv, uv, post_views, new_comments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, row.pv, row.uv, row.post_views, row.new_comments, now);
    return { id, date, ...row, created_at: now };
  },

  byDate(date: string): DailyStat | null {
    const row = db.prepare(`SELECT * FROM daily_stats WHERE date = ?`).get(date) as DailyStat | undefined;
    return row ?? null;
  },

  range(fromDate: string, toDate: string): DailyStat[] {
    return db.prepare(`
      SELECT * FROM daily_stats WHERE date BETWEEN ? AND ? ORDER BY date ASC
    `).all(fromDate, toDate) as DailyStat[];
  },

  recent(days = 7): DailyStat[] {
    const today = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - (days - 1) * 86400_000).toISOString().slice(0, 10);
    return this.range(from, today);
  },

  totalPv(): number {
    const row = db.prepare(`SELECT COALESCE(SUM(pv), 0) AS s FROM daily_stats`).get() as { s: number };
    return row.s;
  }
};

// ============ Novel + Volume + Chapter ============
// Phase 3.3: 完整 CRUD 扩展
// 注意: chapter.slug 是全局 UNIQUE (DB schema), volume/chapter "order" 各自 per-parent UNIQUE

export const novelRepo = {
  list(): (Novel & { volumes: (NovelVolume & { chapters: Chapter[] })[] })[] {
    const novels = db.prepare(`SELECT * FROM novels WHERE deleted_at IS NULL ORDER BY updated_at DESC`).all() as Novel[];
    return novels.map((n) => ({
      ...n,
      volumes: volumeRepo.byNovel(n.id).map((v) => ({
        ...v,
        chapters: chapterRepo.byVolume(v.id)
      }))
    }));
  },

  count(): number {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM novels WHERE deleted_at IS NULL`).get() as { c: number };
    return row.c;
  },

  latest(): (Novel & { volumes: (NovelVolume & { chapters: Chapter[] })[] }) | null {
    const row = db.prepare(`SELECT * FROM novels WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`).get() as Novel | undefined;
    if (!row) return null;
    return {
      ...row,
      volumes: volumeRepo.byNovel(row.id).map((v) => ({
        ...v,
        chapters: chapterRepo.byVolume(v.id)
      }))
    };
  },

  // ============ Phase 3.3: Admin CRUD ============

  byId(id: string): Novel | null {
    const row = db.prepare(`SELECT * FROM novels WHERE id = ?`).get(id) as Novel | undefined;
    return row ?? null;
  },

  bySlug(slug: string): Novel | null {
    const row = db.prepare(`SELECT * FROM novels WHERE slug = ?`).get(slug) as Novel | undefined;
    return row ?? null;
  },

  // ============ Phase 3.x: 公开端 ============
  bySlugWithVolumes(slug: string): (Novel & { volumes: (NovelVolume & { chapters: { id: string; slug: string; title: string; order: number; published: boolean; view_count: number }[] })[] }) | null {
    const n = this.bySlug(slug);
    if (!n) return null;
    if (n.deleted_at) return null;
    return {
      ...n,
      volumes: volumeRepo.byNovel(n.id).map((v) => ({
        ...v,
        chapters: chapterRepo.byVolume(v.id).map((c) => ({
          id: c.id, slug: c.slug, title: c.title, order: c.order,
          published: c.published, view_count: c.view_count
        }))
      }))
    };
  },

  // Admin 列表 (支持 status 筛选/搜索/分页, 默认排除 deleted)
  listAll({
    status,
    q,
    includeDeleted = false,
    limit = 50,
    offset = 0
  }: {
    status?: string;
    q?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}): { items: (Novel & { volume_count: number; chapter_count: number })[]; total: number } {
    const where: string[] = [];
    const params: any[] = [];
    if (!includeDeleted) { where.push("n.deleted_at IS NULL"); }
    if (status) {
      // 兼容 legacy UI 传 'archived' — 转为查 deleted_at IS NOT NULL
      if (status === "archived") where.push("n.deleted_at IS NOT NULL");
      else { where.push("n.status = ?"); params.push(status); }
    }
    if (q && q.trim()) { where.push("(n.title LIKE ? OR n.slug LIKE ? OR n.description LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM novels n ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT n.*,
        (SELECT COUNT(*) FROM novel_volumes WHERE novel_id = n.id AND deleted_at IS NULL) AS volume_count,
        (SELECT COUNT(*) FROM chapters c JOIN novel_volumes v ON c.volume_id = v.id WHERE v.novel_id = n.id AND c.deleted_at IS NULL AND v.deleted_at IS NULL) AS chapter_count
      FROM novels n
      ${whereSql}
      ORDER BY n.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return { items: rows.map((r) => ({
      id: r.id, slug: r.slug, title: r.title, description: r.description,
      cover_image: r.cover_image, status: r.status,
      deleted_at: r.deleted_at,
      created_at: r.created_at, updated_at: r.updated_at,
      volume_count: r.volume_count, chapter_count: r.chapter_count
    })), total: countRow.c };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM novels WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM novels WHERE slug = ?`).get(slug);
    return !!row;
  },

  create(data: Omit<Novel, "id" | "created_at" | "updated_at" | "deleted_at">): Novel {
    const id = uid("novel");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO novels (id, slug, title, description, cover_image, status, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`).run(
      id, data.slug, data.title, data.description ?? null, data.cover_image ?? null, data.status, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, deleted_at: null };
  },

  update(id: string, data: Partial<Omit<Novel, "id" | "created_at" | "deleted_at">>): Novel | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE novels SET slug = ?, title = ?, description = ?, cover_image = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.slug, merged.title, merged.description ?? null,
      merged.cover_image ?? null, merged.status, now, id
    );
    return { ...merged, updated_at: now };
  },

  // 软删除: 写 deleted_at (严守 v0.6.1, 不动 status 字段)
  // 注: NovelStatus 仅表业务状态 (ongoing|completed|hiatus), 删除维度走 deleted_at
  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE novels SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  // 恢复: 清 deleted_at, status 保持 (业务状态不恢复 — 软删是审计维度)
  restore(id: string): boolean {
    const result = db.prepare(`UPDATE novels SET deleted_at = NULL, updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  }
};

export const volumeRepo = {
  byNovel(novelId: string): NovelVolume[] {
    return db.prepare(`SELECT * FROM novel_volumes WHERE novel_id = ? AND deleted_at IS NULL ORDER BY "order" ASC`).all(novelId) as NovelVolume[];
  },

  // ============ Phase 3.3: Admin CRUD ============

  byId(id: string): NovelVolume | null {
    const row = db.prepare(`SELECT * FROM novel_volumes WHERE id = ?`).get(id) as NovelVolume | undefined;
    return row ?? null;
  },

  bySlug(slug: string): NovelVolume | null {
    const row = db.prepare(`SELECT * FROM novel_volumes WHERE slug = ?`).get(slug) as NovelVolume | undefined;
    return row ?? null;
  },

  // ============ Phase 3.x: 公开端 ============
  byNovelWithPublishedChapters(novelId: string): (NovelVolume & { chapters: { id: string; slug: string; title: string; order: number; view_count: number }[] })[] {
    return this.byNovel(novelId).map((v) => ({
      ...v,
      chapters: chapterRepo.byVolume(v.id)
        .filter((c) => c.published)
        .map((c) => ({ id: c.id, slug: c.slug, title: c.title, order: c.order, view_count: c.view_count }))
    }));
  },

  // 下一个 order (per-novel max+1, 排除 deleted)
  nextOrder(novelId: string): number {
    const row = db.prepare(`SELECT COALESCE(MAX("order"), 0) AS max_order FROM novel_volumes WHERE novel_id = ? AND deleted_at IS NULL`).get(novelId) as { max_order: number };
    return row.max_order + 1;
  },

  // Admin 列表 (按 novel 查全部, 含 chapter 数, 默认排除 deleted)
  listByNovel(novelId: string, includeDeleted = false): (NovelVolume & { chapter_count: number; live_chapter_count: number })[] {
    const del = includeDeleted ? "" : "AND v.deleted_at IS NULL";
    return db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM chapters WHERE volume_id = v.id) AS chapter_count,
        (SELECT COUNT(*) FROM chapters WHERE volume_id = v.id AND deleted_at IS NULL) AS live_chapter_count
      FROM novel_volumes v WHERE v.novel_id = ? ${del} ORDER BY v."order" ASC
    `).all(novelId) as any[];
  },

  create(data: Omit<NovelVolume, "id" | "created_at" | "deleted_at">): NovelVolume {
    const id = uid("vol");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO novel_volumes (id, novel_id, "order", title, description, deleted_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)`).run(
      id, data.novel_id, data.order, data.title, data.description ?? null, now
    );
    return { ...data, id, created_at: now, deleted_at: null };
  },

  update(id: string, data: Partial<Omit<NovelVolume, "id" | "created_at" | "novel_id" | "deleted_at">>): NovelVolume | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    db.prepare(`
      UPDATE novel_volumes SET "order" = ?, title = ?, description = ? WHERE id = ?
    `).run(merged.order, merged.title, merged.description ?? null, id);
    return merged;
  },

  // 软删除: 写 deleted_at (严守 v0.6.1, 不动 status 字段)
  softDelete(id: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`UPDATE novel_volumes SET deleted_at = ? WHERE id = ?`).run(now, id);
    return result.changes > 0;
  },

  restore(id: string): boolean {
    const result = db.prepare(`UPDATE novel_volumes SET deleted_at = NULL WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  // 软删除: 写 deleted_at + 级联软删所有 chapters (严守 v0.6.1, 不动 published)
  softDeleteWithChapters(id: string): { volumeOk: boolean; chapterCount: number } {
    const now = Math.floor(Date.now() / 1000);
    const chaptersArchived = db.prepare(`UPDATE chapters SET deleted_at = ?, updated_at = ? WHERE volume_id = ? AND deleted_at IS NULL`).run(now, now, id);
    const volumeResult = db.prepare(`UPDATE novel_volumes SET deleted_at = ? WHERE id = ?`).run(now, id);
    return { volumeOk: volumeResult.changes > 0, chapterCount: Number(chaptersArchived.changes) };
  },

  restoreWithChapters(id: string): { volumeOk: boolean; chapterCount: number } {
    const now = Math.floor(Date.now() / 1000);
    const chaptersRestored = db.prepare(`UPDATE chapters SET deleted_at = NULL, updated_at = ? WHERE volume_id = ? AND deleted_at IS NOT NULL`).run(now, id);
    const volumeResult = db.prepare(`UPDATE novel_volumes SET deleted_at = NULL WHERE id = ?`).run(id);
    return { volumeOk: volumeResult.changes > 0, chapterCount: Number(chaptersRestored.changes) };
  }
};

// 辅助: 把 DB 行的 published INTEGER (0/1) 转 boolean (严守 v0.6.1: Chapter.published Boolean)
function toChapter(row: any): Chapter {
  return { ...row, published: row.published === 1, deleted_at: row.deleted_at ?? null };
}

export const chapterRepo = {
  byVolume(volumeId: string): Chapter[] {
    const rows = db.prepare(`SELECT * FROM chapters WHERE volume_id = ? ORDER BY "order" ASC`).all(volumeId) as any[];
    return rows.map(toChapter);
  },

  bySlug(slug: string): Chapter | null {
    const row = db.prepare(`SELECT * FROM chapters WHERE slug = ?`).get(slug) as any;
    return row ? toChapter(row) : null;
  },

  incrementView(id: string): void {
    db.prepare(`UPDATE chapters SET view_count = view_count + 1 WHERE id = ?`).run(id);
  },

  // ============ Phase 3.x: 公开端 ============
  bySlugPublished(slug: string): Chapter | null {
    const row = db.prepare(`SELECT * FROM chapters WHERE slug = ? AND published = 1 AND deleted_at IS NULL`).get(slug) as any;
    return row ? toChapter(row) : null;
  },

  // 公开端看 chapter 时, 跳 view + 拿关联 Volume + Novel
  bySlugWithContext(slug: string): { chapter: Chapter; volume: NovelVolume; novel: Novel } | null {
    const c = this.bySlugPublished(slug);
    if (!c) return null;
    const v = volumeRepo.byId(c.volume_id);
    if (!v || v.deleted_at) return null;
    const n = novelRepo.byId(v.novel_id);
    if (!n || n.deleted_at) return null;
    return { chapter: c, volume: v, novel: n };
  },

  // ============ Phase 3.3: Admin CRUD ============

  byId(id: string): Chapter | null {
    const row = db.prepare(`SELECT * FROM chapters WHERE id = ?`).get(id) as any;
    return row ? toChapter(row) : null;
  },

  // 下一个 order (per-volume max+1, 排除 deleted)
  nextOrder(volumeId: string): number {
    const row = db.prepare(`SELECT COALESCE(MAX("order"), 0) AS max_order FROM chapters WHERE volume_id = ? AND deleted_at IS NULL`).get(volumeId) as { max_order: number };
    return row.max_order + 1;
  },

  // Admin 列表 (按 volume, 支持 status/q 筛选/分页, 默认排除 deleted)
  listByVolume({
    volumeId,
    status,
    q,
    includeDeleted = false,
    limit = 100,
    offset = 0
  }: {
    volumeId: string;
    status?: string;
    q?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): { items: Chapter[]; total: number } {
    const where: string[] = ["volume_id = ?"];
    const params: any[] = [volumeId];
    if (!includeDeleted) { where.push("deleted_at IS NULL"); }
    if (status) {
      // status 接收 'draft' | 'published' | 'archived' (legacy 兼容)
      if (status === "archived") where.push("deleted_at IS NOT NULL");
      else if (status === "published") where.push("published = 1");
      else if (status === "draft") where.push("published = 0 AND deleted_at IS NULL");
    }
    if (q && q.trim()) { where.push("(title LIKE ? OR excerpt LIKE ? OR slug LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM chapters ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT * FROM chapters ${whereSql} ORDER BY "order" ASC LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return { items: rows.map(toChapter), total: countRow.c };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM chapters WHERE slug = ? AND id != ? AND deleted_at IS NULL`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM chapters WHERE slug = ? AND deleted_at IS NULL`).get(slug);
    return !!row;
  },

  create(data: Omit<Chapter, "id" | "created_at" | "updated_at" | "view_count" | "fts" | "deleted_at">): Chapter {
    const id = uid("ch");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO chapters (id, volume_id, "order", slug, title, content, excerpt, published, published_at, deleted_at, created_at, updated_at, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)`).run(
      id, data.volume_id, data.order, data.slug, data.title, data.content, data.excerpt ?? null, data.published ? 1 : 0, data.published_at ?? null, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0, fts: null, deleted_at: null };
  },

  update(id: string, data: Partial<Omit<Chapter, "id" | "created_at" | "view_count" | "fts" | "volume_id" | "deleted_at">>): Chapter | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    // 自动管理 published_at: 首次发布 (true + 原 published_at 为 null) 写时间戳; 改回 draft 清空
    if (data.published === true && !existing.published_at) {
      merged.published_at = now;
    } else if (data.published === false) {
      merged.published_at = null;
    }
    db.prepare(`
      UPDATE chapters SET "order" = ?, slug = ?, title = ?, content = ?, excerpt = ?,
        published = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.order, merged.slug, merged.title, merged.content, merged.excerpt ?? null,
      merged.published ? 1 : 0, merged.published_at ?? null, now, id
    );
    return { ...merged, updated_at: now, published: merged.published };
  },

  // 软删除: 写 deleted_at (严守 v0.6.1, 不动 published)
  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE chapters SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  restore(id: string): boolean {
    const result = db.prepare(`UPDATE chapters SET deleted_at = NULL, updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  }
};

// ============ Video + Series ============
export const videoRepo = {
  list(): Video[] {
    return db.prepare(`SELECT * FROM videos ORDER BY COALESCE(published_at, created_at) DESC`).all() as Video[];
  },

  series(): VideoSeries[] {
    return db.prepare(`SELECT * FROM video_series ORDER BY "order" ASC`).all() as VideoSeries[];
  },

  create(data: Omit<Video, "id" | "created_at" | "updated_at" | "view_count">): Video {
    const id = uid("vid");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO videos (id, series_id, slug, title, description, embed_url, cover_image, duration, status, published_at, created_at, updated_at, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(
      id, data.series_id ?? null, data.slug, data.title, data.description ?? null, data.embed_url, data.cover_image ?? null, data.duration ?? null, data.status, data.published_at ?? null, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0 };
  },

  // ============ Phase 3.4: Admin CRUD ============
  byId(id: string): Video | null {
    const row = db.prepare(`SELECT * FROM videos WHERE id = ?`).get(id) as Video | undefined;
    return row ?? null;
  },

  bySlug(slug: string): Video | null {
    const row = db.prepare(`SELECT * FROM videos WHERE slug = ?`).get(slug) as Video | undefined;
    return row ?? null;
  },

  incrementView(id: string): void {
    db.prepare(`UPDATE videos SET view_count = view_count + 1 WHERE id = ?`).run(id);
  },

  // Admin 列表 (支持 status / series / 搜索 / 分页)
  listAll({
    status,
    seriesId,
    q,
    limit = 50,
    offset = 0
  }: {
    status?: string;
    seriesId?: string;
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): { items: Video[]; total: number } {
    const where: string[] = [];
    const params: any[] = [];
    if (status) { where.push("status = ?"); params.push(status); }
    if (seriesId) { where.push("series_id = ?"); params.push(seriesId); }
    if (q && q.trim()) { where.push("(title LIKE ? OR description LIKE ? OR slug LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM videos ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT * FROM videos ${whereSql}
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { items: rows as Video[], total: countRow.c };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM videos WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM videos WHERE slug = ?`).get(slug);
    return !!row;
  },

  update(id: string, data: Partial<Omit<Video, "id" | "created_at" | "view_count">>): Video | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE videos SET
        series_id = ?, slug = ?, title = ?, description = ?,
        embed_url = ?, cover_image = ?, duration = ?,
        status = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.series_id ?? null, merged.slug, merged.title, merged.description ?? null,
      merged.embed_url, merged.cover_image ?? null, merged.duration ?? null,
      merged.status, merged.published_at ?? null, now, id
    );
    return { ...merged, updated_at: now };
  },

  // 软删除: status -> archived (videos 用 status enum, 与 posts 一致)
  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE videos SET status = 'archived', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  restore(id: string): boolean {
    const result = db.prepare(`UPDATE videos SET status = 'draft', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  // 物理删除 (admin 慎用, 会级联清空 media_usages 引用)
  hardDelete(id: string): boolean {
    const result = db.prepare(`DELETE FROM videos WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  // 列出某系列下所有视频
  listBySeries(seriesId: string): Video[] {
    return db.prepare(`SELECT * FROM videos WHERE series_id = ? ORDER BY COALESCE(published_at, created_at) DESC`).all(seriesId) as Video[];
  }
};

export const videoSeriesRepo = {
  create(data: Omit<VideoSeries, "id" | "created_at">): VideoSeries {
    const id = uid("vs");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO video_series (id, slug, title, description, cover_image, "order", created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.slug, data.title, data.description ?? null, data.cover_image ?? null, data.order, now
    );
    return { ...data, id, created_at: now };
  },

  // Phase 2.1: 列出所有视频系列
  list(): VideoSeries[] {
    const stmt = db.prepare(`SELECT * FROM video_series ORDER BY "order" ASC, created_at DESC`);
    return stmt.all() as VideoSeries[];
  },

  // ============ Phase 3.4: Admin CRUD ============
  byId(id: string): VideoSeries | null {
    const row = db.prepare(`SELECT * FROM video_series WHERE id = ?`).get(id) as VideoSeries | undefined;
    return row ?? null;
  },

  bySlug(slug: string): VideoSeries | null {
    const row = db.prepare(`SELECT * FROM video_series WHERE slug = ?`).get(slug) as VideoSeries | undefined;
    return row ?? null;
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM video_series WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM video_series WHERE slug = ?`).get(slug);
    return !!row;
  },

  update(id: string, data: Partial<Omit<VideoSeries, "id" | "created_at">>): VideoSeries | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    db.prepare(`
      UPDATE video_series SET
        slug = ?, title = ?, description = ?, cover_image = ?, "order" = ?
      WHERE id = ?
    `).run(
      merged.slug, merged.title, merged.description ?? null, merged.cover_image ?? null, merged.order, id
    );
    return merged;
  },

  // 物理删除: 会把 videos.series_id 置 NULL (ON DELETE SET NULL)
  hardDelete(id: string): boolean {
    const result = db.prepare(`DELETE FROM video_series WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  // Admin 列表 (含每个系列的视频数)
  listWithCount(): { series: VideoSeries; videoCount: number }[] {
    const rows = db.prepare(`
      SELECT s.*, COUNT(v.id) AS video_count
      FROM video_series s
      LEFT JOIN videos v ON v.series_id = s.id
      GROUP BY s.id
      ORDER BY s."order" ASC, s.created_at DESC
    `).all() as (VideoSeries & { video_count: number })[];
    return rows.map((r) => ({ series: { id: r.id, slug: r.slug, title: r.title, description: r.description, cover_image: r.cover_image, order: r.order, created_at: r.created_at }, videoCount: r.video_count }));
  },

  // 取下一个 order (auto increment)
  nextOrder(): number {
    const row = db.prepare(`SELECT COALESCE(MAX("order"), 0) + 1 AS next FROM video_series`).get() as { next: number };
    return row.next;
  }
};

// ============ SiteConfig ============
export const siteConfigRepo = {
  get(): SiteConfig | null {
    const row = db.prepare(`SELECT * FROM site_config WHERE id = 'singleton'`).get() as SiteConfig | undefined;
    return row ?? null;
  },

  upsert(data: Partial<SiteConfig>): SiteConfig {
    const existing = this.get();
    if (existing) {
      const updates: string[] = [];
      const values: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (k === "id" || k === "updated_at") continue;
        updates.push(`${k} = ?`);
        values.push(v);
      }
      if (updates.length > 0) {
        values.push(Math.floor(Date.now() / 1000));
        db.prepare(`UPDATE site_config SET ${updates.join(", ")}, updated_at = ? WHERE id = 'singleton'`).run(...values);
      }
    } else {
      db.prepare(`INSERT INTO site_config (id, site_name, site_tagline, site_description, site_keywords, default_theme, allow_custom_html, baidu_push_enabled) VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?)`).run(
        data.site_name ?? "黑曜石日志",
        data.site_tagline ?? "用代码与数据说话",
        data.site_description ?? null,
        data.site_keywords ?? null,
        data.default_theme ?? "light",
        data.allow_custom_html ?? 0,
        data.baidu_push_enabled ?? 1
      );
    }
    return this.get()!;
  }
};

// ============ Social ============
export const socialRepo = {
  list(visibleOnly = true): Social[] {
    if (visibleOnly) {
      return db.prepare(`SELECT * FROM socials WHERE visible = 1 ORDER BY "order" ASC`).all() as Social[];
    }
    return db.prepare(`SELECT * FROM socials ORDER BY "order" ASC`).all() as Social[];
  },

  create(data: Omit<Social, "id" | "created_at">): Social {
    const id = uid("soc");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO socials (id, platform, label, url, icon, "order", visible, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.platform, data.label, data.url, data.icon ?? null, data.order, data.visible, now
    );
    return { ...data, id, created_at: now };
  },

  // ============ Phase 3.x: Admin CRUD (v0.11) ============
  byId(id: string): Social | null {
    const row = db.prepare(`SELECT * FROM socials WHERE id = ?`).get(id) as Social | undefined;
    return row ?? null;
  },

  update(id: string, data: Partial<Omit<Social, "id" | "created_at">>): Social | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    db.prepare(`
      UPDATE socials SET
        platform = ?, label = ?, url = ?, icon = ?, "order" = ?, visible = ?
      WHERE id = ?
    `).run(
      merged.platform, merged.label, merged.url, merged.icon ?? null,
      merged.order, merged.visible, id
    );
    return merged;
  },

  hardDelete(id: string): boolean {
    const result = db.prepare(`DELETE FROM socials WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  count(): number {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM socials`).get() as { c: number };
    return row.c;
  }
};

// ============ User ============
export const userRepo = {
  byEmail(email: string): User | null {
    const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as User | undefined;
    return row ?? null;
  },

  byId(id: string): User | null {
    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | undefined;
    return row ?? null;
  },

  create(data: Omit<User, "id" | "created_at" | "updated_at" | "deleted_at">): User {
    const id = uid("u");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.email, data.password_hash, data.name ?? null, data.role, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, deleted_at: null };
  },

  // ============ Phase 3.9: Admin CRUD ============
  list({ limit = 20, offset = 0, includeDeleted = false }: { limit?: number; offset?: number; includeDeleted?: boolean } = {}): User[] {
    const where = includeDeleted ? "" : "WHERE deleted_at IS NULL";
    return db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset) as User[];
  },

  listWithStats({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Array<User & { session_count: number }> {
    return db.prepare(`
      SELECT u.*, COUNT(s.id) as session_count
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id AND s.expires_at > unixepoch()
      WHERE u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Array<User & { session_count: number }>;
  },

  count({ includeDeleted = false }: { includeDeleted?: boolean } = {}): number {
    const where = includeDeleted ? "" : "WHERE deleted_at IS NULL";
    const row = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get() as { c: number };
    return row.c;
  },

  update(id: string, data: Partial<Pick<User, "email" | "name" | "role">>): User | null {
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      sets.push(`${k} = ?`);
      values.push(v);
    }
    if (sets.length === 0) return this.byId(id);
    sets.push(`updated_at = ?`);
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.byId(id);
  },

  updatePassword(id: string, passwordHash: string): boolean {
    const result = db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .run(passwordHash, Math.floor(Date.now() / 1000), id);
    return result.changes > 0;
  },

  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id);
    return result.changes > 0;
  },

  restore(id: string): boolean {
    const result = db.prepare(`UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`)
      .run(Math.floor(Date.now() / 1000), id);
    return result.changes > 0;
  },

  emailExists(email: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT 1 FROM users WHERE email = ? AND id != ?`).get(email, excludeId)
      : db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(email);
    return row !== undefined;
  }
};

// ============ Page ============
export const pageRepo = {
  list({ status = "published", limit = 20 }: { status?: string; limit?: number } = {}): Page[] {
    return db.prepare(`SELECT * FROM pages WHERE status = ? ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?`).all(status, limit) as Page[];
  },

  bySlug(slug: string): Page | null {
    const row = db.prepare(`SELECT * FROM pages WHERE slug = ?`).get(slug) as Page | undefined;
    return row ?? null;
  },

  // ============ Phase 3.5: Admin CRUD ============
  byId(id: string): Page | null {
    const row = db.prepare(`SELECT * FROM pages WHERE id = ?`).get(id) as Page | undefined;
    return row ?? null;
  },

  incrementView(id: string): void {
    db.prepare(`UPDATE pages SET view_count = view_count + 1 WHERE id = ?`).run(id);
  },

  // Admin 列表 (支持 status / 搜索 / 分页, 状态不限 published)
  listAll({
    status,
    q,
    limit = 50,
    offset = 0
  }: {
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): { items: Page[]; total: number } {
    const where: string[] = [];
    const params: any[] = [];
    if (status) { where.push("status = ?"); params.push(status); }
    if (q && q.trim()) { where.push("(title LIKE ? OR description LIKE ? OR slug LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM pages ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT * FROM pages ${whereSql}
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { items: rows as Page[], total: countRow.c };
  },

  slugExists(slug: string, excludeId?: string): boolean {
    const row = excludeId
      ? db.prepare(`SELECT id FROM pages WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM pages WHERE slug = ?`).get(slug);
    return !!row;
  },

  create(data: Omit<Page, "id" | "created_at" | "updated_at" | "view_count" | "fts">): Page {
    const id = uid("pg");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO pages (id, slug, title, description, blocks, status, author_id, published_at, created_at, updated_at, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id, data.slug, data.title, data.description ?? null, data.blocks,
      data.status, data.author_id, data.published_at ?? null, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0, fts: null };
  },

  update(id: string, data: Partial<Omit<Page, "id" | "created_at" | "view_count" | "fts">>): Page | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE pages SET
        slug = ?, title = ?, description = ?, blocks = ?,
        status = ?, author_id = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.slug, merged.title, merged.description ?? null, merged.blocks,
      merged.status, merged.author_id, merged.published_at ?? null, now, id
    );
    return { ...merged, updated_at: now };
  },

  // 软删除: status -> archived
  softDelete(id: string): boolean {
    const result = db.prepare(`UPDATE pages SET status = 'archived', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  },

  // 恢复: status -> draft
  restore(id: string): boolean {
    const result = db.prepare(`UPDATE pages SET status = 'draft', updated_at = ? WHERE id = ?`).run(
      Math.floor(Date.now() / 1000),
      id
    );
    return result.changes > 0;
  }
};

// ============ Media (Phase 3.6) ============
export const mediaRepo = {
  byId(id: string): MediaItem | null {
    const row = db.prepare(`SELECT * FROM media_items WHERE id = ?`).get(id) as MediaItem | undefined;
    return row ?? null;
  },

  byFilename(filename: string): MediaItem | null {
    const row = db.prepare(`SELECT * FROM media_items WHERE filename = ?`).get(filename) as MediaItem | undefined;
    return row ?? null;
  },

  // Admin 列表 (支持 mime / 搜索 / 分页)
  listAll({
    mimePrefix,
    q,
    limit = 100,
    offset = 0
  }: {
    mimePrefix?: string; // 'image/' / 'video/' / 'application/' etc.
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): { items: MediaItem[]; total: number } {
    const where: string[] = [];
    const params: any[] = [];
    if (mimePrefix) { where.push("mime_type LIKE ?"); params.push(`${mimePrefix}%`); }
    if (q && q.trim()) { where.push("(filename LIKE ? OR alt LIKE ?)"); const like = `%${q.replace(/[%_]/g, "")}%`; params.push(like, like); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) AS c FROM media_items ${whereSql}`).get(...params) as { c: number };

    const rows = db.prepare(`
      SELECT * FROM media_items ${whereSql}
      ORDER BY uploaded_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { items: rows as MediaItem[], total: countRow.c };
  },

  create(data: Omit<MediaItem, "id" | "uploaded_at">): MediaItem {
    const id = uid("med");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO media_items (id, filename, mime_type, size, width, height, alt, url, storage_type, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.filename, data.mime_type, data.size,
      data.width ?? null, data.height ?? null, data.alt ?? null,
      data.url, data.storage_type, now
    );
    return { ...data, id, uploaded_at: now };
  },

  update(id: string, data: Partial<Omit<MediaItem, "id" | "uploaded_at">>): MediaItem | null {
    const existing = this.byId(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    db.prepare(`
      UPDATE media_items SET
        filename = ?, mime_type = ?, size = ?, width = ?, height = ?,
        alt = ?, url = ?, storage_type = ?
      WHERE id = ?
    `).run(
      merged.filename, merged.mime_type, merged.size,
      merged.width ?? null, merged.height ?? null,
      merged.alt ?? null, merged.url, merged.storage_type, id
    );
    return merged;
  },

  // 物理删除 + 级联清 media_usages
  hardDelete(id: string): { mediaOk: boolean; usageCount: number } {
    const usageCount = (db.prepare(`SELECT COUNT(*) AS c FROM media_usages WHERE media_id = ?`).get(id) as { c: number }).c;
    db.prepare(`DELETE FROM media_usages WHERE media_id = ?`).run(id);
    const result = db.prepare(`DELETE FROM media_items WHERE id = ?`).run(id);
    return { mediaOk: result.changes > 0, usageCount };
  },

  // 引用追踪
  listUsages(mediaId: string): MediaUsage[] {
    return db.prepare(`SELECT * FROM media_usages WHERE media_id = ? ORDER BY created_at DESC`).all(mediaId) as MediaUsage[];
  },

  addUsage(mediaId: string, refType: RefType, refId: string, field?: string | null): void {
    db.prepare(`
      INSERT OR IGNORE INTO media_usages (id, media_id, ref_type, ref_id, field)
      VALUES (?, ?, ?, ?, ?)
    `).run(uid("mu"), mediaId, refType, refId, field ?? null);
  },

  removeUsage(mediaId: string, refType: RefType, refId: string, field?: string | null): void {
    db.prepare(`
      DELETE FROM media_usages WHERE media_id = ? AND ref_type = ? AND ref_id = ? AND IFNULL(field, '') = IFNULL(?, '')
    `).run(mediaId, refType, refId, field ?? null);
  },

  // 统计
  count(): number {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM media_items`).get() as { c: number };
    return row.c;
  },

  totalSize(): number {
    const row = db.prepare(`SELECT COALESCE(SUM(size), 0) AS s FROM media_items`).get() as { s: number };
    return row.s;
  }
};

// ============ Reset (dev only) ============
export function resetAllData(): void {
  db.exec(`
    DELETE FROM daily_stats;
    DELETE FROM media_usages;
    DELETE FROM media_items;
    DELETE FROM pages;
    DELETE FROM chapters;
    DELETE FROM novel_volumes;
    DELETE FROM novels;
    DELETE FROM videos;
    DELETE FROM video_series;
    DELETE FROM posts;
    DELETE FROM series;
    DELETE FROM socials;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM site_config;
  `);
}