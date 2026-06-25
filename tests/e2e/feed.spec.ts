// ============================================================
// feed.spec.ts — Phase 2.4 RSS e2e
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Phase 2.4 RSS / Atom (v0.6.1 schema)", () => {
  test("/feed.xml 应该返回 200 + Atom XML", async ({ request }) => {
    const resp = await request.get("/feed.xml");
    expect(resp.status()).toBe(200);
    const ct = resp.headers()["content-type"] ?? "";
    expect(ct).toContain("application/atom+xml");
    const body = await resp.text();
    expect(body).toMatch(/^<\?xml/);
    expect(body).toContain("<feed");
    expect(body).toContain('xmlns="http://www.w3.org/2005/Atom"');
  });

  test("/feed.xml 应该包含站点元数据", async ({ request }) => {
    const resp = await request.get("/feed.xml");
    const body = await resp.text();
    expect(body).toContain("<title>黑曜石日志</title>");
    expect(body).toContain("<subtitle>用代码与数据说话</subtitle>");
  });

  test("/feed.xml 应该包含至少 1 个 entry (seed 至少有 post)", async ({ request }) => {
    const resp = await request.get("/feed.xml");
    const body = await resp.text();
    expect(body).toContain("<entry>");
  });

  test("/feed.xml entry 应该严守 v0.6.1 PostCategory (tech/life)", async ({ request }) => {
    const resp = await request.get("/feed.xml");
    const body = await resp.text();
    // 允许 tech 或 life, 不允许 novel/video/media
    expect(body).toMatch(/term="(tech|life)"/);
    expect(body).not.toContain('term="novel"');
    expect(body).not.toContain('term="video"');
    expect(body).not.toContain('term="media"');
  });

  test("/rss.xml 应该返回 200 + RSS 2.0 XML", async ({ request }) => {
    const resp = await request.get("/rss.xml");
    expect(resp.status()).toBe(200);
    const ct = resp.headers()["content-type"] ?? "";
    expect(ct).toContain("application/rss+xml");
    const body = await resp.text();
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain("<channel>");
  });

  test("/rss.xml item 应该有 title / link / guid / pubDate", async ({ request }) => {
    const resp = await request.get("/rss.xml");
    const body = await resp.text();
    expect(body).toContain("<item>");
    expect(body).toContain("<title>");
    expect(body).toContain("<link>");
    expect(body).toContain('<guid isPermaLink="true">');
    expect(body).toContain("<pubDate>");
  });

  test("首页 <head> 应该包含 Atom + RSS autodiscovery link", async ({ page }) => {
    await page.goto("/");
    const atomLink = page.locator('link[rel="alternate"][type="application/atom+xml"]');
    const rssLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
    await expect(atomLink).toHaveCount(1);
    await expect(rssLink).toHaveCount(1);
    // 严守: href 由 Next.js metadataBase 拼成绝对 URL (RFC 4287 推荐)
    await expect(atomLink).toHaveAttribute("href", /\/feed\.xml$/);
    await expect(rssLink).toHaveAttribute("href", /\/rss\.xml$/);
  });

  test("首页底部 RSS 链接应该指向 /rss.xml", async ({ page }) => {
    await page.goto("/");
    const rssFooter = page.locator('footer a[href="/rss.xml"]');
    await expect(rssFooter).toBeVisible();
  });
});
