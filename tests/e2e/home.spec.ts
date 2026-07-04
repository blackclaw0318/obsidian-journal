import { test, expect } from "@playwright/test";

test.describe("首页 (老板必看)", () => {
  test("应该能访问首页", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/黑曜石日志/);
  });

  test("首页应该显示站点名 + tagline", async ({ page }) => {
    await page.goto("/");
    // v0.20 HomeHero framer-motion initial opacity:0, 等动画完成
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h1").first()).toContainText("黑曜石日志");
    // tagline 验证: 任一 description meta 含内容即可
    const descs = await page.locator('meta[name="description"]').all();
    expect(descs.length).toBeGreaterThan(0);
    const first = await descs[0].getAttribute("content");
    expect(first).toBeTruthy();
    expect(first!.length).toBeGreaterThan(5);
  });

  test("首页应该列出 seed 数据中的文章", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("最新文章")).toBeVisible();
    await expect(page.getByRole("link", { name: /你好, 黑曜石日志/ })).toBeVisible();
  });

  test("首页应该显示导航", async ({ page }) => {
    await page.goto("/");
    // v0.20 Nav client component, 等 hydration 完成
    await page.waitForLoadState("networkidle");
    // v0.18 Nav "管理" link 带 ⚙ emoji 前缀, 用 name 包含而非 exact
    await expect(page.getByRole("link", { name: /^[^\s]*首页$/, exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav a[href="/posts"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/novels"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/admin"]').first()).toBeVisible();
  });
});

test.describe("文章页", () => {
  test("文章列表应该可访问", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.locator("h1")).toContainText("全部文章");
  });

  test("文章详情应该可访问", async ({ page }) => {
    await page.goto("/posts/hello-obsidian");
    // v0.20+ 有 2 个 h1 (page header + markdown 渲染的 h1), 精确选 header 里的
    await expect(page.locator("article > header h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("article > header h1")).toContainText("你好, 黑曜石日志");
  });
});

test.describe("小说页", () => {
  test("小说列表应该可访问", async ({ page }) => {
    await page.goto("/novels");
    await expect(page.locator("h1")).toContainText("小说");
    await expect(page.getByRole("link", { name: "元界" })).toBeVisible();
  });
});

test.describe("Admin 占位 (Phase 3.1: 需登录)", () => {
  test("未登录访问应重定向到 /admin/login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("登录后可访问 /admin 并看到管理后台", async ({ page }) => {
    // 重置 server 端 rate limit (跨 test 隔离)
    await page.request.post("/api/auth/test-reset");
    // 登录
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill("admin@obsidian.local");
    await page.getByLabel("密码").fill("admin123");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("概览");
  });
});

test.describe("Phase 2.1 重构 (按 v0.6.1 schema)", () => {
  test("/posts?cat=tech 筛选 tech 类", async ({ page }) => {
    const resp = await page.goto("/posts?cat=tech");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /技术文章/ })).toBeVisible();
  });

  test("/posts?cat=life 筛选 life 类", async ({ page }) => {
    const resp = await page.goto("/posts?cat=life");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /生活文章/ })).toBeVisible();
  });

  test("/posts 默认显示全部", async ({ page }) => {
    const resp = await page.goto("/posts");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /全部文章/ })).toBeVisible();
  });

  test("/videos 视频页可访问 (VideoSeries 独立 model)", async ({ page }) => {
    const resp = await page.goto("/videos");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /视频/ })).toBeVisible();
  });

  test("/resources 资源页可访问 (Phase 3 占位)", async ({ page }) => {
    const resp = await page.goto("/resources");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /媒体库/ })).toBeVisible();
  });
});

test.describe("Q5 主题切换 (v0.6.1 schema)", () => {
  test("ThemeToggle 按钮可见 (3 个: 亮/暗/自动)", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("group", { name: "主题切换" });
    await expect(toggle).toBeVisible();
    await expect(toggle.getByRole("button", { name: "亮色" })).toBeVisible();
    await expect(toggle.getByRole("button", { name: "暗色" })).toBeVisible();
    await expect(toggle.getByRole("button", { name: "跟随系统" })).toBeVisible();
  });

  test("ThemeToggle SSR HTML 直接含 3 个按钮 (v0.23 加速)", async ({ page }) => {
    // v0.23 (P1-9): 不再用 mounted 占位, SSR HTML 立即渲染 3 按钮
    // 验证: domcontentloaded 后 (不需等 hydration) 即可在 DOM 找到 3 个 button
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const buttons = page.locator("button[aria-label='亮色'], button[aria-label='暗色'], button[aria-label='跟随系统']");
    // 注意: 响应式 .hidden md:block 在 mobile viewport 会 hidden, 这里用 attached 而非 visible
    await expect(buttons).toHaveCount(3, { timeout: 5000 });
  });

  test("点击暗色按钮后 html.dark 生效", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "暗色" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("点击亮色按钮后 html.dark 移除", async ({ page }) => {
    await page.goto("/");
    // 先切到暗
    await page.getByRole("button", { name: "暗色" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    // 再切到亮
    await page.getByRole("button", { name: "亮色" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("主题选择 localStorage 持久化", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "暗色" }).click();
    const stored = await page.evaluate(() => localStorage.getItem("obsidian-theme"));
    expect(stored).toBe("dark");
  });
});