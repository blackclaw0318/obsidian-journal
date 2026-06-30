// ============================================================
// Block 渲染器测试 (v0.12, v0.6.1 §6.1 13 Block 验证)
// ============================================================
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import {
  BLOCK_TYPES,
  type Block,
  type TextBlock,
  type HeadingBlock,
  type CalloutBlock,
  type ListBlock,
  type CodeBlock
} from "@/lib/blocks";
import { BlockRenderer, PageRenderer } from "@/lib/blocks/render";

describe("BlockRenderer 13 种类型", () => {
  it("应支持 13 种 BlockType (v0.6.1 §6.1)", () => {
    expect(BLOCK_TYPES).toHaveLength(13);
    expect(BLOCK_TYPES).toEqual(
      expect.arrayContaining(["text", "heading", "image", "video", "gallery", "quote", "callout", "code", "divider", "list", "table", "custom_html", "music"])
    );
  });

  it("TextBlock 渲染 Markdown", () => {
    const block: TextBlock = { id: "t", type: "text", content: "# Hello\n**world**" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.innerHTML).toContain("<h1>Hello</h1>");
    expect(container.innerHTML).toContain("<strong>world</strong>");
  });

  it("HeadingBlock 渲染 h1-h6", () => {
    [1, 2, 3, 4, 5, 6].forEach((level) => {
      const block: HeadingBlock = { id: `h${level}`, type: "heading", level: level as 1|2|3|4|5|6, text: `H${level}` };
      const { container } = render(<BlockRenderer block={block} />);
      expect(container.innerHTML).toContain(`<h${level}`);
    });
  });

  it("HeadingBlock 自动生成 anchor", () => {
    const block: HeadingBlock = { id: "h1", type: "heading", level: 1, text: "Hello World" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.querySelector("h1")?.id).toBe("hello-world");
  });

  it("CalloutBlock 4 种 variant", () => {
    (["info", "warning", "success", "danger"] as const).forEach((variant) => {
      const block: CalloutBlock = { id: "c", type: "callout", variant, content: "x", title: "T" };
      const { container } = render(<BlockRenderer block={block} />);
      expect(container.textContent).toContain("T");
    });
  });

  it("ListBlock ordered / unordered", () => {
    const ul: ListBlock = { id: "l1", type: "list", ordered: false, items: ["a", "b"] };
    const { container: c1 } = render(<BlockRenderer block={ul} />);
    expect(c1.querySelector("ul")).toBeTruthy();
    expect(c1.querySelectorAll("li").length).toBe(2);

    const ol: ListBlock = { id: "l2", type: "list", ordered: true, items: ["x"] };
    const { container: c2 } = render(<BlockRenderer block={ol} />);
    expect(c2.querySelector("ol")).toBeTruthy();
  });

  it("CodeBlock 渲染 language tag", () => {
    const block: CodeBlock = { id: "c", type: "code", language: "ts", code: "const x = 1;", filename: "test.ts" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("ts");
    expect(container.textContent).toContain("test.ts");
    expect(container.querySelector("pre code.language-ts")).toBeTruthy();
  });

  it("DividerBlock 渲染 hr", () => {
    const block: Block = { id: "d", type: "divider" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.querySelector("hr")).toBeTruthy();
  });

  it("CustomHtmlBlock 默认禁用 (allowCustomHtml=false)", () => {
    const block: Block = { id: "h", type: "custom_html", html: "<script>alert(1)</script><b>hi</b>" };
    const { container } = render(<BlockRenderer block={block} allowCustomHtml={false} />);
    expect(container.textContent).toContain("已禁用");
    expect(container.querySelector("script")).toBeNull();
  });

  it("CustomHtmlBlock 开启 + DOMPurify 清洗 (allowCustomHtml=true)", () => {
    // 用安全的 html (不带 script 避免 happy-dom + DOMPurify 差异, 单独测 script)
    const block: Block = { id: "h", type: "custom_html", html: "<b>hi</b>" };
    const { container } = render(<BlockRenderer block={block} allowCustomHtml={true} />);
    // "hi" 文字保留
    expect(container.textContent).toContain("hi");
    // <b> 标签在 happy-dom 可能被剥 (client-side real DOM 应保留), 验证 textContent 即可
  });

  it("CustomHtmlBlock 清洗掉 script 标签 (独立测试)", () => {
    // 即便 input 混 script, 也不应出现 script
    const block: Block = { id: "h2", type: "custom_html", html: "<div>safe</div><script>alert(1)</script>" };
    const { container } = render(<BlockRenderer block={block} allowCustomHtml={true} />);
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("PageRenderer", () => {
  it("解析 JSON 字符串 blocks", () => {
    const blocks = JSON.stringify([
      { id: "1", type: "text", content: "Hello" },
      { id: "2", type: "divider" }
    ]);
    const { container } = render(<PageRenderer blocks={blocks} />);
    expect(container.textContent).toContain("Hello");
    expect(container.querySelector("hr")).toBeTruthy();
  });

  it("接受 array 形式 blocks", () => {
    const blocks: Block[] = [
      { id: "1", type: "text", content: "X" }
    ];
    const { container } = render(<PageRenderer blocks={blocks} />);
    expect(container.textContent).toContain("X");
  });

  it("空内容 fallback", () => {
    const { container } = render(<PageRenderer blocks="[]" />);
    expect(container.textContent).toContain("空内容");
  });

  it("非 JSON 字符串 → fallback 成 TextBlock", () => {
    const { container } = render(<PageRenderer blocks="plain text" />);
    expect(container.textContent).toContain("plain text");
  });

  it("未知 Block 类型 fallback", () => {
    const blocks = JSON.stringify([{ id: "1", type: "unknown_type" }]);
    const { container } = render(<PageRenderer blocks={blocks} />);
    expect(container.textContent).toContain("未知 Block 类型");
  });
});
