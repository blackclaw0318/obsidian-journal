// ============================================================
// 媒体库 Admin e2e (Phase 3.6)
// ============================================================
import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

test.describe.serial("Admin 媒体库", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.request.post("/api/auth/test-reset");
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(\/posts|\/novels|\/videos|\/video-series|\/pages|\/media|\/settings|$)/);
  });

  test("媒体库 — 页面渲染 + uploader 存在", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "媒体库" })).toBeVisible();
    await expect(page.getByText(/点击或拖拽文件到此处上传/)).toBeVisible();
  });

  test("媒体库 — 上传 PNG (setInputFiles)", async ({ page }) => {
    // 1) 准备一个 PNG 文件
    const tmpPng = join(process.cwd(), "data", "test-upload.png");
    // 最小 PNG (1x1 透明)
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);
    writeFileSync(tmpPng, pngBytes);

    // 2) 上传
    await page.goto("/admin/media");
    await page.locator('input[type="file"]').setInputFiles(tmpPng);

    // 3) 等待上传完成, reload 验证 grid
    await page.waitForTimeout(2500);
    await page.reload();
    // grid 至少出现一个文件 (.font-mono 显示 filename)
    const fileCount = await page.locator(".font-mono").count();
    expect(fileCount).toBeGreaterThan(0);
  });

  test("媒体库 — 拒绝 .txt 文件", async ({ page, request }) => {
    // 直接通过 API 测, 验证服务端校验
    // (e2e 模拟 file picker 选 .txt 比较繁琐, 改走 API)
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@obsidian.local", password: "admin123" }
    });
    expect(loginRes.ok()).toBeTruthy();

    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "evil.txt");
    const res = await request.post("/api/admin/media", {
      multipart: { file: { name: "evil.txt", mimeType: "text/plain", buffer: Buffer.from("hello") } }
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("unsupported_mime");
  });

  test("媒体库 — 类型筛选 (image)", async ({ page }) => {
    await page.goto("/admin/media?type=image");
    await expect(page.getByRole("heading", { name: "媒体库" })).toBeVisible();
  });
});
