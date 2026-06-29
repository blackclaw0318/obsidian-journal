// ============================================================
// 系列 Admin e2e (v0.11)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin 系列", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    // 登录
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  });

  test("列表页加载", async ({ page }) => {
    await page.goto("/admin/series");
    await expect(page.locator("h1")).toContainText("系列管理");
  });

  test("新建系列", async ({ page }) => {
    await page.goto("/admin/series/new");
    const slug = `e2e-series-${Date.now()}`;
    await page.fill('input[required][maxlength="200"]:nth-of-type(1)', "E2E 测试系列");
    await page.fill('input[pattern="[a-z0-9-]+"]', slug);
    await page.selectOption('select', "tech");
    await page.fill('textarea', "这是 e2e 描述");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/series$/, { timeout: 10000 });
    await expect(page.locator(`text=${slug}`)).toBeVisible({ timeout: 5000 });
  });

  test("Dashboard 显示系列统计", async ({ page }) => {
    await page.goto("/admin");
    // 验证 StatCard 跳到 /admin/series
    await expect(page.locator('a[href="/admin/series"]').first()).toBeVisible();
  });
});
