/**
 * strip-frontmatter.test.ts — v0.42 fix
 *
 * 验证 lib/utils.ts stripFrontmatter() 函数行为:
 * 1. 标准 YAML frontmatter 块正确剥离
 * 2. 没有 frontmatter 时原样返回
 * 3. 未闭合的 frontmatter 原样返回 (容错)
 * 4. 多次出现的 --- 不应误删
 * 5. 引用的真实场景: obsidian-journal 推送的 post 内容
 */

import { describe, it, expect } from "vitest";
import { stripFrontmatter } from "@/lib/utils";

describe("stripFrontmatter", () => {
  it("strips standard YAML frontmatter block", () => {
    const input = `---
title: "EP01 · 搬家日"
slug: yk-s01-ep01
category: life
tags: [YouKei, 缅因猫]
external_meta:
  source: yk-script-p9
  ep: 1
---

# EP01 · 搬家日

> 搬家日60平堆满纸箱,YouKei钻入最大箱子不出来
`;
    const result = stripFrontmatter(input);
    expect(result).toBe(`# EP01 · 搬家日

> 搬家日60平堆满纸箱,YouKei钻入最大箱子不出来
`);
  });

  it("returns input unchanged when no frontmatter", () => {
    const input = `# EP01 · 搬家日

> 搬家日60平堆满纸箱,YouKei钻入最大箱子不出来
`;
    expect(stripFrontmatter(input)).toBe(input);
  });

  it("returns input unchanged when frontmatter is unclosed", () => {
    const input = `---
title: "EP01 · 搬家日"
slug: yk-s01-ep01
category: life

# EP01 · 搬家日 (frontmatter 没闭合)
`;
    // 没有第二个 ---, 原样返回 (容错)
    expect(stripFrontmatter(input)).toBe(input);
  });

  it("preserves --- separators inside body content", () => {
    const input = `---
title: x
---

# Title

---

## Section 1
内容

---

## Section 2
`;
    const result = stripFrontmatter(input);
    // 正文里的 --- 必须保留
    expect(result).toContain("---");
    expect(result).toContain("## Section 1");
    expect(result).toContain("## Section 2");
    // frontmatter 里的 title 不应再出现
    expect(result).not.toContain("title: x");
  });

  it("handles frontmatter with extra whitespace", () => {
    const input = `---   
title: "x"   
---   

# Body`;
    const result = stripFrontmatter(input);
    expect(result.trim()).toBe("# Body");
  });

  it("handles empty string", () => {
    expect(stripFrontmatter("")).toBe("");
  });

  it("regression: obsidian-yk-script EP01 markdown (老板截图原 case)", () => {
    // 老板 2026-07-14 截图里的真实内容
    const ep01 = `---
title: "EP01 · 📦 搬家日"
slug: yk-s01-ep01
category: life
tags: [YouKei, 缅因猫, 上坤xYouKei, 季01-EP01, 单元剧]
external_meta:
  source: yk-script-p9
  ep: 1
  duration_s: 60
  shot_count: 7
---

# 📺 EP01 · 📦 搬家日

> 搬家日60平堆满纸箱,YouKei钻入最大箱子不出来

**时长**: 60s · **镜头**: 7 · **钩子**: 悬念钩

---

## 🎬 钩子 (0-3s)
`;
    const result = stripFrontmatter(ep01);
    // 关键: frontmatter 字段不应再出现在剥离后的正文
    expect(result).not.toContain('title: "EP01');
    expect(result).not.toContain("slug:");
    expect(result).not.toContain("external_meta:");
    expect(result).not.toContain("duration_s:");
    expect(result).not.toContain("shot_count:");
    // 但正文部分必须完整保留
    expect(result).toContain("# 📺 EP01 · 📦 搬家日");
    expect(result).toContain("> 搬家日60平堆满纸箱");
    expect(result).toContain("**时长**: 60s");
    expect(result).toContain("## 🎬 钩子");
  });
});