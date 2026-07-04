// ============================================================
// obsidian-journal 数据模型 TypeScript Types (14 model, v0.3)
// 基于 node:sqlite, 配合 lib/db.ts
// ============================================================

export type PostStatus = "draft" | "published" | "archived";
export type PostCategory = "tech" | "life";
// 严守 v0.6.1 DESIGN §6: NovelStatus 3 值 (ongoing|completed|hiatus), 软删走 deleted_at 字段
export type NovelStatus = "ongoing" | "completed" | "hiatus";
// VideoStatus 3 值 (与 PostStatus/PageStatus 一致), 软删走 status='archived'
export type VideoStatus = "draft" | "published" | "archived";
// PageStatus 3 值 (与 PostStatus 一致), 软删走 status='archived' (无 deleted_at 字段, 沿用 posts 模式)
export type PageStatus = "draft" | "published" | "archived";
export type Theme = "light" | "dark" | "auto";
export type MediaStorage = "local" | "r2";
export type RefType = "post" | "chapter" | "page" | "video";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type UserRole = "admin" | "user";

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  status: PostStatus;
  category: PostCategory;
  tags: string | null;
  author_id: string;
  series_id?: string | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  view_count: number;
  fts: string | null;
}

export interface PostWithAuthor extends Post {
  author: { name: string | null; email: string };
}

export interface PostWithSeries extends PostWithAuthor {
  series: Series | null;
}

export interface Series {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  category: PostCategory;
  order: number;
  created_at: number;
  updated_at: number;
}

export interface SeriesWithCount extends Series {
  post_count: number;
}

export interface DailyStat {
  id: string;
  date: string;        // 'YYYY-MM-DD'
  pv: number;
  uv: number;
  post_views: number;
  new_comments: number;
  created_at: number;
}

export interface Novel {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  status: NovelStatus;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface NovelVolume {
  id: string;
  novel_id: string;
  order: number;
  title: string;
  description: string | null;
  deleted_at: number | null;
  created_at: number;
}

export interface Chapter {
  id: string;
  volume_id: string;
  order: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  // 严守 v0.6.1 DESIGN §6: Chapter 用 published Boolean, 无 status 字段
  published: boolean;
  published_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
  view_count: number;
  fts: string | null;
}

export interface VideoSeries {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  order: number;
  created_at: number;
}

export interface Video {
  id: string;
  series_id?: string | null;
  slug: string;
  title: string;
  description: string | null;
  embed_url: string;
  cover_image: string | null;
  duration: number | null;
  status: VideoStatus;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  view_count: number;
}

export type MediaCategory = "image" | "document" | "audio";

export interface MediaItem {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  url: string;
  storage_type: MediaStorage;
  category: MediaCategory;       // v0.34: image | document | audio
  is_paid: boolean;              // v0.34: 默认 false, v0.35 付费预留
  uploaded_at: number;
}

export interface MediaUsage {
  id: string;
  media_id: string;
  ref_type: RefType;
  ref_id: string;
  field: string | null;
  created_at: number;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  blocks: string; // JSON string of Block[]
  status: PageStatus;
  author_id: string;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  view_count: number;
  fts: string | null;
}

export interface SiteConfig {
  id: string;
  site_name: string;
  site_tagline: string;
  site_description: string | null;
  site_keywords: string | null;
  default_theme: Theme;
  allow_custom_html: 0 | 1;
  baidu_push_enabled: 0 | 1;
  baidu_push_token: string | null;
  og_image: string | null;
  favicon: string | null;
  analytics: string | null;
  avatar_url: string | null;
  updated_at: number;
}

export interface Social {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
  visible: 0 | 1;
  created_at: number;
}