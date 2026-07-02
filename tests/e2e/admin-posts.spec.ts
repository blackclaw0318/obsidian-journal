// ============================================================
// admin-posts.spec.ts - Phase 3.2 帖子 CRUD e2e (Playwright)
// 覆盖: 列表 / 新建 / 编辑 / 删除 / 筛选 / 搜索
// P1-11 v0.24: 加 afterAll cleanup, 清理 e2e 测试创建的帖子
// ============================================================
import { test, expect, request } from "@playwright/test";

const ADMIN_EMAIL = "admin@obsidian.local";
const ADMIN_PASSWORD = "admin123";

// seed 帖子的 slug (cleanup 时排除)
const SEED_POST_SLUGS = new Set(["hello-obsidian", "deploy-mode-3-tiers", "testing-strategy"]);

async function login(page: import("@playwright/test").Page) {
  await page.request.post("/api/auth/test-reset");
  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
  await page.getByLabel("密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Admin Posts CRUD (Phase 3.2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // P1-11 v0.24: e2e 结束后清理所有非 seed 帖子 (包括 draft/published/archived)
  // 防止重复跑 e2e 时数据库积累垃圾; 不影响 global-setup 的 reset (那是在 suite 开始时)
  test.afterAll(async () => {
    const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
    try {
      // 登录
      await ctx.post("/api/auth/test-reset");
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
      if (!loginRes.ok()) return; // 登录失败就不清理 (dev server 异常)

      // 拉所有帖子 (含 archived)
      const listRes = await ctx.get("/api/admin/posts?limit=1000");
      if (!listRes.ok()) return;
      const body = await listRes.json();
      const posts: Array<{ id: string; slug: string }> = body.items ?? [];

      // 硬删除所有非 seed 帖子
      for (const p of posts) {
        if (!SEED_POST_SLUGS.has(p.slug)) {
          await ctx.delete(`/api/admin/posts/${p.id}`);
        }
      }
    } catch {
      // cleanup 失败不影响测试结果 (test.afterAll 错误仅警告)
    } finally {
      await ctx.dispose();
    }
  });

  test("列表页应展示 seed 数据 + 新建按钮", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts");
    await expect(page.locator("h1")).toContainText("帖子管理");
    await expect(page.getByRole("link", { name: "+ 新建帖子" })).toBeVisible();
    // seed 数据: 3 篇 published
    await expect(page.getByText("你好, 黑曜石日志").first()).toBeVisible();
  });

  test("新建: 填表 → 提交 → 列表出现", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts/new");

    const uniqueTitle = `E2E 测试新帖 ${Date.now()}`;
    // 输入标题触发 slug 自动生成
    await page.getByLabel("标题 *").fill(uniqueTitle);
    // 等 slug 自动填
    await expect(page.getByLabel(/Slug \*/)).not.toHaveValue("");
    // 内容
    await page.getByLabel(/正文 \*/).fill("# Hello\n\n这是 e2e 测试内容。");
    // 分类留 tech (默认)
    // 立即发布
    await page.getByLabel("立即发布").check();
    await page.getByRole("button", { name: "创建" }).click();

    // 跳回列表
    await page.waitForURL(/\/admin\/posts$/);
    // 新帖出现在列表
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();
    // 状态徽章: 找这行的状态 badge (在 td 内, 不是 select option)
    const newRow = page.locator("tr", { hasText: uniqueTitle });
    await expect(newRow.locator("td").nth(2)).toContainText("已发布");
  });

  test("编辑: 修改标题 + 保存 → 列表刷新", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts");
    // 找一篇 seed 帖, 点编辑
    const firstEditLink = page.getByRole("link", { name: "编辑" }).first();
    await firstEditLink.click();
    await page.waitForURL(/\/admin\/posts\/.+\/edit$/);

    // 改标题
    const titleInput = page.getByLabel("标题 *");
    const newTitle = `已修改的标题 (e2e) ${Date.now()}`;
    await titleInput.fill(newTitle);
    await page.getByRole("button", { name: "保存修改" }).click();

    await page.waitForURL(/\/admin\/posts$/);
    await expect(page.getByText(newTitle).first()).toBeVisible();
  });

  test("筛选: 按 status=draft 应只显示草稿", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts");
    // 先创建一篇 draft (不勾立即发布)
    await page.goto("/admin/posts/new");
    const draftTitle = `草稿测试帖 ${Date.now()}`;
    await page.getByLabel("标题 *").fill(draftTitle);
    await page.getByLabel(/正文 \*/).fill("草稿内容");
    // 不勾选发布 → 保持 draft
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/posts$/);

    // 回到列表筛 draft
    await page.goto("/admin/posts?status=draft");
    await expect(page.getByText(draftTitle).first()).toBeVisible();
  });

  test("搜索: q=Hello 应只显示匹配的", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts?q=Hello");
    // seed 中有 "你好, 黑曜石日志" 包含 "Hello"
    await expect(page.getByText("你好, 黑曜石日志").first()).toBeVisible();
  });

  test("删除: 软删除 → 状态变 archived → 可恢复", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts");

    // 创建一篇待删
    await page.goto("/admin/posts/new");
    const delTitle = `待删除测试帖 ${Date.now()}`;
    await page.getByLabel("标题 *").fill(delTitle);
    await page.getByLabel(/正文 \*/).fill("内容");
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/posts$/);

    // 找到这行, 点删除
    const row = page.locator("tr", { hasText: delTitle });
    await row.getByRole("button", { name: "删除" }).click();
    // 确认
    await row.getByRole("button", { name: "确认删除" }).click();

    // 等列表刷新
    await page.waitForTimeout(800);

    // 状态变 archived (默认 status 筛选 published 看不到, 需切到 archived)
    await page.goto("/admin/posts?status=archived");
    await expect(page.getByText(delTitle).first()).toBeVisible();
    const archivedRow = page.locator("tr", { hasText: delTitle });
    await expect(archivedRow.locator("td").nth(2)).toContainText("已归档");

    // 恢复
    await archivedRow.getByRole("button", { name: "恢复" }).click();
    await page.waitForTimeout(800);
    // 切到 draft 看
    await page.goto("/admin/posts?status=draft");
    await expect(page.getByText(delTitle).first()).toBeVisible();
  });

  test("slug 重复应提示错误", async ({ page }) => {
    await login(page);
    await page.goto("/admin/posts/new");
    const unique = `重复 slug 测试 ${Date.now()}`;
    await page.getByLabel("标题 *").fill(unique);
    // 手动指定 seed 已用 slug
    await page.getByLabel(/Slug \*/).fill("hello-obsidian");
    await page.getByLabel(/正文 \*/).fill("x");
    await page.getByRole("button", { name: "创建" }).click();
    await expect(page.getByText("slug 已存在")).toBeVisible({ timeout: 5000 });
  });

  test("未登录访问应重定向到 login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});