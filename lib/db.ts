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

    -- 6. MediaItem + MediaUsage
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
      uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_media_mime ON media_items(mime_type);

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

    -- 10. FTS5 全文搜索 (Phase 2.2) — posts_fts virtual table
    -- content=posts 走外部内容表, 触发器同步 (AI/AD/AU)
    CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
      title, content, excerpt, tags,
      content='posts', content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
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