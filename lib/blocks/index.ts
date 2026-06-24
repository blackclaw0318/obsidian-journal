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
  | "music";

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
  | MusicBlock;

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
  "music"
];

// advanced (默认折叠): music + custom_html
export const ADVANCED_BLOCK_TYPES: BlockType[] = ["music", "custom_html"];

// 不允许自定义 HTML 的 Block (除非 SiteConfig.allowCustomHtml = true)
export const REQUIRES_HTML_PERMISSION: BlockType[] = ["custom_html"];