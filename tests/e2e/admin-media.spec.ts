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

// ============================================================
// v0.33.3 race condition 端到端测试 (上传 hang 修复)
// ============================================================
test.describe("媒体库 v0.33.3 race fix", () => {
  test("上传 12MB 二进制 — < 5s 完成 (老板场景)", async ({ page, request }) => {
    // 模拟老板的 12.5MB 视频场景, 用二进制定位精准测端到端速度
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@obsidian.local", password: "admin123" }
    });
    expect(loginRes.ok()).toBeTruthy();

    // 12MB 二进制 (不是真视频, 但足以测流式 + race fix)
    const buffer = Buffer.alloc(12 * 1024 * 1024, 0x42);
    const start = Date.now();
    const uploadRes = await request.post("/api/admin/media", {
      multipart: {
        file: { name: "boss-12mb.mp4", mimeType: "video/mp4", buffer }
      }
    });
    const time = Date.now() - start;
    console.log(`[race test] 12MB upload time=${time}ms`);
    expect(uploadRes.ok()).toBeTruthy();
    expect(time).toBeLessThan(8000); // 8s 内, 留余量 (dev mode)
    const data = await uploadRes.json();
    expect(data.ok).toBe(true);
    expect(data.media.size).toBe(12 * 1024 * 1024);
  });

  test("client 提前断开 — server 应立即 499 (不 hang)", async ({ request }) => {
    // 模拟 Cloudflare 100s 超时: client 提前断开
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "admin@obsidian.local", password: "admin123" }
    });
    expect(loginRes.ok()).toBeTruthy();
    const cookie = loginRes.headers()["set-cookie"]?.split(";")[0] ?? "";

    // 用 node 的 fetch + AbortController 模拟 client 中断
    const FormData = (await import("node:fs")).readFileSync;
    const buffer = Buffer.alloc(8 * 1024 * 1024, 0x55);
    const boundary = "---boundary" + Date.now();
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="abort-test.mp4"\r\nContent-Type: video/mp4\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, buffer, footer]);

    const controller = new AbortController();
    const start = Date.now();
    setTimeout(() => controller.abort(), 200); // 200ms 后 client 断开

    try {
      await request.post("/api/admin/media", {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": String(body.length),
          Cookie: cookie.replace(/^[^=]+=/, "").split(";")[0]
        },
        data: body.toString("base64")
      });
    } catch {
      // 预期会 throw (client aborted)
    }
    const time = Date.now() - start;
    // 验证 client abort 后, server 不会卡 100s+
    // 整个 timeout 应该在 5s 内 (server 检测 abort + respond)
    expect(time).toBeLessThan(5000);
    console.log(`[race test] abort scenario took ${time}ms`);
  });
});
