// ============================================================
// node:sqlite 单例 + WAL + 7 PRAGMA (v0.4 §13.4 部署配置层)
// ============================================================
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/dev.db");

// 确保目录存在
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __db: DatabaseSync | undefined;
}

function openDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  // v0.4 §13.4 SQLite WAL + 7 PRAGMA
  if (process.env.NODE_ENV !== "test") {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec("PRAGMA cache_size = -64000;"); // 64MB
    db.exec("PRAGMA temp_store = MEMORY;");
    db.exec("PRAGMA mmap_size = 268435456;"); // 256MB
    db.exec("PRAGMA foreign_keys = ON;");
  }
  return db;
}

export const db = global.__db ?? openDb();
if (process.env.NODE_ENV !== "production") {
  global.__db = db;
}

// ============================================================
// 数据库初始化 (幂等, 只在表不存在时建表)
// ============================================================
export function initSchema(): void {
  db.exec(`
    -- 1. User + Session
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    -- 2. Series (Phase 3.5+ v0.11, v0.6.1 §6 还原)
    -- tech/life 文章系列 (与 video_series 区分)
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      category TEXT NOT NULL DEFAULT 'tech',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_series_category ON series(category, "order");

    -- 3. Post
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      category TEXT NOT NULL DEFAULT 'tech',
      tags TEXT,
      author_id TEXT NOT NULL REFERENCES users(id),
      series_id TEXT REFERENCES series(id) ON DELETE SET NULL,
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0,
      fts TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    -- idx_posts_series 老库缺 series_id 列, 在 migrateSchema 里补建 (避免 init 失败)

    -- 兼容老库: 若 posts 缺 series_id 列, 补上 (v0.11 迁移)
    -- SQLite ALTER TABLE 不支持 IF NOT EXISTS, 用 try/catch 包裹
    -- (实际由 initSchema 调用方在 try 内执行)

    -- 4. Novel + NovelVolume + Chapter
    -- 严守 v0.6.1: NovelStatus 3 值 (ongoing|completed|hiatus), 软删走 deleted_at (≠ status enum)
    -- 严守 v0.6.1: Chapter 用 published Boolean, 无 status 字段
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing',
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_novels_deleted ON novels(deleted_at);

    CREATE TABLE IF NOT EXISTS novel_volumes (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(novel_id, "order")
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_novel ON novel_volumes(novel_id);
    CREATE INDEX IF NOT EXISTS idx_volumes_deleted ON novel_volumes(deleted_at);

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL REFERENCES novel_volumes(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      published_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0,
      fts TEXT,
      UNIQUE(volume_id, "order")
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_published ON chapters(published, published_at);
    CREATE INDEX IF NOT EXISTS idx_chapters_deleted ON chapters(deleted_at);

    -- 5. Video + VideoSeries
    CREATE TABLE IF NOT EXISTS video_series (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      series_id TEXT REFERENCES video_series(id) ON DELETE SET NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      embed_url TEXT NOT NULL,
      cover_image TEXT,
      duration INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_videos_series ON videos(series_id);

    -- 6. MediaItem + MediaUsage + Resource 计数 (v0.34 Phase 4)
    -- v0.34: 砍 video, 新增 category (image/document/audio) + is_paid (默认 0, v0.35 付费预留)
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      alt TEXT,
      url TEXT NOT NULL,
      storage_type TEXT NOT NULL DEFAULT 'local',
      category TEXT NOT NULL DEFAULT 'image' CHECK (category IN ('image','document','audio')),
      is_paid INTEGER NOT NULL DEFAULT 0,
      uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_media_mime ON media_items(mime_type);
    CREATE INDEX IF NOT EXISTS idx_media_category ON media_items(category);

    CREATE TABLE IF NOT EXISTS media_usages (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
      ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      field TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(media_id, ref_type, ref_id, field)
    );
    CREATE INDEX IF NOT EXISTS idx_usages_ref ON media_usages(ref_type, ref_id);

    -- v0.35.2 (老板 2026-07-05 01:18 拍板): 板块访问监控
    -- page_views: 原始访问流 (middleware 拦截 HTML GET, 24h 同 ip_hash+path 去重)
    -- page_views_daily: 每日聚合缓存 (避免 dashboard 重算)
    -- 数据保留 365 天 (Q4 老板决策)
    CREATE TABLE IF NOT EXISTS page_views (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      section TEXT NOT NULL,           -- 第 1 段 (+ admin 第 2 段, 例 /admin/posts → 'admin/posts')
      ip_hash TEXT NOT NULL,
      user_agent TEXT,                 -- Q3: 存 UA (浏览器/设备分布)
      visited_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_pv_section_time ON page_views(section, visited_at);
    CREATE INDEX IF NOT EXISTS idx_pv_path_time ON page_views(path, visited_at);
    CREATE INDEX IF NOT EXISTS idx_pv_ip_hash ON page_views(ip_hash);

    CREATE TABLE IF NOT EXISTS page_views_daily (
      section TEXT NOT NULL,
      date TEXT NOT NULL,              -- 'YYYY-MM-DD' (UTC+8)
      pv INTEGER NOT NULL DEFAULT 0,   -- page views (含 dedup)
      uv INTEGER NOT NULL DEFAULT 0,   -- unique visitors (24h 同 ip_hash 去重)
      PRIMARY KEY (section, date)
    );

    -- 7. Page (Block 组合)
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      blocks TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      author_id TEXT NOT NULL REFERENCES users(id),
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0,
      fts TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status, published_at);

    -- 8. SiteConfig (单例)
    CREATE TABLE IF NOT EXISTS site_config (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      site_name TEXT NOT NULL DEFAULT '黑曜石日志',
      site_tagline TEXT NOT NULL DEFAULT '用代码与数据说话',
      site_description TEXT,
      site_keywords TEXT,
      default_theme TEXT NOT NULL DEFAULT 'light',
      allow_custom_html INTEGER NOT NULL DEFAULT 0,
      baidu_push_enabled INTEGER NOT NULL DEFAULT 1,
      baidu_push_token TEXT,
      og_image TEXT,
      favicon TEXT,
      analytics TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- 9. Social
    CREATE TABLE IF NOT EXISTS socials (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_socials_order ON socials("order");

    -- 11. DailyStat (v0.11, v0.6.1 §6 还原) — Phase 4 监控铺路
    -- 单条记录 = 某天 (YYYY-MM-DD) 的 PV/UV 聚合
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,         -- 'YYYY-MM-DD'
      pv INTEGER NOT NULL DEFAULT 0,     -- 页面浏览
      uv INTEGER NOT NULL DEFAULT 0,     -- 独立访客 (近似去重 IP)
      post_views INTEGER NOT NULL DEFAULT 0,  -- 文章详情浏览
      new_comments INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

    -- 10. FTS5 全文搜索 (Phase 2.2 → v0.29 P2-19: trigram tokenizer 支持中文)
    -- content=posts 走外部内容表, 触发器同步 (AI/AD/AU)
    -- P2-19 决策: 从 unicode61 切到 trigram, 原因:
    --   unicode61 把中文每个汉字当独立 token, 搜 "黑曜石" 能命中但 "曜石" 命中不了
    --   trigram 走 3 字滑窗, 中文 "黑曜石" "曜石日" "石日志" 都能命中 (3+ 字中文)
    --   trigram 局限: 1-2 字中文不支持, 走 LIKE 兏底 (repo.search 双轨)
    --   过渡: 重建表 (v0.29 migration),  dev 需 db:reset,  生产部署前需 manual migration
    DROP TABLE IF EXISTS posts_fts;
    DROP TRIGGER IF EXISTS posts_ai;
    DROP TRIGGER IF EXISTS posts_ad;
    DROP TRIGGER IF EXISTS posts_au;
    CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
      title, content, excerpt, tags,
      content='posts', content_rowid='rowid',
      tokenize='trigram'
    );

    -- 同步触发器: INSERT
    CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
      INSERT INTO posts_fts(rowid, title, content, excerpt, tags)
      VALUES (new.rowid, new.title, new.content, IFNULL(new.excerpt, ''), IFNULL(new.tags, ''));
    END;

    -- 同步触发器: DELETE
    CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, content, excerpt, tags)
      VALUES('delete', old.rowid, old.title, old.content, IFNULL(old.excerpt, ''), IFNULL(old.tags, ''));
    END;

    -- 同步触发器: UPDATE
    CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, content, excerpt, tags)
      VALUES('delete', old.rowid, old.title, old.content, IFNULL(old.excerpt, ''), IFNULL(old.tags, ''));
      INSERT INTO posts_fts(rowid, title, content, excerpt, tags)
      VALUES (new.rowid, new.title, new.content, IFNULL(new.excerpt, ''), IFNULL(new.tags, ''));
    END;

    -- v0.29 P2-19: trigram + external content 需显式 rebuild (trigger 仅插入, 不生成 3-gram index)
    -- rebuild 幂等: posts 为空时也是 noop
    INSERT INTO posts_fts(posts_fts) VALUES('rebuild');
  `);
}

