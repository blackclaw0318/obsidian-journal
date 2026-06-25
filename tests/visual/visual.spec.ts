// ============================================================
// visual.spec.ts — Phase 2.5 Q15 视觉回归
// 严守 v0.5 决策: 像素差 ≤ 2% (maxDiffPixelRatio: 0.02)
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Q15 视觉回归 (≤ 2% 像素差)", () => {
  test("首页截图 (亮色主题 baseline)", async ({ page }) => {
    // 确保亮色 (Q5 主题切换 v0.6.1)
    await page.addInitScript(() => {
      localStorage.setItem("obsidian-theme", "light");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-light.png", {
      maxDiffPixelRatio: 0.02, // Q15 决策: ≤ 2%
      fullPage: false
    });
  });

  test("首页截图 (暗色主题 baseline)", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("obsidian-theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-dark.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: false
    });
  });

  test("文章列表页 (/posts) baseline", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("posts-list.png", {
      maxDiffPixelRatio: 0.02
    });
  });

  test("文章详情页 (/posts/hello-obsidian) baseline", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("post-detail.png", {
      maxDiffPixelRatio: 0.02
    });
  });
});
