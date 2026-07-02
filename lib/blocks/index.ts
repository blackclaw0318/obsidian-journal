// ============================================================
// Block 类型注册表 (v0.3 13 Block, v0.6 Phase 1 实现版)
// ============================================================

export type BlockTheme = "light" | "dark" | "auto";

export interface BlockBase {
  id: string;
  type: BlockType;
  theme?: BlockTheme;
  className?: string;
}

// 复用 lib/types 已定义的 PostCategory (保持单一来源)
import type { PostCategory } from "../types";

export type BlockType =
  // 基础
  | "text"
  | "heading"
  | "image"
  | "video"
  | "gallery"
  // 排版
  | "quote"
  | "callout"
  | "code"
  | "divider"
  // 列表
  | "list"
  | "table"
  // 高级 (默认折叠)
  | "custom_html"
  | "music"
  // 复合 (v0.26, v0.6.1 §21.2) — 自动拉取/聚合数据的高级 Block
  | "hero"
  | "stats"
  | "skills"
  | "timeline"
  | "links"
  | "posts"
  | "videos";

export interface TextBlock extends BlockBase {
  type: "text";
  content: string; // Markdown
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  anchor?: string;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
}

export interface VideoBlock extends BlockBase {
  type: "video";
  src: string; // /media/xxx.mp4 或 CDN
  poster?: string;
  caption?: string;
}

export interface GalleryBlock extends BlockBase {
  type: "gallery";
  images: Array<{ src: string; alt?: string; caption?: string }>;
  columns?: 2 | 3 | 4;
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  text: string;
  cite?: string;
}

export type CalloutVariant = "info" | "warning" | "success" | "danger";

export interface CalloutBlock extends BlockBase {
  type: "callout";
  variant: CalloutVariant;
  title?: string;
  content: string; // Markdown
}

export interface CodeBlock extends BlockBase {
  type: "code";
  language: string;
  code: string;
  filename?: string;
}

export interface DividerBlock extends BlockBase {
  type: "divider";
}

export interface ListBlock extends BlockBase {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface TableBlock extends BlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface CustomHtmlBlock extends BlockBase {
  type: "custom_html";
  html: string; // DOMPurify 兜底
  // v0.3 §14.1: 即使 enabled, 仍 DOMPurify 清洗, 默认禁用
}

export interface MusicBlock extends BlockBase {
  type: "music";
  src: string;
  title?: string;
  artist?: string;
  advanced: true; // 标记反人类, 默认折叠
}

// ============================================================
// 复合 Block (v0.26, v0.6.1 §21.2)
// ============================================================
// 7 种复合 Block: Hero/Stats/Skills/Timeline/Links/Posts/Videos
// 不同于基础 Block, 复合 Block 通常需要:
//   1. 静态字段 (用户在 Inspector 里填)
//   2. 动态数据 (Hero CTA 跳转 / Stats 数字 / Posts 自动拉文章列表)
// 严守 DESIGN.md: 用 flat 字段 (与现有 13 种一致, 不引入嵌套 data)
// ============================================================

export interface HeroBlock extends BlockBase {
  type: "hero";
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  bgImage?: string; // 可选背景图
}

export interface StatItem {
  label: string;
  value: number;
  suffix?: string; // "%", "+", "K" 等
}

export interface StatsBlock extends BlockBase {
  type: "stats";
  items: StatItem[];
  columns?: 2 | 3 | 4; // 网格列数, 默认 4
}

export interface SkillItem {
  name: string;
  level: number; // 0-100
}

export interface SkillsBlock extends BlockBase {
  type: "skills";
  items: SkillItem[];
}

export interface TimelineItem {
  date: string;
  title: string;
  content?: string;
}

export interface TimelineBlock extends BlockBase {
  type: "timeline";
  items: TimelineItem[];
}

export interface LinkItem {
  name: string;
  url: string;
  desc?: string;
  icon?: string; // lucide 图标名
}

export interface LinksBlock extends BlockBase {
  type: "links";
  links: LinkItem[];
  columns?: 2 | 3;
}

export interface PostsBlock extends BlockBase {
  type: "posts";
  category?: PostCategory; // 不填则全部
  limit?: number; // 默认 6
  sortBy?: "new" | "hot"; // 默认 new (按 published_at)
}

export interface VideosBlock extends BlockBase {
  type: "videos";
  limit?: number; // 默认 6
}

export type Block =
  | TextBlock
  | HeadingBlock
  | ImageBlock
  | VideoBlock
  | GalleryBlock
  | QuoteBlock
  | CalloutBlock
  | CodeBlock
  | DividerBlock
  | ListBlock
  | TableBlock
  | CustomHtmlBlock
  | MusicBlock
  | HeroBlock
  | StatsBlock
  | SkillsBlock
  | TimelineBlock
  | LinksBlock
  | PostsBlock
  | VideosBlock;

export const BLOCK_TYPES: BlockType[] = [
  "text",
  "heading",
  "image",
  "video",
  "gallery",
  "quote",
  "callout",
  "code",
  "divider",
  "list",
  "table",
  "custom_html",
  "music",
  "hero",
  "stats",
  "skills",
  "timeline",
  "links",
  "posts",
  "videos"
];

// advanced (默认折叠): music + custom_html
export const ADVANCED_BLOCK_TYPES: BlockType[] = ["music", "custom_html"];

// 复合 Block (单独分组 category=composite, 用户拖拽时分类清晰)
export const COMPOSITE_BLOCK_TYPES: BlockType[] = [
  "hero",
  "stats",
  "skills",
  "timeline",
  "links",
  "posts",
  "videos"
];

// 不允许自定义 HTML 的 Block (除非 SiteConfig.allowCustomHtml = true)
export const REQUIRES_HTML_PERMISSION: BlockType[] = ["custom_html"];