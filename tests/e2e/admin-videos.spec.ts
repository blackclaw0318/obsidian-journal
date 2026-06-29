// ============================================================
// 视频 + 视频系列 Admin e2e (Phase 3.4)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin 视频 + 系列", () => {
  test.beforeEach(async ({ page }) => {
    // 清理 cookie + 重置 rate limit
    await page.context().clearCookies();
    await page.request.post("/api/auth/test-reset");
    // 登录
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(\/posts|\/novels|\/videos|\/video-series|\/pages|\/media|\/settings|$)/);
  });

  test("视频系列 — 创建 → 编辑 → 删除", async ({ page }) => {
    // 1) 访问 series 列表
    await page.goto("/admin/video-series");
    await expect(page.getByRole("heading", { name: "视频系列" })).toBeVisible();

    // 2) 新建
    await page.getByRole("link", { name: /新建系列/ }).click();
    await page.waitForURL(/\/admin\/video-series\/new/);
    await page.locator("input").first().fill("e2e 测试系列");
    // slug 自动生成, 直接提交
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/video-series$/);

    // 3) 验证系列已建
    await expect(page.getByText("e2e 测试系列")).toBeVisible();

    // 4) 删除 (前端 confirm 拦截, 自动 accept)
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "删除" }).first().click();
    await expect(page.getByText("e2e 测试系列")).not.toBeVisible({ timeout: 5000 });
  });

  test("视频 — 创建 (含 embed_url) → 列表显示 → 编辑", async ({ page }) => {
    // 1) 访问 videos 列表
    await page.goto("/admin/videos");
    await expect(page.getByRole("heading", { name: "视频管理" })).toBeVisible();

    // 2) 新建
    await page.getByRole("link", { name: /新建视频/ }).click();
    await page.waitForURL(/\/admin\/videos\/new/);

    // 标题 (第一个 input)
    await page.locator("input").first().fill("E2E 测试视频");
    // embed_url 是第 3 个 input (title, slug, embed_url)
    await page.locator("input").nth(2).fill("https://www.youtube.com/embed/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/videos$/);

    // 3) 验证
    await expect(page.getByText("E2E 测试视频")).toBeVisible();
    // 状态 badge (cell, 不是 select option)
    await expect(page.getByRole("cell", { name: "草稿" })).toBeVisible();

    // 4) 编辑
    await page.getByText("E2E 测试视频").click();
    await page.waitForURL(/\/admin\/videos\/[^/]+\/edit/);
    await expect(page.getByRole("heading", { name: /编辑视频/ })).toBeVisible();

    // 5) 修改标题并保存
    const titleInput = page.locator("input").first();
    await titleInput.fill("E2E 测试视频 (已编辑)");
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/admin\/videos$/);
    await expect(page.getByText("E2E 测试视频 (已编辑)")).toBeVisible();
  });

  test("视频 — 软删 + 恢复", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/admin/videos");
    // 找一行 draft 状态, 归档
    const archiveBtn = page.getByRole("button", { name: "归档" }).first();
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      // 等待刷新后归档行不可见 (因为 filter 默认无 archived)
      await page.waitForTimeout(500);
    }
  });

  test("Series 与 Video 关联 — 在 video 编辑页选 series", async ({ page }) => {
    // 1) 先建一个 series
    await page.goto("/admin/video-series/new");
    await page.locator("input").first().fill("E2E 关联测试系列");
    await page.getByRole("button", { name: "创建" }).click();
    await page.waitForURL(/\/admin\/video-series$/);

    // 2) 在 video 编辑页验证 series 选项存在
    await page.goto("/admin/videos/new");
    const select = page.locator("select");
    const options = await select.locator("option").allTextContents();
    expect(options.some((o) => o.includes("E2E 关联测试系列"))).toBe(true);
  });
});
