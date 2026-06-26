import { defineConfig, devices } from "@playwright/test";

// 2026-06-25 fix: Playwright 1.49 期望 chromium-1148, 本地 cache 只有 1223
// 显式指定 executablePath + no-sandbox 跑容器/LXC 兼容
const CHROME_PATH = "/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // 2c4g 串行更稳 (v0.4 §13.4)
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: CHROME_PATH,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
