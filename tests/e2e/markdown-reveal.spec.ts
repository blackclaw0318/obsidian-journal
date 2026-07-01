// ============================================================
// markdown-reveal.spec.ts - MarkdownReveal 渐入动画 e2e (v0.21 P1-8)
// 测: 文章详情 / 章节详情的 block 元素在视口内 opacity:0 → 1
// ============================================================
import { test, expect } from "@playwright/test";

test.describe("MarkdownReveal 视口渐入 (P1-8)", () => {
  test("/posts/[slug] markdown block 进入视口后 opacity 变 1", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");

    // 等文章渲染 + hydration
    await expect(page.locator("article > header h1")).toBeVisible({ timeout: 10000 });

    // 滚到中段, 让 markdown block 进入视口
    const article = page.locator("article");
    await article.scrollIntoViewIfNeeded();

    // 找 markdown 容器内第一个 p (在 RevealOnScroll 包裹内)
    const firstP = article.locator(".prose > p").first();
    await firstP.scrollIntoViewIfNeeded();

    // 等动画完成 (stagger 上限 ~200ms + duration 0.5s + 余量)
    await page.waitForTimeout(1500);

    // 验证: 进入视口后的 block opacity 已是 1 (或 inline style 已被清掉)
    const opacity = await firstP.evaluate((el) => (el as HTMLElement).style.opacity);
    const transform = await firstP.evaluate((el) => (el as HTMLElement).style.transform);
    expect(opacity).toBe("1");
    // 浏览器会把 translateY(0) 规范化为 translateY(0px), 仅验证归零
    expect(transform).toMatch(/translateY\(0(px)?\)/);
  });

  test("/posts/[slug] 离视口的 block 仍不可见", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    await expect(page.locator("article > header h1")).toBeVisible({ timeout: 10000 });

    // 不滚动, 视口外的 block 应保持 opacity:0
    const article = page.locator("article");
    await article.scrollIntoViewIfNeeded();

    // 找一个可能在视口下方的 block (文章有 8+ 段)
    const allP = article.locator(".prose > p");
    const count = await allP.count();
    if (count < 3) {
      test.skip();
      return;
    }
    // 取最后一个 p, 应该还在视口外
    const lastP = allP.nth(count - 1);
    // 不滚到那里, 直接看 opacity
    const opacity = await lastP.evaluate((el) => (el as HTMLElement).style.opacity);
    // 视口外的应该是 0 (未触发)
    expect(opacity).toBe("0");
  });

  test("/chapters/[slug] 章节详情也启用渐入", async ({ page }) => {
    // 走 meta-realm 第一章
    await page.goto("/novels/meta-realm");
    const chLink = page.locator("a[href^='/chapters/']").first();
    const chCount = await chLink.count();
    if (chCount === 0) {
      test.skip();
      return;
    }
    await chLink.click();
    await expect(page.locator("article")).toBeVisible();

    // 滚到第一个段落并等动画
    const firstP = page.locator("article .prose > p").first();
    await firstP.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);

    const opacity = await firstP.evaluate((el) => (el as HTMLElement).style.opacity);
    expect(opacity).toBe("1");
  });

  test("reduced motion 用户不挂动画 (直接显示)", async ({ browser }) => {
    // 创建带 reduced-motion 的 context
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/posts/hello-obsidian");
    await expect(page.locator("article > header h1")).toBeVisible({ timeout: 10000 });

    const firstP = page.locator("article .prose > p").first();
    await page.waitForTimeout(300);

    // reduced motion: 不挂 opacity:0, 直接可见
    const opacity = await firstP.evaluate((el) => (el as HTMLElement).style.opacity);
    expect(opacity).toBe(""); // 空, 没设过 style

    await ctx.close();
  });
});