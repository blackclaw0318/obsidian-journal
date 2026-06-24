// ============================================================
// 数据访问层 (Repository Pattern) - 基于 node:sqlite
// 替代 Prisma client, 完全可控
// ============================================================
import { db, initSchema } from "./db";
import type {
  Post,
  PostWithAuthor,
  Novel,
  NovelVolume,
  Chapter,
  VideoSeries,
  Video,
  SiteConfig,
  Social,
  User,
  Page
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
      INSERT INTO posts (id, slug, title, excerpt, content, cover_image, status, category, tags, author_id, published_at, created_at, updated_at, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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
      data.published_at ?? null,
      now,
      now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0, fts: null };
  }
};

// ============ Novel + Volume + Chapter ============
export const novelRepo = {
  list(): (Novel & { volumes: (NovelVolume & { chapters: Chapter[] })[] })[] {
    const novels = db.prepare(`SELECT * FROM novels ORDER BY updated_at DESC`).all() as Novel[];
    return novels.map((n) => ({
      ...n,
      volumes: volumeRepo.byNovel(n.id).map((v) => ({
        ...v,
        chapters: chapterRepo.byVolume(v.id)
      }))
    }));
  },

  count(): number {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM novels`).get() as { c: number };
    return row.c;
  },

  latest(): (Novel & { volumes: (NovelVolume & { chapters: Chapter[] })[] }) | null {
    const row = db.prepare(`SELECT * FROM novels ORDER BY updated_at DESC LIMIT 1`).get() as Novel | undefined;
    if (!row) return null;
    return {
      ...row,
      volumes: volumeRepo.byNovel(row.id).map((v) => ({
        ...v,
        chapters: chapterRepo.byVolume(v.id)
      }))
    };
  },

  create(data: Omit<Novel, "id" | "created_at" | "updated_at">): Novel {
    const id = uid("novel");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO novels (id, slug, title, description, cover_image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.slug, data.title, data.description ?? null, data.cover_image ?? null, data.status, now, now
    );
    return { ...data, id, created_at: now, updated_at: now };
  }
};

export const volumeRepo = {
  byNovel(novelId: string): NovelVolume[] {
    return db.prepare(`SELECT * FROM novel_volumes WHERE novel_id = ? ORDER BY "order" ASC`).all(novelId) as NovelVolume[];
  },

  create(data: Omit<NovelVolume, "id" | "created_at">): NovelVolume {
    const id = uid("vol");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO novel_volumes (id, novel_id, "order", title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
      id, data.novel_id, data.order, data.title, data.description ?? null, now
    );
    return { ...data, id, created_at: now };
  }
};

export const chapterRepo = {
  byVolume(volumeId: string): Chapter[] {
    return db.prepare(`SELECT * FROM chapters WHERE volume_id = ? ORDER BY "order" ASC`).all(volumeId) as Chapter[];
  },

  bySlug(slug: string): Chapter | null {
    const row = db.prepare(`SELECT * FROM chapters WHERE slug = ?`).get(slug) as Chapter | undefined;
    return row ?? null;
  },

  create(data: Omit<Chapter, "id" | "created_at" | "updated_at" | "view_count" | "fts">): Chapter {
    const id = uid("ch");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO chapters (id, volume_id, "order", slug, title, content, excerpt, status, published_at, created_at, updated_at, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(
      id, data.volume_id, data.order, data.slug, data.title, data.content, data.excerpt ?? null, data.status, data.published_at ?? null, now, now
    );
    return { ...data, id, created_at: now, updated_at: now, view_count: 0, fts: null };
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

  create(data: Omit<User, "id" | "created_at" | "updated_at">): User {
    const id = uid("u");
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.email, data.password_hash, data.name ?? null, data.role, now, now
    );
    return { ...data, id, created_at: now, updated_at: now };
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
  }
};

// ============ Reset (dev only) ============
export function resetAllData(): void {
  db.exec(`
    DELETE FROM media_usages;
    DELETE FROM media_items;
    DELETE FROM pages;
    DELETE FROM chapters;
    DELETE FROM novel_volumes;
    DELETE FROM novels;
    DELETE FROM videos;
    DELETE FROM video_series;
    DELETE FROM posts;
    DELETE FROM socials;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM site_config;
  `);
}