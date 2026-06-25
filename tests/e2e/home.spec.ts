import { test, expect } from "@playwright/test";

test.describe("首页 (老板必看)", () => {
  test("应该能访问首页", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/黑曜石日志/);
  });

  test("首页应该显示站点名 + tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toContainText("黑曜石日志");
    await expect(page.getByText("用代码与数据说话")).toBeVisible();
  });

  test("首页应该列出 seed 数据中的文章", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("最新文章")).toBeVisible();
    await expect(page.getByRole("link", { name: /你好, 黑曜石日志/ })).toBeVisible();
  });

  test("首页应该显示导航", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "首页" })).toBeVisible();
    await expect(page.getByRole("link", { name: "文章" })).toBeVisible();
    await expect(page.getByRole("link", { name: "小说" })).toBeVisible();
    await expect(page.getByRole("link", { name: "管理" })).toBeVisible();
  });
});

test.describe("文章页", () => {
  test("文章列表应该可访问", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.locator("h1")).toContainText("所有文章");
  });

  test("文章详情应该可访问", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    await expect(page.locator("h1")).toContainText("你好, 黑曜石日志");
  });
});

test.describe("小说页", () => {
  test("小说列表应该可访问", async ({ page }) => {
    await page.goto("/novels");
    await expect(page.locator("h1")).toContainText("小说");
    await expect(page.getByRole("link", { name: "元界" })).toBeVisible();
  });
});

test.describe("Admin 占位", () => {
  test("Admin 页面应该可访问", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("管理后台");
  });
});

test.describe("5 专栏 (Phase 2.1)", () => {
  for (const slug of ["tech", "life", "novel", "video", "media"]) {
    test(`/category/${slug} 应该可访问`, async ({ page }) => {
      const resp = await page.goto(`/category/${slug}`);
      expect(resp?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    });
  }
  test("/category/xxx 不存在应 404", async ({ page }) => {
    const resp = await page.goto("/category/xxx");
    expect(resp?.status()).toBe(404);
  });
});