import { defineConfig } from "@playwright/test";

/**
 * Visual regression config (Phase 2.5 Q15)
 * 严守: maxDiffPixelRatio 0.02 (≤ 2% 像素差)
 * 与 playwright.config.ts 分离, 避免 testDir 冲突
 */

export default defineConfig({
  testDir: "./tests/visual",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: "/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    }
  },
  projects: [
    {
      name: "chromium",
      use: {
        // 与 e2e config 一致 (Desktop Chrome 默认), 保证 baseline 可用
        viewport: { width: 1280, height: 720 }
      }
    }
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
