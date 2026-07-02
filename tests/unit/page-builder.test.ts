// ============================================================
// Page Builder 单测 (v0.14, v0.6.1 §21)
// 覆盖: serialize, palette
// ============================================================

import { describe, it, expect } from "vitest";
import { deserializePageContent, serializePageContent, cloneBlocks } from "@/lib/page-builder/serialize";
import { BLOCK_PALETTE, BASIC_PALETTE, groupByCategory, CATEGORY_LABELS } from "@/lib/page-builder/palette";
import { TEMPLATES, getTemplate, findTemplate } from "@/lib/page-builder/templates";
import { createHistory, pushHistory, undoStep, redoStep, resetHistory, MAX_HISTORY } from "@/lib/page-builder/history";
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
  it("BLOCK_PALETTE 20 种 (13 基础 + 7 复合, v0.26)", () => {
    expect(BLOCK_PALETTE).toHaveLength(20);
    const types = BLOCK_PALETTE.map((b) => b.type);
    // 13 基础
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
    // 7 复合 (v0.26, v0.6.1 §21.2)
    expect(types).toContain("hero");
    expect(types).toContain("stats");
    expect(types).toContain("skills");
    expect(types).toContain("timeline");
    expect(types).toContain("links");
    expect(types).toContain("posts");
    expect(types).toContain("videos");
  });

  it("BASIC_PALETTE 排除 advanced (18 种含复合)", () => {
    expect(BASIC_PALETTE).toHaveLength(18);
    expect(BASIC_PALETTE.find((b) => b.type === "custom_html")).toBeUndefined();
    expect(BASIC_PALETTE.find((b) => b.type === "music")).toBeUndefined();
    // 复合都包含在 BASIC_PALETTE 里 (默认可见)
    expect(BASIC_PALETTE.find((b) => b.type === "hero")).toBeDefined();
    expect(BASIC_PALETTE.find((b) => b.type === "posts")).toBeDefined();
  });

  it("7 复合 Block 都在 composite category", () => {
    const composites = BLOCK_PALETTE.filter((b) => b.category === "composite");
    expect(composites).toHaveLength(7);
    expect(composites.map((b) => b.type).sort()).toEqual(["hero", "links", "posts", "skills", "stats", "timeline", "videos"]);
  });

  it("custom_html 标记 locked", () => {
    const customHtml = BLOCK_PALETTE.find((b) => b.type === "custom_html");
    expect(customHtml?.locked).toBe(true);
    expect(customHtml?.advanced).toBe(true);
  });

  it("groupByCategory 5 个 category (含 composite)", () => {
    const groups = groupByCategory();
    expect(Object.keys(groups).sort()).toEqual(["advanced", "basic", "composite", "list", "typography"]);
  });

  it("CATEGORY_LABELS 5 个 label (含 composite)", () => {
    expect(CATEGORY_LABELS.basic).toBe("基础");
    expect(CATEGORY_LABELS.typography).toBe("排版");
    expect(CATEGORY_LABELS.list).toBe("列表");
    expect(CATEGORY_LABELS.advanced).toBe("高级 (默认折叠)");
    expect(CATEGORY_LABELS.composite).toBe("复合 (一键组合)");
  });
});

// ============================================================
// templates (v0.25, v0.6.1 §21.4 模板化 v1)
// ============================================================

