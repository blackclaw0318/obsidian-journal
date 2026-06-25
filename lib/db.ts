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

    -- 2. Post
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
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0,
      fts TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

    -- 3. Novel + NovelVolume + Chapter
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS novel_volumes (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(novel_id, "order")
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_novel ON novel_volumes(novel_id);

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL REFERENCES novel_volumes(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      view_count INTEGER NOT NULL DEFAULT 0,
      fts TEXT,
      UNIQUE(volume_id, "order")
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status, published_at);

    -- 4. Video + VideoSeries
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

    -- 5. MediaItem + MediaUsage
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

    -- 6. Page (Block 组合)
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

    -- 7. SiteConfig (单例)
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

    -- 8. Social
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

    -- 9. FTS5 全文搜索 (Phase 2.2) — posts_fts virtual table
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

// 自动初始化 (dev/prod 启动时建表)
if (process.env.SKIP_DB_INIT !== "1") {
  try {
    initSchema();
  } catch (err) {
    console.error("[db] init schema failed:", err);
  }
}