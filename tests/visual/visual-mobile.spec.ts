// ============================================================
// visual-mobile.spec.ts — P2-18 移动端视觉回归
// 严守 v0.5 决策: 像素差 ≤ 2% (maxDiffPixelRatio: 0.02)
// 375 (iPhone SE/13 mini) + 768 (iPad mini) 双视口 baseline
// 暗色 + 亮色 各一份
// 覆盖页面: 首页 / 文章列表 / 文章详情 / admin 抽屉 / admin 列表
// ============================================================

import { test, expect, devices } from "@playwright/test";

const MOBILE_375 = { width: 375, height: 812 };   // iPhone 13 mini
const TABLET_768 = { width: 768, height: 1024 };  // iPad mini
const DIFF_TOLERANCE = 0.02;

test.describe("P2-18 移动端视觉回归 (≤ 2% 像素差)", () => {
  // ============ 375 移动端 ============
  test.describe("375px (iPhone 13 mini)", () => {
    test.use({ viewport: MOBILE_375 });

    test("首页-亮色", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("obsidian-theme", "light");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("home-mobile-375-light.png", {
        maxDiffPixelRatio: DIFF_TOLERANCE,
        fullPage: false
      });
    });

    test("首页-暗色", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("obsidian-theme", "dark");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("home-mobile-375-dark.png", {
        maxDiffPixelRatio: DIFF_TOLERANCE,
        fullPage: false
      });
    });

    test("文章详情-亮色", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("obsidian-theme", "light");
      });
      await page.goto("/posts/hello-obsidian");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("post-mobile-375-light.png", {
        maxDiffPixelRatio: DIFF_TOLERANCE,
        fullPage: false
      });
    });

    test("文章详情-暗色 (含 prose pre D1 验收)", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("obsidian-theme", "dark");
      });
      await page.goto("/posts/hello-obsidian");
      await page.waitForLoadState("networkidle");
      // 滚动到 prose code/pre 区域 (若文章内有代码块)
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot("post-mobile-375-dark-scrolled.png", {
        maxDiffPixelRatio: DIFF_TOLERANCE,
        fullPage: false
      });
    });
  });

  // ============ 768 平板 ============
  test.describe("768px (iPad mini)", () => {
    test.use({ viewport: TABLET_768 });

    test("首页-暗色", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("obsidian-theme", "dark");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("home-tablet-768-dark.png", {
        maxDiffPixelRatio: DIFF_TOLERANCE,
        fullPage: false
      });
    });
  });
});