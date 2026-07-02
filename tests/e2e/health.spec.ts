// ============================================================
// health.spec.ts - /api/health endpoint e2e (P1-10 v0.24)
// ============================================================
// 验证:
//   - GET /api/health 返回 200
//   - JSON 结构含 status/timestamp/uptime_s/checks 5 项
//   - 实际 dev server (seed 状态) 应 status: ok, db/config ok
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("/api/health endpoint (P1-10 v0.24)", () => {
  test("GET /api/health 应返回 200 + status: ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("响应应含 5 项 checks + timestamp + uptime", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("uptime_s");
    expect(body.checks).toHaveProperty("db");
    expect(body.checks).toHaveProperty("config");
    expect(body.checks).toHaveProperty("avatar");
    expect(body.checks).toHaveProperty("favicon");
    expect(body.checks).toHaveProperty("og_image");
  });

  test("db + config 应 status: ok", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body.checks.db.status).toBe("ok");
    expect(body.checks.config.status).toBe("ok");
    expect(body.checks.config).toHaveProperty("site_name");
  });

  test("未配置 avatar/favicon/og_image 应 status: skip (200)", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    // 取决于测试环境, 但绝不应 down
    expect(["ok", "skip"]).toContain(body.checks.avatar.status);
    expect(["ok", "skip"]).toContain(body.checks.favicon.status);
    expect(["ok", "skip"]).toContain(body.checks.og_image.status);
    expect(res.status()).toBe(200);
  });

  test("不需要 auth", async ({ request }) => {
    // 不带 cookie, 不带 token
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
  });
});