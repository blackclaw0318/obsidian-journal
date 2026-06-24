// ============================================================
// obsidian-journal 数据模型 TypeScript Types (14 model, v0.3)
// 基于 node:sqlite, 配合 lib/db.ts
// ============================================================

export type PostStatus = "draft" | "published" | "archived";
export type PostCategory = "tech" | "life";
export type NovelStatus = "ongoing" | "completed" | "hiatus";
export type VideoStatus = "draft" | "published";
export type PageStatus = "draft" | "published";
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
}

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
  published_at: number | null;
  created_at: number;
  updated_at: number;
  view_count: number;
  fts: string | null;
}

export interface PostWithAuthor extends Post {
  author: { name: string | null; email: string };
}

export interface Novel {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  status: NovelStatus;
  created_at: number;
  updated_at: number;
}

export interface NovelVolume {
  id: string;
  novel_id: string;
  order: number;
  title: string;
  description: string | null;
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
  status: PageStatus;
  published_at: number | null;
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
  series_id: string | null;
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