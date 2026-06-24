import { describe, it, expect } from "vitest";
import {
  BLOCK_TYPES,
  ADVANCED_BLOCK_TYPES,
  REQUIRES_HTML_PERMISSION,
  type Block,
  type TextBlock,
  type CalloutBlock
} from "@/lib/blocks";

describe("Block 类型注册表", () => {
  it("应该恰好 13 种 Block", () => {
    expect(BLOCK_TYPES).toHaveLength(13);
  });

  it("advanced Block 应该包含 music 和 custom_html", () => {
    expect(ADVANCED_BLOCK_TYPES).toContain("music");
    expect(ADVANCED_BLOCK_TYPES).toContain("custom_html");
    expect(ADVANCED_BLOCK_TYPES).toHaveLength(2);
  });

  it("custom_html 应该需要 HTML 权限", () => {
    expect(REQUIRES_HTML_PERMISSION).toContain("custom_html");
  });
});

describe("Block 类型守卫", () => {
  it("TextBlock 应该能正常构造", () => {
    const block: TextBlock = {
      id: "test-1",
      type: "text",
      content: "# Hello\nWorld"
    };
    expect(block.type).toBe("text");
    expect(block.content).toContain("Hello");
  });

  it("CalloutBlock 应该支持 4 种 variant", () => {
    const variants: CalloutBlock["variant"][] = ["info", "warning", "success", "danger"];
    expect(variants).toHaveLength(4);
  });

  it("Block 联合类型应该覆盖所有 13 种", () => {
    const blocks: Block[] = [
      { id: "1", type: "text", content: "" },
      { id: "2", type: "heading", level: 1, text: "" },
      { id: "3", type: "image", src: "" },
      { id: "4", type: "video", src: "" },
      { id: "5", type: "gallery", images: [] },
      { id: "6", type: "quote", text: "" },
      { id: "7", type: "callout", variant: "info", content: "" },
      { id: "8", type: "code", language: "ts", code: "" },
      { id: "9", type: "divider" },
      { id: "10", type: "list", ordered: false, items: [] },
      { id: "11", type: "table", headers: [], rows: [] },
      { id: "12", type: "custom_html", html: "" },
      { id: "13", type: "music", src: "", advanced: true }
    ];
    expect(blocks).toHaveLength(13);
  });
});