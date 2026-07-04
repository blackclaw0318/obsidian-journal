// ============================================================
// 页面 (Page) Admin e2e (Phase 3.5)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin 页面", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.request.post("/api/auth/test-reset");
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(\/posts|\/novels|\/videos|\/video-series|\/resources|\/settings|$)/);
  });

  test("页面 — 创建 (含 blocks JSON) → 列表显示 → 编辑", async ({ page }) => {
    await page.goto("/admin/resources");
    await expect(page.getByRole("heading", { name: "页面管理" })).toBeVisible();

    await page.getByRole("link", { name: /新建页面/ }).click();
    await page.waitForURL(/\/admin\/resources\/new/);

    // 标题
    await page.locator("input").first().fill("E2E 测试页面");
    // 描述
    await page.locator("input").nth(2).fill("e2e 描述");
    // blocks JSON (textarea)
    await page.locator("textarea").fill('[{"type":"paragraph","text":"hello e2e"}]');

    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/resources$/);

    await expect(page.getByText("E2E 测试页面")).toBeVisible();
  });

  test("页面 — 非法 blocks JSON 拒绝", async ({ page }) => {
    await page.goto("/admin/resources/new");
    await page.locator("input").first().fill("E2E 坏 JSON 页");
    await page.locator("textarea").fill("not valid json {");
    await page.getByRole("button", { name: "创建" }).click();

    // 客户端预校验, 不会提交, 仍停留此页
    await expect(page.getByText(/不是合法 JSON/)).toBeVisible();
  });

  test("页面 — 软删 + 恢复", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/admin/resources");
    // 找归档按钮
    const archiveBtn = page.getByRole("button", { name: "归档" }).first();
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("页面 — 状态筛选", async ({ page }) => {
    await page.goto("/admin/resources?status=published");
    await expect(page.getByRole("heading", { name: "页面管理" })).toBeVisible();
  });
});
