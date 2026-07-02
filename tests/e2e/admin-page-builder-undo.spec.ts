// ============================================================
// admin-page-builder-undo.spec.ts - 撤销/重做 e2e (v0.27, P2-15)
// ============================================================
// 覆盖:
//   - 顶栏撤销/重做按钮显示 + 初始 disabled
//   - 通过 Inspector 修改文本触发 history push → 撤销按钮启用
//   - 点击 ↶ 撤销 (canvas 回到原值)
//   - 点击 ↷ 重做 (canvas 恢复)
//   - 键盘快捷键 Cmd+Z / Cmd+Shift+Z 生效
//   - 在 INPUT/TEXTAREA 里按 Cmd+Z 不触发 undo (用户编辑文本)
// ============================================================

import { test, expect, request } from "@playwright/test";

const ADMIN_EMAIL = "admin@obsidian.local";
const ADMIN_PASSWORD = "admin123";

async function login(page: import("@playwright/test").Page) {
  await page.request.post("/api/auth/test-reset");
  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
  await page.getByLabel("密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin$/);
}

async function createPageWithBlock(ctx: import("@playwright/test").APIRequestContext, title: string, text: string): Promise<string> {
  const res = await ctx.post("/api/admin/pages", {
    data: {
      slug: `undo-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      blocks: JSON.stringify({
        version: 1,
        blocks: [{ id: "b_h1", type: "heading", theme: "light", level: 1, text }]
      }),
      status: "draft"
    }
  });
  const body = await res.json();
  return body.page.id;
}

test.describe.serial("撤销/重做 (v0.27 P2-15)", () => {
  test.afterAll(async () => {
    const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
    try {
      await ctx.post("/api/auth/test-reset");
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
      if (!loginRes.ok()) return;
      const listRes = await ctx.get("/api/admin/pages?q=undo-test&limit=100");
      if (!listRes.ok()) return;
      const body = await listRes.json();
      for (const p of body.items ?? []) {
        await ctx.delete(`/api/admin/pages/${p.id}`);
      }
    } catch {
      // silent
    } finally {
      await ctx.dispose();
    }
  });

  test("初始状态: 撤销/重做按钮都 disabled (load 不入历史)", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createPageWithBlock(ctx, "Undo Test Initial", "Initial Heading");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByText("1 blocks")).toBeVisible({ timeout: 10000 });

    const undoBtn = page.getByRole("button", { name: "撤销" });
    const redoBtn = page.getByRole("button", { name: "重做" });
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();
  });

  test("Inspector 修改文本 → undo 按钮启用 → 点击撤销恢复原值", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createPageWithBlock(ctx, "Undo Test Inspector", "Original");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByText("1 blocks")).toBeVisible({ timeout: 10000 });

    // 点击 heading block 选中
    await page.locator("h1", { hasText: "Original" }).click({ force: true });

    // Inspector 显示
    const headingTextInput = page.getByLabel("标题文字");
    await expect(headingTextInput).toBeVisible({ timeout: 5000 });
    await expect(headingTextInput).toHaveValue("Original");

    // 修改文本 → 触发 update() → 入 history
    await headingTextInput.fill("Modified");
    await headingTextInput.blur();

    // canvas 显示新值
    await expect(page.getByRole("heading", { name: "Modified", level: 1 })).toBeVisible({ timeout: 3000 });

    // undo 按钮启用
    const undoBtn = page.getByRole("button", { name: "撤销" });
    await expect(undoBtn).toBeEnabled();

    // 点击撤销
    await undoBtn.click();

    // canvas 恢复原值
    await expect(page.getByRole("heading", { name: "Original", level: 1 })).toBeVisible({ timeout: 3000 });

    // redo 按钮启用
    const redoBtn = page.getByRole("button", { name: "重做" });
    await expect(redoBtn).toBeEnabled();

    // 点击重做
    await redoBtn.click();
    await expect(page.getByRole("heading", { name: "Modified", level: 1 })).toBeVisible({ timeout: 3000 });
  });

  test("键盘快捷键 Cmd/Ctrl+Z 触发 undo", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createPageWithBlock(ctx, "Undo Test Keyboard", "Kbd");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByText("1 blocks")).toBeVisible({ timeout: 10000 });

    // 先点 heading, 在右栏改 text
    await page.locator("h1", { hasText: "Kbd" }).click({ force: true });
    const headingTextInput = page.getByLabel("标题文字");
    await expect(headingTextInput).toBeVisible({ timeout: 5000 });
    await headingTextInput.fill("Via Keyboard");
    await headingTextInput.blur();

    // 验证已修改
    await expect(page.getByRole("heading", { name: "Via Keyboard", level: 1 })).toBeVisible({ timeout: 3000 });

    // 点 canvas 中心区域 (focus 离开 input, 让 keyboard 事件触发 page builder 的 handler)
    await page.locator(".flex.h-\\[calc\\(100vh-180px\\)\\]").first().click({ position: { x: 500, y: 100 } });

    const isMac = process.platform === "darwin";
    const modKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modKey}+KeyZ`);

    // 撤销后应恢复 "Kbd"
    await expect(page.getByRole("heading", { name: "Kbd", level: 1 })).toBeVisible({ timeout: 3000 });
  });

  test("在 INPUT 里按 Cmd+Z 不触发 Page Builder undo (保留浏览器原生行为)", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createPageWithBlock(ctx, "Undo Test Input", "Input Test");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByText("1 blocks")).toBeVisible({ timeout: 10000 });

    // 点 heading 进入 Inspector
    await page.locator("h1", { hasText: "Input Test" }).click({ force: true });
    const headingTextInput = page.getByLabel("标题文字");
    await expect(headingTextInput).toBeVisible({ timeout: 5000 });

    // focus 在 INPUT 上
    await headingTextInput.focus();
    await headingTextInput.fill("AAA");

    // 按 Cmd+Z — 应触发浏览器原生 undo (不触发 Page Builder)
    const isMac = process.platform === "darwin";
    const modKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modKey}+KeyZ`);

    // 不会出现 Page Builder 的 "↶ 撤销" 提示
    await expect(page.getByText("↶ 撤销")).not.toBeVisible({ timeout: 1000 });
  });

  test("连续多次修改 → 多次撤销 → past 栈深度正确", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createPageWithBlock(ctx, "Undo Test Multi", "V1");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByText("1 blocks")).toBeVisible({ timeout: 10000 });

    // 改 3 次
    for (const text of ["V2", "V3", "V4"]) {
      await page.locator("h1", { hasText: /V\d/ }).click({ force: true });
      const input = page.getByLabel("标题文字");
      await expect(input).toBeVisible({ timeout: 5000 });
      await input.fill(text);
      await input.blur();
      await expect(page.getByRole("heading", { name: text, level: 1 })).toBeVisible({ timeout: 3000 });
    }

    // 当前是 V4, undo 3 次应回到 V1
    const undoBtn = page.getByRole("button", { name: "撤销" });
    await undoBtn.click();
    await expect(page.getByRole("heading", { name: "V3", level: 1 })).toBeVisible({ timeout: 3000 });
    await undoBtn.click();
    await expect(page.getByRole("heading", { name: "V2", level: 1 })).toBeVisible({ timeout: 3000 });
    await undoBtn.click();
    await expect(page.getByRole("heading", { name: "V1", level: 1 })).toBeVisible({ timeout: 3000 });
  });
});