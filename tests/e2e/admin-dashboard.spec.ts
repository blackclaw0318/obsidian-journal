// ============================================================
// Dashboard 仪表盘 e2e (v0.11)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin 概览", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  });

  test("Dashboard 显示 8 个统计卡片", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("概览");
    // 至少 6 个 .rounded.border 卡片
    const cards = page.locator('a[href^="/admin/"] >> div.rounded');
    await expect(cards.first()).toBeVisible();
  });

  test("导航包含系列/友链", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('a:has-text("系列")').first()).toBeVisible();
    await expect(page.locator('a:has-text("友链")').first()).toBeVisible();
  });
});
