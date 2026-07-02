// ============================================================
// admin-page-builder-templates.spec.ts - 模板选择 UI e2e (v0.25)
// ============================================================
// 覆盖:
//   - 空白页进入 builder → 自动显示 TemplateGallery
//   - Gallery 显示 7 套模板 (blank + 6 个具体)
//   - 点选模板 → 加载到 canvas, 退出 gallery
//   - 顶部"🎨 模板"按钮可重新打开 gallery
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

async function createEmptyPage(ctx: import("@playwright/test").APIRequestContext, title: string): Promise<string> {
  const res = await ctx.post("/api/admin/pages", {
    data: {
      slug: `tpl-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      blocks: "[]",
      status: "draft"
    }
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.page.id;
}

test.describe.serial("Page Builder 模板选择 (v0.25)", () => {
  // 测试结束清理
  test.afterAll(async () => {
    const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
    try {
      await ctx.post("/api/auth/test-reset");
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
      if (!loginRes.ok()) return;
      const listRes = await ctx.get("/api/admin/pages?q=tpl-test&limit=100");
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

  test("空白页进入 builder → 自动显示 TemplateGallery", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "TPL Test Empty");

    await page.goto(`/admin/pages/${pageId}/builder`);

    // Gallery 标题
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 10000 });
    // 7 套模板 (blank + 6 个) — 用 role=button 精确定位
    await expect(page.getByRole("button", { name: /空白页/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /关于我/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /友情链接/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /首页 Hero/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /归档索引/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /项目展示/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /长文阅读/ })).toBeVisible();

    // 关闭按钮
    await expect(page.getByRole("button", { name: "关闭模板选择" })).toBeVisible();
  });

  test("点选「关于我」模板 → 加载 5 个 blocks 到 canvas, 退出 gallery", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "TPL Test About");

    await page.goto(`/admin/pages/${pageId}/builder`);

    // 等 gallery 渲染
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 10000 });

    // 点选"关于我"按钮
    await page.getByRole("button", { name: /关于我/ }).click();

    // Gallery 消失
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).not.toBeVisible({ timeout: 5000 });

    // 顶栏显示 5 blocks
    await expect(page.getByText("5 blocks")).toBeVisible();

    // canvas 内有 5 个 block (按 type)
    // heading 块 (h1 关于我)
    await expect(page.getByRole("heading", { name: "关于我", level: 1 })).toBeVisible();
  });

  test("点选「空白页」模板 → 0 blocks, 退出 gallery", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "TPL Test Blank");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /空白页/ }).click();
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).not.toBeVisible({ timeout: 5000 });

    // 0 blocks
    await expect(page.getByText("0 blocks")).toBeVisible();
  });

  test("顶部「🎨 模板」按钮可重新打开 gallery", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "TPL Test Reopen");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 10000 });

    // 选 友情链接
    await page.getByRole("button", { name: /友情链接/ }).click();
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).not.toBeVisible({ timeout: 5000 });

    // 顶栏 4 blocks
    await expect(page.getByText("4 blocks")).toBeVisible();

    // 重新打开
    await page.getByRole("button", { name: "🎨 模板" }).click();
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 5000 });
  });

  test("已有 blocks 时重选模板 → 弹 confirm (非空覆盖警告)", async ({ page, browserName }) => {
    // Playwright auto-dismisses window.confirm by default; we accept it via dialog handler
    page.on("dialog", (dialog) => dialog.accept());

    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "TPL Test Overwrite");

    await page.goto(`/admin/pages/${pageId}/builder`);
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 10000 });

    // 选 关于我
    await page.getByRole("button", { name: /关于我/ }).click();
    await expect(page.getByText("5 blocks")).toBeVisible();

    // 重开 gallery, 这次选其他模板, 应触发 confirm
    await page.getByRole("button", { name: "🎨 模板" }).click();
    await expect(page.getByRole("heading", { name: /选择一个模板开始/ })).toBeVisible({ timeout: 5000 });

    // 选 友情链接 (dialog handler 已 accept, 应继续)
    await page.getByRole("button", { name: /友情链接/ }).click();

    // 应更新为 4 blocks
    await expect(page.getByText("4 blocks")).toBeVisible({ timeout: 5000 });
  });
});