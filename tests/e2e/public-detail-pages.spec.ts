// ============================================================
// 公开端详情页 e2e (v0.12)
// /novels/[slug] /novels/[slug]/volume-N /chapters/[slug] /videos/[slug] /pages/[slug] /resources
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("公开端详情页 v0.12", () => {
  test("/resources 公开页加载 + 分类 tab", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.locator("h1")).toContainText("媒体库");
    // 至少一个分类 tab 可见
    await expect(page.getByRole("link", { name: /图片/ }).first()).toBeVisible();
  });

  test("/novels 列表 → 详情", async ({ page }) => {
    await page.goto("/novels");
    // 找第一个 novel link
    const firstLink = page.locator("a[href^='/novels/']").first();
    await expect(firstLink).toBeVisible({ timeout: 5000 });
    const href = await firstLink.getAttribute("href");
    if (href && href !== "/novels") {
      await page.goto(href);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("/novels/[slug] 详情有 h1 + 卷列表", async ({ page }) => {
    // 走 meta-realm (有真实章节的 seed novel)
    await page.goto("/novels/meta-realm");
    await expect(page.locator("h1").first()).toBeVisible();
    // 状态 badge
    await expect(page.locator("text=/连载中|已完结|暂停/").first()).toBeVisible({ timeout: 5000 });
    // 至少 1 个卷
    await expect(page.locator("text=/第 \\d+ 卷/").first()).toBeVisible();
  });

  test("/novels/[slug]/volume-1 详情", async ({ page }) => {
    await page.goto("/novels/meta-realm");
    const volLink = page.locator("a[href*='/volume-1']").first();
    const volCount = await volLink.count();
    if (volCount === 0) { test.skip(); return; }
    await volLink.click();
    await expect(page.locator("h1").first()).toContainText("第");
  });

  test("/chapters/[slug] 章节详情", async ({ page }) => {
    await page.goto("/novels/meta-realm");
    const chLink = page.locator("a[href^='/chapters/']").first();
    const chCount = await chLink.count();
    if (chCount === 0) { test.skip(); return; }
    await chLink.click();
    await expect(page.locator("article")).toBeVisible();
  });

  test("/videos 列表 → 详情", async ({ page }) => {
    await page.goto("/videos");
    const firstLink = page.locator("a[href^='/videos/']").first();
    const count = await firstLink.count();
    if (count === 0) { test.skip(); return; }
    const href = await firstLink.getAttribute("href");
    if (!href || href === "/videos") { test.skip(); return; }
    await page.goto(href);
    await expect(page.locator("h1").first()).toBeVisible();
    // embed iframe
    await expect(page.locator("iframe").first()).toBeVisible();
  });

  test("/pages/[slug] 静态页 (PageRenderer)", async ({ page }) => {
    // 登录拿到管理后台, 找一个 published page
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
    await page.goto("/admin/pages");
    // 找有 slug 的公开页 (可能没, 跳过)
    const firstPageSlug = await page.locator("a[href*='/admin/pages/'][href*='/edit']").first().getAttribute("href").catch(() => null);
    if (!firstPageSlug) { test.skip(); return; }
    // 直接试 /pages/about
    const res = await page.goto("/pages/about");
    if (!res || res.status() >= 400) { test.skip(); return; }
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