describe("page-builder/templates", () => {
  it("应提供 7 套预设模板 + 1 套空白 = 8 项 (v0.26)", () => {
    expect(TEMPLATES).toHaveLength(8);
  });

  it("必须包含 blank + 6 个具体场景 (about/links/home/archive/project/reading/showcase)", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(ids).toContain("blank");
    expect(ids).toContain("about");
    expect(ids).toContain("links");
    expect(ids).toContain("home");
    expect(ids).toContain("archive");
    expect(ids).toContain("project");
    expect(ids).toContain("reading");
    expect(ids).toContain("showcase"); // v0.26 新增
  });

  it("showcase 模板使用复合 Block (Hero/Stats/Skills/Timeline/Posts)", () => {
    const showcase = findTemplate("showcase");
    expect(showcase).toBeTruthy();
    const types = showcase!.blocks.map((b) => b.type);
    expect(types).toContain("hero");
    expect(types).toContain("stats");
    expect(types).toContain("skills");
    expect(types).toContain("timeline");
    expect(types).toContain("posts");
  });

  it("每套模板都有 name + description + icon + blockCount", () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.name.length).toBeGreaterThan(0);
      expect(tpl.description.length).toBeGreaterThan(0);
      expect(tpl.icon.length).toBeGreaterThan(0);
      expect(tpl.blockCount).toBe(tpl.blocks.length);
    }
  });

  it("block 数量应在 0-7 区间 (可控复杂度)", () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.blockCount).toBeGreaterThanOrEqual(0);
      expect(tpl.blockCount).toBeLessThanOrEqual(7);
    }
  });

  it("每个 block 都有 id (tpl_ 前缀避免与 createBlock 的 b_ 冲突) + type (20 种之一)", () => {
    const validTypes = new Set([
      // 13 基础
      "text", "heading", "image", "video", "gallery", "quote", "callout",
      "code", "divider", "list", "table", "custom_html", "music",
      // 7 复合 (v0.26)
      "hero", "stats", "skills", "timeline", "links", "posts", "videos"
    ]);
    for (const tpl of TEMPLATES) {
      for (const b of tpl.blocks) {
        expect(b.id).toMatch(/^tpl_[a-z]+_\d+$/);
        expect(validTypes.has(b.type)).toBe(true);
      }
    }
  });

  it("blank 模板 blocks 为空", () => {
    const blank = findTemplate("blank");
    expect(blank?.blocks).toHaveLength(0);
  });

  it("getTemplate 返回深拷贝 (避免引用共享)", () => {
    const a = getTemplate("about");
    const b = getTemplate("about");
    expect(a).not.toBe(b);
    expect(a!.blocks).not.toBe(b!.blocks);
    // 改 a 不影响 b
    if (a!.blocks[0] && b!.blocks[0]) {
      (a!.blocks[0] as any).text = "改改改";
      expect((b!.blocks[0] as any).text).not.toBe("改改改");
    }
  });

  it("getTemplate 查不到时返回 null", () => {
    expect(getTemplate("nonexistent")).toBeNull();
    expect(findTemplate("nonexistent")).toBeNull();
  });

  it("所有模板 blocks 能通过 serialize 往返 (结构合法)", () => {
    for (const tpl of TEMPLATES) {
      const json = serializePageContent(tpl.blocks);
      const roundtrip = deserializePageContent(json);
      expect(roundtrip).toHaveLength(tpl.blocks.length);
      // 内部 id/type 保持
      for (let i = 0; i < tpl.blocks.length; i++) {
        expect(roundtrip[i].id).toBe(tpl.blocks[i].id);
        expect(roundtrip[i].type).toBe(tpl.blocks[i].type);
      }
    }
  });
});

// ============================================================
// history (v0.27, P2-15 撤销/重做)
// ============================================================

