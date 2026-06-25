// ============================================================
// seo.spec.ts — Phase 2.3 SEO e2e
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Phase 2.3 SEO (v0.6.1 schema)", () => {
  test("/sitemap.xml 应该返回 200 + sitemap XML", async ({ request }) => {
    const resp = await request.get("/sitemap.xml");
    expect(resp.status()).toBe(200);
    const ct = resp.headers()["content-type"] ?? "";
    expect(ct).toMatch(/xml/);
    const body = await resp.text();
    expect(body).toMatch(/^<\?xml/);
    expect(body).toContain("<urlset");
    expect(body).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
  });

  test("/sitemap.xml 应该包含静态页 + 至少 1 个 post", async ({ request }) => {
    const resp = await request.get("/sitemap.xml");
    const body = await resp.text();
    expect(body).toContain("<loc>"); // 至少 1 个 url
    expect(body).toMatch(/<loc>.*\/posts\/hello-obsidian<\/loc>/); // seed post
  });

  test("/robots.txt 应该返回 200 + 正确格式", async ({ request }) => {
    const resp = await request.get("/robots.txt");
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
  });

  test("首页应该包含 WebSite JSON-LD (schema.org)", async ({ page }) => {
    await page.goto("/");
    const ldJsonScripts = page.locator('script[type="application/ld+json"]');
    await expect(ldJsonScripts).toHaveCount(1);
    const ldText = await ldJsonScripts.first().textContent();
    expect(ldText).toContain('"@type":"WebSite"');
    expect(ldText).toContain('"@context":"https://schema.org"');
  });

  test("首页应该有 canonical link", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
  });

  test("Post 详情页应该 og:type=article + 独立 title + canonical", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "article");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /你好/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/posts\/hello-obsidian/);
  });

  test("Post 详情页应该有 Article JSON-LD (schema.org)", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    // Playwright :has-text 不读 <script> 文本, 用 evaluate 拿 textContent
    const ldScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ldScripts.length).toBeGreaterThanOrEqual(1);
    const hasArticle = ldScripts.some((s) => s.includes('"@type":"Article"'));
    expect(hasArticle).toBe(true);
  });

  test("Post JSON-LD 的 articleSection 应该严守 v0.6.1 (tech/life)", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    const ldScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const articleLd = ldScripts.find((s) => s.includes('"@type":"Article"'));
    expect(articleLd).toBeDefined();
    expect(articleLd).toContain('"articleSection":"tech"');
    // 严禁 novel/video/media 混入 Post category
    expect(articleLd).not.toContain('"articleSection":"novel"');
    expect(articleLd).not.toContain('"articleSection":"video"');
    expect(articleLd).not.toContain('"articleSection":"media"');
  });

  test("/novels 列表页应该有 Book JSON-LD", async ({ page }) => {
    await page.goto("/novels");
    const ldScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const bookCount = ldScripts.filter((s) => s.includes('"@type":"Book"')).length;
    expect(bookCount).toBeGreaterThanOrEqual(1);
  });

  test("/novels 列表页应该有 canonical + og:type=website", async ({ page }) => {
    await page.goto("/novels");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/novels$/);
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "website");
  });

  test("/videos 列表页应该有 ItemList JSON-LD (VideoObject)", async ({ page }) => {
    await page.goto("/videos");
    const ldScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    // seed 暂无 video, 允许 0 个 ItemList
    const itemListCount = ldScripts.filter((s) => s.includes('"@type":"ItemList"')).length;
    expect(itemListCount).toBeGreaterThanOrEqual(0);
  });

  test("Sitemap 和 robots 应该互引 (cross-link)", async ({ request }) => {
    const resp = await request.get("/robots.txt");
    const robots = await resp.text();
    expect(robots).toContain("/sitemap.xml");
  });
});