// ============================================================
// schema 迁移 (v0.11+) — 老库补列
// ============================================================
function migrateSchema(): void {
  // v0.11: posts 加 series_id 列 + 索引 (老库兼容)
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN series_id TEXT REFERENCES series(id) ON DELETE SET NULL;`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_series ON posts(series_id);`);
  } catch {
    // 列已存在, 索引可能也在, 静默吞
  }
  // v0.11: site_config 加 allow_custom_html (默认 0)
  try {
    db.exec(`ALTER TABLE site_config ADD COLUMN allow_custom_html INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // 已存在
  }
  // v0.11: site_config 加 favicon
  try {
    db.exec(`ALTER TABLE site_config ADD COLUMN favicon TEXT;`);
  } catch {
    // 已存在
  }
  // v0.11: site_config 加 og_image
  try {
    db.exec(`ALTER TABLE site_config ADD COLUMN og_image TEXT;`);
  } catch {
    // 已存在
  }
  // v0.11: site_config 加 analytics
  try {
    db.exec(`ALTER TABLE site_config ADD COLUMN analytics TEXT;`);
  } catch {
    // 已存在
  }
  // v0.15: users 加 deleted_at (软删, 严禁丢失审计)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN deleted_at INTEGER;`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);`);
  } catch {
    // 已存在
  }
  // v0.18: site_config 加 avatar_url (首页头像, 老板可上传覆盖)
  try {
    db.exec(`ALTER TABLE site_config ADD COLUMN avatar_url TEXT;`);
  } catch {
    // 已存在
  }
  // v0.35 00:59 老板决策: 删所有计数功能
  // media_counters / media_access_logs 表 / 字段 / 迁移全部砍

  // v0.34 Phase 4: media_items 加 category + is_paid (计数表已删)
  try {
    db.exec(`ALTER TABLE media_items ADD COLUMN category TEXT NOT NULL DEFAULT 'image';`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_media_category ON media_items(category);`);
  } catch {
    // 已存在
  }
  try {
    db.exec(`ALTER TABLE media_items ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // 已存在
  }
  // 历史数据补 category (基于 mime_type)
  try {
    db.exec(`
      UPDATE media_items SET category = CASE
        WHEN mime_type LIKE 'image/%' THEN 'image'
        WHEN mime_type LIKE 'audio/%' THEN 'audio'
        WHEN mime_type LIKE 'application/pdf'
          OR mime_type LIKE 'application/%word%'
          OR mime_type LIKE 'application/%sheet%'
          OR mime_type LIKE 'application/%zip%'
          OR mime_type LIKE 'text/%' THEN 'document'
        ELSE 'image'
      END
      WHERE category = 'image' AND mime_type NOT LIKE 'image/%';
    `);
  } catch {
    // 已存在
  }
  // v0.34 Phase 4: 清理所有 video 物理文件 + DB 记录 (老板 15:14 决策: 砍 video)
  try {
    const videoRows = db
      .prepare(`SELECT id, url FROM media_items WHERE mime_type LIKE 'video/%'`)
      .all() as Array<{ id: string; url: string }>;
    for (const row of videoRows) {
      try {
        // 物理文件清理 (best-effort, 失败不阻塞)
        const fs = require("node:fs");
        const path = require("node:path");
        const filename = row.url.split("/").pop();
        if (filename) {
          const localPath = path.join(process.cwd(), "public", "uploads", filename);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
      } catch {
        // ignore fs errors
      }
    }
    db.exec(`DELETE FROM media_items WHERE mime_type LIKE 'video/%';`);
  } catch (err) {
    console.error("[db] v0.34 video cleanup:", err);
  }
}

// 自动初始化 (dev/prod 启动时建表)
if (process.env.SKIP_DB_INIT !== "1") {
  try {
    initSchema();
    migrateSchema();
  } catch (err) {
    console.error("[db] init/migrate schema failed:", err);
  }
}