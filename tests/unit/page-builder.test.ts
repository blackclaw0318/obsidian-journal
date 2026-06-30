// ============================================================
// Page Builder 单测 (v0.14, v0.6.1 §21)
// 覆盖: serialize, palette
// ============================================================

import { describe, it, expect } from "vitest";
import { deserializePageContent, serializePageContent, cloneBlocks } from "@/lib/page-builder/serialize";
import { BLOCK_PALETTE, BASIC_PALETTE, groupByCategory, CATEGORY_LABELS } from "@/lib/page-builder/palette";
import type { Block, TextBlock, HeadingBlock } from "@/lib/blocks";

describe("page-builder/serialize", () => {
  it("空字符串 → 空数组", () => {
    expect(deserializePageContent("")).toEqual([]);
    expect(deserializePageContent(null)).toEqual([]);
    expect(deserializePageContent(undefined)).toEqual([]);
  });

  it("Block[] → JSON → Block[] 往返", () => {
    const blocks: Block[] = [
      { id: "b1", type: "text", content: "Hello", theme: "light" },
      { id: "b2", type: "heading", level: 2, text: "Title" }
    ];
    const json = serializePageContent(blocks);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.blocks).toHaveLength(2);
    const roundtrip = deserializePageContent(json);
    expect(roundtrip).toEqual(blocks);
  });

  it("非法 JSON 抛错", () => {
    expect(() => deserializePageContent("{not json")).toThrow();
  });

  it("非对象抛错", () => {
    expect(() => deserializePageContent("\"string\"")).toThrow("必须是对象");
    expect(() => deserializePageContent("123")).toThrow("必须是对象");
  });

  it("version !== 1 抛错", () => {
    expect(() => deserializePageContent('{"version":2,"blocks":[]}')).toThrow("version 必须是 1");
  });

  it("blocks 非数组抛错", () => {
    expect(() => deserializePageContent('{"version":1,"blocks":{}}')).toThrow("blocks 必须是数组");
  });

  it("block 缺 id/type 抛错", () => {
    expect(() => deserializePageContent('{"version":1,"blocks":[{"foo":"bar"}]}')).toThrow("缺少 id 或 type");
  });

  it("cloneBlocks 深拷贝 (改副本不影响原数组)", () => {
    const blocks: Block[] = [{ id: "b1", type: "text", content: "X", theme: "light" }];
    const clone = cloneBlocks(blocks);
    (clone[0] as TextBlock).content = "Y";
    expect((blocks[0] as TextBlock).content).toBe("X");
  });
});

describe("page-builder/palette", () => {
  it("BLOCK_PALETTE 13 种 (严守 v0.6.1 §21.2)", () => {
    expect(BLOCK_PALETTE).toHaveLength(13);
    const types = BLOCK_PALETTE.map((b) => b.type);
    expect(types).toContain("text");
    expect(types).toContain("heading");
    expect(types).toContain("image");
    expect(types).toContain("video");
    expect(types).toContain("gallery");
    expect(types).toContain("quote");
    expect(types).toContain("callout");
    expect(types).toContain("code");
    expect(types).toContain("divider");
    expect(types).toContain("list");
    expect(types).toContain("table");
    expect(types).toContain("custom_html");
    expect(types).toContain("music");
  });

  it("BASIC_PALETTE 排除 advanced (11 种)", () => {
    expect(BASIC_PALETTE).toHaveLength(11);
    expect(BASIC_PALETTE.find((b) => b.type === "custom_html")).toBeUndefined();
    expect(BASIC_PALETTE.find((b) => b.type === "music")).toBeUndefined();
  });

  it("custom_html 标记 locked", () => {
    const customHtml = BLOCK_PALETTE.find((b) => b.type === "custom_html");
    expect(customHtml?.locked).toBe(true);
    expect(customHtml?.advanced).toBe(true);
  });

  it("groupByCategory 4 个 category", () => {
    const groups = groupByCategory();
    expect(Object.keys(groups).sort()).toEqual(["advanced", "basic", "list", "typography"]);
  });

  it("CATEGORY_LABELS 4 个 label (中文)", () => {
    expect(CATEGORY_LABELS.basic).toBe("基础");
    expect(CATEGORY_LABELS.typography).toBe("排版");
    expect(CATEGORY_LABELS.list).toBe("列表");
    expect(CATEGORY_LABELS.advanced).toBe("高级 (默认折叠)");
  });
});
