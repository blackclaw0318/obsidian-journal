// ============================================================
// Page Builder 内部类型 (v0.14, v0.6.1 §21)
// lib/blocks/index.ts 已有 13 种 Block 基础类型, 这里用别名
// ============================================================

import type { Block, BlockType } from "@/lib/blocks";

/** Page.content 序列化格式: { version, blocks: Block[] } */
export interface PageContent {
  version: 1;
  blocks: Block[];
}

/** BlockPalette 展示用描述 */
export interface BlockPaletteItem {
  type: BlockType;
  label: string;
  description: string;
  category: "basic" | "typography" | "list" | "advanced";
  advanced?: boolean;
  locked?: boolean; // 需 SiteConfig.allowCustomHtml 才解锁
}

/** PageBuilder 状态 */
export interface PageBuilderState {
  blocks: Block[];
  selectedId: string | null;
  dirty: boolean;
}

export type PageBuilderAction =
  | { type: "load"; blocks: Block[] }
  | { type: "add"; block: Block; atIndex?: number }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; patch: Partial<Block> }
  | { type: "reorder"; fromId: string; toId: string }
  | { type: "select"; id: string | null }
  | { type: "markClean" };
