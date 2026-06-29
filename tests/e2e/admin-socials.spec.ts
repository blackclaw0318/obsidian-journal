// ============================================================
// 友链 Admin e2e (v0.11)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin 友链", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  });

  test("友链列表加载", async ({ page }) => {
    await page.goto("/admin/socials");
    await expect(page.locator("h1")).toContainText("友链");
  });

  test("新建友链 inline", async ({ page }) => {
    await page.goto("/admin/socials");
    await page.click('button:has-text("+ 新建友链")');
    await page.waitForTimeout(300);
    // 平台选 github (默认)
    await page.fill('input[required][maxlength="100"]', `E2E友链-${Date.now()}`);
    await page.fill('input[required][maxlength="500"]', "https://e2e-test.example.com");
    await page.click('button[type="submit"]:has-text("创建")');
    await page.waitForTimeout(800);
    // 应在表格里
    await expect(page.locator("text=e2e-test.example.com").first()).toBeVisible({ timeout: 5000 });
  });
});