describe("page-builder/history", () => {
  // 工具: 创建 N 个测试 block
  function mkBlock(i: number): Block {
    return { id: `b${i}`, type: "text", theme: "light", content: `block ${i}` };
  }

  it("createHistory 初始 past/future 都为空", () => {
    const h = createHistory();
    expect(h.past).toEqual([]);
    expect(h.future).toEqual([]);
  });

  it("pushHistory 把当前 blocks 推入 past, 清空 future", () => {
    let h = createHistory();
    const blocks1 = [mkBlock(1)];
    h = pushHistory(h, blocks1);
    expect(h.past).toHaveLength(1);
    expect(h.past[0]).toBe(blocks1);
    expect(h.future).toEqual([]);
  });

  it("pushHistory 多次累积 past", () => {
    let h = createHistory();
    for (let i = 1; i <= 5; i++) {
      h = pushHistory(h, [mkBlock(i)]);
    }
    expect(h.past).toHaveLength(5);
    // 最后 push 的是 i=5
    expect((h.past[4][0] as TextBlock).content).toBe("block 5");
  });

  it("pushHistory 清空 future (新操作后不能重做)", () => {
    let h = createHistory();
    h = pushHistory(h, [mkBlock(1)]);
    // 模拟 undo
    let r = undoStep(h, [mkBlock(2)]);
    h = r.history;
    expect(h.future).toHaveLength(1);
    // 新操作
    h = pushHistory(h, [mkBlock(3)]);
    expect(h.future).toEqual([]);
  });

  it("undoStep 从 past 取出上一个, 当前进 future", () => {
    let h = createHistory();
    h = pushHistory(h, [mkBlock(1)]);
    h = pushHistory(h, [mkBlock(2)]);
    // 模拟当前 blocks 是 block 3
    const r = undoStep(h, [mkBlock(3)]);
    expect(r.blocks).not.toBeNull();
    expect((r.blocks![0] as TextBlock).content).toBe("block 2");
    expect(r.history.past).toHaveLength(1);
    expect(r.history.future).toHaveLength(1);
  });

  it("undoStep 无历史时返回 null", () => {
    const h = createHistory();
    const r = undoStep(h, [mkBlock(1)]);
    expect(r.blocks).toBeNull();
    expect(r.history).toBe(h); // 无变化
  });

  it("redoStep 从 future 取出下一个, 当前进 past", () => {
    let h = createHistory();
    h = pushHistory(h, [mkBlock(1)]);
    h = pushHistory(h, [mkBlock(2)]);
    // 先 undo
    let r = undoStep(h, [mkBlock(3)]);
    h = r.history;
    expect(h.future).toHaveLength(1);
    expect(h.past).toHaveLength(1);
    // 再 redo (当前 blocks 是 undo 返回的 b2)
    r = redoStep(h, [mkBlock(2)]);
    expect(r.blocks).not.toBeNull();
    expect((r.blocks![0] as TextBlock).content).toBe("block 3");
    expect(r.history.past).toHaveLength(2); // 1(b1) + 1(undo 返回的 b2)
    expect(r.history.future).toEqual([]);
  });

  it("redoStep 无重做时返回 null", () => {
    const h = createHistory();
    const r = redoStep(h, [mkBlock(1)]);
    expect(r.blocks).toBeNull();
    expect(r.history).toBe(h);
  });

  it("undo + redo 往返后状态应恢复", () => {
    let h = createHistory();
    h = pushHistory(h, [mkBlock(1)]);
    h = pushHistory(h, [mkBlock(2)]);
    const original = [mkBlock(3)];
    let r = undoStep(h, original); // undo: 返回 block 2
    expect((r.blocks![0] as TextBlock).content).toBe("block 2");
    r = redoStep(r.history, r.blocks!); // redo: 返回 original (block 3)
    expect((r.blocks![0] as TextBlock).content).toBe("block 3");
  });

  it("MAX_HISTORY 限制 50 步 (超出后丢弃最老的)", () => {
    let h = createHistory();
    for (let i = 1; i <= MAX_HISTORY + 5; i++) {
      h = pushHistory(h, [mkBlock(i)]);
    }
    expect(h.past).toHaveLength(MAX_HISTORY);
    // 最早的几个被丢弃, 第一项应是 block 6 (i=1~5 被丢)
    expect((h.past[0][0] as TextBlock).content).toBe("block 6");
    // 最后一项应是 block (MAX_HISTORY + 5)
    expect((h.past[MAX_HISTORY - 1][0] as TextBlock).content).toBe(`block ${MAX_HISTORY + 5}`);
  });

  it("resetHistory 清空所有历史", () => {
    let h = createHistory();
    h = pushHistory(h, [mkBlock(1)]);
    h = pushHistory(h, [mkBlock(2)]);
    h = resetHistory();
    expect(h.past).toEqual([]);
    expect(h.future).toEqual([]);
  });
});
