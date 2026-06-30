// ============================================================
// Page Builder 序列化器 (v0.14, v0.6.1 §21.3 数据流)
// Block[] ↔ Page.content JSON 字符串
// ============================================================

import type { PageContent } from "./types";
import type { Block } from "@/lib/blocks";

/** JSON 字符串 → Block[] (解析失败抛错) */
export function deserializePageContent(json: string | null | undefined): Block[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Page.content 不是合法 JSON: ${(e as Error).message}`);
  }
  // 严格校验
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Page.content 必须是对象");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Page.content version 必须是 1, 实际 ${obj.version}`);
  }
  if (!Array.isArray(obj.blocks)) {
    throw new Error("Page.content.blocks 必须是数组");
  }
  // 轻校验: 每个 block 有 id + type
  for (const b of obj.blocks as Block[]) {
    if (!b || typeof b !== "object" || !("id" in b) || !("type" in b)) {
      throw new Error("block 缺少 id 或 type");
    }
  }
  return obj.blocks as Block[];
}

/** Block[] → JSON 字符串 */
export function serializePageContent(blocks: Block[]): string {
  const content: PageContent = { version: 1, blocks };
  return JSON.stringify(content);
}

/** 深拷贝 Block (避免 React state 引用共享) */
export function cloneBlocks(blocks: Block[]): Block[] {
  return JSON.parse(JSON.stringify(blocks)) as Block[];
}
