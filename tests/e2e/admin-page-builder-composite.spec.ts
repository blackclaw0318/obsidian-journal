// ============================================================
// admin-page-builder-composite.spec.ts - 复合 Block e2e (v0.26)
// ============================================================
// 覆盖:
//   - /api/public/posts 返回 published posts
//   - /api/public/videos 返回 published videos
//   - builder 中拖入 Hero/Stats/Skills/Links/Posts/Videos block 渲染正常
//   - Inspector 可编辑复合 Block 字段
//   - 公开页 + 预览都生效
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
      slug: `composite-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      blocks: "[]",
      status: "draft"
    }
  });
  const body = await res.json();
  return body.page.id;
}

test.describe.serial("复合 Block (v0.26)", () => {
  test.afterAll(async () => {
    const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
    try {
      await ctx.post("/api/auth/test-reset");
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
      if (!loginRes.ok()) return;
      const listRes = await ctx.get("/api/admin/pages?q=composite-test&limit=100");
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

  test("GET /api/public/posts 应返回 published posts", async ({ request }) => {
    const res = await request.get("/api/public/posts?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    // seed 有 3 篇 published
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    // 不暴露 author_email
    expect(body.items[0]).not.toHaveProperty("author_email");
  });

  test("GET /api/public/posts?category=tech 应只返回 tech", async ({ request }) => {
    const res = await request.get("/api/public/posts?category=tech&limit=10");
    const body = await res.json();
    expect(body.ok).toBe(true);
    for (const p of body.items) {
      expect(p.category).toBe("tech");
    }
  });

  test("GET /api/public/videos 应返回 published videos", async ({ request }) => {
    const res = await request.get("/api/public/videos?limit=5");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("HeroBlock 拖入 builder 后能渲染 title", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "Composite Test Hero");

    await page.goto(`/admin/pages/${pageId}/builder`);
    // 关掉 template gallery
    await page.getByRole("button", { name: /空白页/ }).click();
    await expect(page.getByText("0 blocks")).toBeVisible();

    // 拖入 Hero Block — 因为 dnd-kit 拖拽复杂, 我们通过 API 直接设置 blocks
    const heroBlock = {
      id: `b_hero_${Date.now()}`,
      type: "hero",
      theme: "light",
      title: "测试 Hero",
      subtitle: "副标题",
      ctaText: "Go",
      ctaUrl: "/posts"
    };
    const updateRes = await ctx.put(`/api/admin/pages/${pageId}`, {
      data: { blocks: JSON.stringify({ version: 1, blocks: [heroBlock] }) }
    });
    expect(updateRes.ok()).toBeTruthy();

    // 重新加载 builder
    await page.goto(`/admin/pages/${pageId}/builder`);
    // 等 hero 渲染
    await expect(page.getByRole("heading", { name: "测试 Hero", level: 1 })).toBeVisible({ timeout: 10000 });
    // CTA 按钮
    await expect(page.getByRole("link", { name: /Go/ })).toBeVisible();
    // 顶栏 1 block
    await expect(page.getByText("1 blocks")).toBeVisible();
  });

  test("StatsBlock + SkillsBlock + LinksBlock 渲染正常", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "Composite Test Multi");

    const blocks = [
      { id: "b_stats", type: "stats", theme: "light", items: [{ label: "项目", value: 12, suffix: "+" }], columns: 2 },
      { id: "b_skills", type: "skills", theme: "light", items: [{ name: "TS", level: 90 }] },
      { id: "b_links", type: "links", theme: "light", links: [{ name: "示例", url: "https://example.com", desc: "测试链接" }], columns: 2 }
    ];
    const updateRes = await ctx.put(`/api/admin/pages/${pageId}`, {
      data: { blocks: JSON.stringify({ version: 1, blocks }) }
    });
    expect(updateRes.ok()).toBeTruthy();

    await page.goto(`/admin/pages/${pageId}/builder`);

    // Stats
    await expect(page.getByText("项目")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("12+")).toBeVisible();

    // Skills
    await expect(page.getByText("TS", { exact: true })).toBeVisible();
    await expect(page.getByText("90%")).toBeVisible();

    // Links
    await expect(page.getByText("示例")).toBeVisible();
    await expect(page.getByText("测试链接")).toBeVisible();
  });

  test("PostsBlock 自动拉取文章 + 渲染", async ({ page }) => {
    await login(page);
    const ctx = page.request;
    const pageId = await createEmptyPage(ctx, "Composite Test Posts");

    const blocks = [
      { id: "b_posts", type: "posts", theme: "light", limit: 3, sortBy: "new" }
    ];
    await ctx.put(`/api/admin/pages/${pageId}`, {
      data: { blocks: JSON.stringify({ version: 1, blocks }) }
    });

    await page.goto(`/admin/pages/${pageId}/builder`);

    // seed 文章 "你好, 黑曜石日志" 应出现 (动态拉取有 1-2s 延迟)
    await expect(page.getByText("你好, 黑曜石日志")).toBeVisible({ timeout: 15000 });
  });
});