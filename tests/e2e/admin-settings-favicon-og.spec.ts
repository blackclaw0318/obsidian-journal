// ============================================================
// Admin Settings E2E (v0.31, P2-20/21 兑现)
// 覆盖: favicon/og_image 上传 UI 渲染 + 走完整 multipart 上传流程
// 复用 AvatarUpload 模式, 验证: 选文件 → POST → 写回 SiteConfig
// 不依赖 UI message (可能被 router.refresh 清掉), 用 polling API 替代
// ============================================================

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TMP = path.join(os.tmpdir(), "settings-e2e");

// 1x1 透明 PNG (最小有效 PNG)
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_BASE64, "base64");

test.describe.serial("Admin 站点设置 - favicon/og_image (v0.31 P2-20/21)", () => {
  test.beforeEach(async ({ page }) => {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
    await page.context().clearCookies();
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  });

  test("站点设置页加载, 显示 favicon + og_image 上传区", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.locator("h1")).toContainText("站点设置");
    // favicon section
    await expect(page.locator("text=Favicon (浏览器 tab")).toBeVisible();
    // og_image section
    await expect(page.locator("text=OG Image (社交分享卡片")).toBeVisible();
    // fallback 提示
    await expect(page.locator("text=og_image fallback 规则")).toBeVisible();
  });

  test("上传 favicon 后, DB 写回 (轮询 API)", async ({ page }) => {
    const faviconPath = path.join(TMP, "test-favicon.png");
    fs.writeFileSync(faviconPath, PNG_BYTES);

    await page.goto("/admin/settings");

    // FaviconUpload 唯一接受 svg+xml (其他上传组件只接受 PNG/JPEG/WebP)
    const faviconInput = page.locator('input[type="file"][accept*="image/svg+xml"]');
    await faviconInput.setInputFiles(faviconPath);

    // 轮询 API, 最多等 10s, 等 favicon 字段写回
    await expect
      .poll(
        async () => {
          const r = await page.request.get("/api/admin/settings");
          const j = await r.json();
          return j.config?.favicon ?? null;
        },
        { timeout: 10000, intervals: [500] }
      )
      .toMatch(/^\/uploads\/favicons\/favicon-.*\.webp$/);
  });

  test("上传 og_image 后, DB 写回 (轮询 API)", async ({ page }) => {
    const ogPath = path.join(TMP, "test-og.png");
    fs.writeFileSync(ogPath, PNG_BYTES);

    await page.goto("/admin/settings");

    // og_image 接受 PNG/JPEG/WebP (不含 svg+xml), 用 nth(1) 排除 avatar
    const ogInput = page
      .locator('input[type="file"][accept*="image/png"]:not([accept*="image/svg+xml"])')
      .nth(1);
    await ogInput.setInputFiles(ogPath);

    await expect
      .poll(
        async () => {
          const r = await page.request.get("/api/admin/settings");
          const j = await r.json();
          return j.config?.og_image ?? null;
        },
        { timeout: 10000, intervals: [500] }
      )
      .toMatch(/^\/uploads\/og-images\/og-.*\.webp$/);
  });

  test("清空 favicon, DB 写 null", async ({ page }) => {
    // 先确保有 favicon
    const get1 = await page.request.get("/api/admin/settings");
    expect(get1.ok()).toBeTruthy();
    const cfg1 = (await get1.json()).config;
    test.skip(!cfg1.favicon, "无 favicon 可清空 (依赖前两个测试顺序)");

    const del = await page.request.delete("/api/admin/settings/favicon");
    expect(del.ok()).toBeTruthy();
    const j = await del.json();
    expect(j.config.favicon).toBeNull();
  });
});
