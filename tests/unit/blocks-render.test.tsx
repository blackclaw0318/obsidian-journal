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
  it("应支持 20 种 BlockType (13 基础 + 7 复合, v0.26)", () => {
    expect(BLOCK_TYPES).toHaveLength(20);
    expect(BLOCK_TYPES).toEqual(
      expect.arrayContaining([
        "text", "heading", "image", "video", "gallery", "quote", "callout", "code", "divider", "list", "table", "custom_html", "music",
        "hero", "stats", "skills", "timeline", "links", "posts", "videos"
      ])
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

// ============================================================
// v0.26 复合 Block 渲染测试 (v0.6.1 §21.2)
// ============================================================

describe("v0.26 复合 Block 渲染", () => {
  it("HeroBlock 渲染 title + subtitle + CTA", () => {
    const block: Block = { id: "h1", type: "hero", title: "黑曜石日志", subtitle: "用代码与数据说话", ctaText: "了解更多", ctaUrl: "/about" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.querySelector("h1")?.textContent).toContain("黑曜石日志");
    expect(container.textContent).toContain("用代码与数据说话");
    expect(container.querySelector("a")?.textContent).toContain("了解更多");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/about");
  });

  it("HeroBlock 无 ctaText 时不渲染按钮", () => {
    const block: Block = { id: "h1", type: "hero", title: "标题" };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("h1")?.textContent).toContain("标题");
  });

  it("StatsBlock 渲染数字网格 + suffix", () => {
    const block: Block = { id: "s1", type: "stats", items: [{ label: "项目", value: 12, suffix: "+" }, { label: "用户", value: 3500 }], columns: 2 };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("项目");
    expect(container.textContent).toContain("12+");
    expect(container.textContent).toContain("3500");
  });

  it("StatsBlock 空 items fallback", () => {
    const block: Block = { id: "s1", type: "stats", items: [] };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("空");
  });

  it("SkillsBlock 渲染进度条 (name + level)", () => {
    const block: Block = { id: "sk1", type: "skills", items: [{ name: "TypeScript", level: 90 }, { name: "React", level: 85 }] };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("TypeScript");
    expect(container.textContent).toContain("90%");
    // 进度条
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it("SkillsBlock level 越界自动裁剪 (0-100)", () => {
    const block: Block = { id: "sk1", type: "skills", items: [{ name: "X", level: 200 }] };
    const { container } = render(<BlockRenderer block={block} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute("style")).toContain("100%");
  });

  it("TimelineBlock 渲染日期 + 标题 + 内容", () => {
    const block: Block = { id: "tl1", type: "timeline", items: [{ date: "2026-01", title: "项目启动", content: "启动 v0.26" }] };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("2026-01");
    expect(container.textContent).toContain("项目启动");
    expect(container.textContent).toContain("启动 v0.26");
  });

  it("LinksBlock 渲染卡片 (name + url + desc)", () => {
    const block: Block = { id: "lk1", type: "links", links: [{ name: "示例", url: "https://example.com", desc: "简介" }] };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("示例");
    expect(container.textContent).toContain("https://example.com");
    expect(container.textContent).toContain("简介");
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("PostsBlock 渲染加载提示 (动态拉取, 初始 loading)", () => {
    const block: Block = { id: "p1", type: "posts", limit: 6 };
    const { container } = render(<BlockRenderer block={block} />);
    // useEffect 后会 setPosts, 初始是 loading
    expect(container.textContent).toContain("加载");
  });

  it("VideosBlock 渲染加载提示", () => {
    const block: Block = { id: "v1", type: "videos", limit: 6 };
    const { container } = render(<BlockRenderer block={block} />);
    expect(container.textContent).toContain("加载");
  });
});
