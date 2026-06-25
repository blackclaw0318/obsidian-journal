// ============================================================
// search.spec.ts — Phase 2.2 FTS5 搜索 e2e
// 严守 v0.6.1: 搜索仅作用于 published posts
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Phase 2.2 FTS5 搜索 (v0.6.1 schema)", () => {
  test("/posts 默认不显示搜索框的 q 提示", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.locator('input[name="q"]')).toBeVisible();
  });

  test("/posts?q=hello 应该进入搜索模式", async ({ page }) => {
    await page.goto("/posts?q=hello");
    await expect(page.locator("h1")).toContainText("🔍 搜索: hello");
  });

  test("/posts?q= 应该匹配 seed 中的文章", async ({ page }) => {
    // seed 第一篇是 "Hello, Obsidian" (slug: hello-obsidian, content 含 "hello" / "obsidian")
    await page.goto("/posts?q=obsidian");
    await expect(page.locator("h1")).toContainText("🔍 搜索: obsidian");
    // 至少 1 个 article 元素
    const articles = await page.locator("article").count();
    expect(articles).toBeGreaterThanOrEqual(1);
  });

  test("/posts?q= 不存在关键词应该显示未找到", async ({ page }) => {
    await page.goto("/posts?q=xyznonexistent999");
    await expect(page.locator("text=未找到")).toBeVisible();
  });

  test("/posts 搜索框提交后 URL 包含 q= 参数", async ({ page }) => {
    await page.goto("/posts");
    await page.locator('input[name="q"]').fill("tech");
    // Enter 提交 (避免 button click timing)
    await page.locator('input[name="q"]').press("Enter");
    await page.waitForURL(/\?/);
    await expect(page).toHaveURL(/[?&]q=tech/);
  });

  test("/admin/reindex POST 应该返回 ok=true (Phase 3.1 需登录)", async ({ page }) => {
    // 登录拿 cookie
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });

    // 用 page.request 共享 cookie
    const res = await page.request.post("/admin/reindex");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBeGreaterThan(0);
  });

  test("/admin/reindex GET 应该返回 usage 提示 (Phase 3.1 需登录)", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });

    const res = await page.request.get("/admin/reindex");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.usage).toContain("POST");
  });
});
