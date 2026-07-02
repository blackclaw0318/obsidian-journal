// ============================================================
// admin-novels.spec.ts - Phase 3.3 Novel 三层 CRUD e2e (Playwright)
// 覆盖: novel 列表/创建/编辑/软删, volume 创建, chapter 创建/编辑
// P1-11 v0.24: 加 afterAll cleanup, 清理 e2e 测试创建的 novel/volume/chapter
// ============================================================
import { test, expect, request } from "@playwright/test";

const ADMIN_EMAIL = "admin@obsidian.local";
const ADMIN_PASSWORD = "admin123";

// seed novel 的 slug (cleanup 时排除)
const SEED_NOVEL_SLUGS = new Set(["meta-realm"]);

async function login(page: import("@playwright/test").Page) {
  await page.request.post("/api/auth/test-reset");
  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
  await page.getByLabel("密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Admin Novels CRUD (Phase 3.3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // P1-11 v0.24: e2e 结束后清理所有非 seed novel (级联清 volumes/chapters)
  // 软删后不再出现在默认 list, 不影响后续测试; global-setup 会在下次 suite 开始时 reset
  test.afterAll(async () => {
    const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
    try {
      await ctx.post("/api/auth/test-reset");
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
      if (!loginRes.ok()) return;

      // 拉所有 novel (含 archived)
      const listRes = await ctx.get("/api/admin/novels?limit=1000");
      if (!listRes.ok()) return;
      const body = await listRes.json();
      const novels: Array<{ id: string; slug: string }> = body.items ?? [];

      // 软删除所有非 seed novel (级联清 volumes + chapters via softDeleteWithChapters)
      // 注: novel API 是软删 (deleted_at), 但不会重复跑出错, global-setup reset 会清干净
      for (const n of novels) {
        if (!SEED_NOVEL_SLUGS.has(n.slug)) {
          await ctx.delete(`/api/admin/novels/${n.id}`);
        }
      }
    } catch {
      // cleanup 失败不影响测试结果
    } finally {
      await ctx.dispose();
    }
  });

  test("列表页应展示 seed 数据 + 新建按钮", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels");
    await expect(page.locator("h1")).toContainText("小说管理");
    await expect(page.getByRole("link", { name: "+ 新建小说" })).toBeVisible();
    // seed 有 1 本 (meta-realm)
    await expect(page.getByText("元界").first()).toBeVisible();
  });

  test("新建小说 → 进入详情页", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels/new");
    const title = `E2E 测试小说 ${Date.now()}`;
    await page.getByLabel("标题 *").fill(title);
    await expect(page.getByLabel(/Slug \*/)).not.toHaveValue("");
    await page.getByLabel("简介").fill("测试简介");
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/novels\/novel_/);
    await expect(page.locator("h1")).toContainText(title);
  });

  test("新建小说: slug 重复应报错", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels/new");
    await page.getByLabel("标题 *").fill("重复测试");
    await page.getByLabel(/Slug \*/).fill("meta-realm"); // seed 已有
    await page.getByRole("button", { name: "创建" }).click();
    await expect(page.getByText("slug 已存在")).toBeVisible({ timeout: 5000 });
  });

  test("详情页 inline 添加卷", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels");

    // 通过 slug "meta-realm" 找 seed novel, 避免 E2E 创建的新小说干扰
    await page.goto("/admin/novels?q=meta-realm");
    const novelHref = await page.evaluate(() => {
      const link = document.querySelector('table a[href*="/admin/novels/novel_"]');
      return link?.getAttribute("href") ?? null;
    });
    expect(novelHref).toMatch(/\/admin\/novels\/novel_/);
    await page.goto(novelHref!);
    await expect(page.locator("h1")).toContainText("元界");

    // 点击 + 添加卷
    await page.getByRole("button", { name: "+ 添加卷" }).click();
    const volTitle = `E2E 测试卷 ${Date.now()}`;
    await page.getByLabel("卷标题 *").fill(volTitle);
    await page.getByRole("button", { name: "创建卷" }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText(volTitle).first()).toBeVisible();
  });

  test("卷详情页 inline 添加章节 → 跳编辑页", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels?q=meta-realm");
    await page.waitForLoadState("networkidle");
    const novelHref = await page.evaluate(() => {
      const link = document.querySelector('table a[href*="/admin/novels/novel_"]');
      return link?.getAttribute("href") ?? null;
    });
    expect(novelHref).toMatch(/\/admin\/novels\/novel_/);
    await page.goto(novelHref!);
    await page.waitForLoadState("networkidle");

    // 从 novel 详情页拿第一个 volume 的 href
    const volHref = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/admin/novels/"][href*="/volumes/"]');
      return links[0]?.getAttribute("href") ?? null;
    });
    expect(volHref).toMatch(/\/admin\/novels\/novel_.+\/volumes\/vol_/);
    await page.goto(volHref!);
    await page.waitForLoadState("networkidle");

    // 添加章节
    await page.getByRole("button", { name: "+ 添加章节" }).click();
    const chTitle = `E2E 测试章节 ${Date.now()}`;
    await page.getByLabel("章节标题 *").fill(chTitle);
    await expect(page.getByLabel(/Slug \*/)).not.toHaveValue("");
    await page.getByRole("button", { name: "创建章节" }).click();
    await page.waitForURL(/\/admin\/novels\/novel_.+\/volumes\/vol_.+\/chapters\/ch_.+\/edit$/);
    await expect(page.getByLabel("章节标题 *")).toHaveValue(chTitle);
  });

  test("编辑章节 → 改状态为已发布", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels?q=meta-realm");
    await page.waitForLoadState("networkidle");
    const novelHref = await page.evaluate(() => {
      const link = document.querySelector('table a[href*="/admin/novels/novel_"]');
      return link?.getAttribute("href") ?? null;
    });
    expect(novelHref).toMatch(/\/admin\/novels\/novel_/);
    await page.goto(novelHref!);
    await page.waitForLoadState("networkidle");

    // novel 详情页: vol 表格里第一个 "管理章节" link (不含 /chapters/)
    const volHref = await page.evaluate(() => {
      const links = document.querySelectorAll('table a[href*="/volumes/"]');
      for (const a of Array.from(links)) {
        const href = a.getAttribute("href") ?? "";
        if (href.includes("/volumes/vol_") && !href.includes("/chapters/")) {
          return href;
        }
      }
      return null;
    });
    expect(volHref).toMatch(/\/admin\/novels\/novel_.+\/volumes\/vol_/);
    await page.goto(volHref!);
    await page.waitForLoadState("networkidle");

    // vol 详情页: chapter 表格里第一个 chapter edit link
    const chHref = await page.evaluate(() => {
      const link = document.querySelector('table a[href*="/chapters/ch_"][href$="/edit"]');
      return link?.getAttribute("href") ?? null;
    });
    expect(chHref).toMatch(/\/chapters\/ch_.+\/edit$/);
    await page.goto(chHref!);
    await page.waitForLoadState("networkidle");

    // 改状态: 勾选"已发布" checkbox (严守 v0.6.1 Chapter 用 published boolean, 无 status select)
    const checkbox = page.getByRole("checkbox");
    await checkbox.check();
    await page.getByRole("button", { name: "保存修改" }).click();
    await page.waitForTimeout(800);
    await expect(checkbox).toBeChecked();
  });

  test("软删小说 → 状态 archived → 恢复", async ({ page }) => {
    await login(page);
    await page.goto("/admin/novels/new");
    const title = `待删除测试 ${Date.now()}`;
    await page.getByLabel("标题 *").fill(title);
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/novels\/novel_/);
    // 回到列表 — 在 list 里点删除
    await page.goto("/admin/novels");
    const row = page.locator("tr", { hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "删除" }).click();
    // 等确认按钮渲染
    await expect(row.getByRole("button", { name: "确认删除" })).toBeVisible();
    await row.getByRole("button", { name: "确认删除" }).click();
    await page.waitForTimeout(1000);
    // 软删后默认 list 不显示, 用 ?status=archived 过滤查
    await page.goto("/admin/novels?status=archived");
    const archivedRow = page.locator("tr", { hasText: title });
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow.locator("td").nth(1)).toContainText("已归档");
    // 恢复
    await archivedRow.getByRole("button", { name: "恢复" }).click();
    await page.waitForTimeout(1000);
    // 恢复后回到默认 list (无 status filter)
    await page.goto("/admin/novels");
    const liveRow = page.locator("tr", { hasText: title });
    await expect(liveRow).toBeVisible();
    await expect(liveRow.locator("td").nth(1)).toContainText("连载中");
  });

  test("未登录访问应重定向到 login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/novels");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});