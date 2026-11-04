import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Reuse an installed browser on the development Mac or the existing Linux host.
const installedChrome = process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : "/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH ?? (existsSync(installedChrome) ? installedChrome : undefined);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // 2c4g 串行更稳 (v0.4 §13.4)
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: chromePath,
      // Software WebGL is confined to the test browser and makes real eye-rig tests portable.
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
