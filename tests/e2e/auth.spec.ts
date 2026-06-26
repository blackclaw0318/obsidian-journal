// ============================================================
// auth.spec.ts - Phase 3.1 登录流 e2e (Playwright)
// 覆盖: 重定向 / 错误密码 / 正确密码 / 登出 / API me
// 严守: 测前不污染 dev.db, 用独立 admin 凭据 (e2e 不跑 seed)
// ============================================================
import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@obsidian.local";
const ADMIN_PASSWORD = "admin123";

test.describe.serial("Auth 登录流 (Phase 3.1)", () => {
  test.beforeEach(async ({ page }) => {
    // 清理 cookie
    await page.context().clearCookies();
    // 重置 server 端 rate limit (上 test 失败计数不污染本 test)
    await page.request.post("/api/auth/test-reset");
  });

  test("未登录访问 /admin 应重定向到 /admin/login", async ({ page }) => {
    const res = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    // 走 middleware 重定向, 最终 URL 应是 /admin/login
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(res?.status()).toBeLessThan(500);
  });

  test("未登录访问 /admin/reindex 应重定向到 /admin/login", async ({ page }) => {
    await page.goto("/admin/reindex");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("登录页应显示表单", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("h1")).toContainText("黑曜石日志");
    await expect(page.getByLabel("邮箱")).toBeVisible();
    await expect(page.getByLabel("密码")).toBeVisible();
    await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
  });

  test("错误密码应显示错误提示且不跳转", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
    await page.getByLabel("密码").fill("wrong-password");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByText("邮箱或密码错误")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("正确密码应跳转到 /admin 并显示 dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
    await page.getByLabel("密码").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });
    // dashboard 应可见
    await expect(page.locator("aside").first()).toContainText("黑曜石");
    await expect(page.locator("header").last()).toContainText("上坤");
  });

  test("登录后访问 /api/auth/me 应返回用户信息", async ({ page }) => {
    // 登录
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
    await page.getByLabel("密码").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });

    // 确认 cookie 已设
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "obsidian_session");
    expect(sessionCookie).toBeTruthy();

    // 用 page.request 共享 cookie
    const res = await page.request.get("/api/auth/me");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe(ADMIN_EMAIL);
    expect(data.user.password_hash).toBeUndefined();
  });

  test("登出后访问 /admin 应重定向到 /admin/login", async ({ page }) => {
    // 登录
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(ADMIN_EMAIL);
    await page.getByLabel("密码").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });

    // 登出: 点 admin header 的用户按钮
    await page.locator("header").last().getByRole("button").click();
    await page.getByRole("button", { name: "登出" }).click();
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });

    // 再访问 /admin 应被拦截
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("错误密码 5 次后第 6 次应提示限流", async ({ page }) => {
    // ⚠️ 本 test 故意验证 rate limit, 不在 beforeEach reset
    // beforeEach 已在每个 test 前 reset, 所以本 test 起始计数为 0
    let lastStatus = 0;
    let lastBody: any = {};
    for (let i = 0; i < 6; i++) {
      const r = await page.request.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: "wrong-pw-" + i }
      });
      lastStatus = r.status();
      lastBody = await r.json();
    }
    expect(lastStatus).toBe(429);
    expect(lastBody.error).toBe("rate_limited");
    expect(lastBody).not.toHaveProperty("jwt");
    // 清理: 重置限流避免影响后续 test
    await page.request.post("/api/auth/test-reset");
  });
});
