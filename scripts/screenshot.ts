// ============================================================
// 截图脚本 (用于老板本地查看, 替代 Tunnel)
// ============================================================
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const OUT = "output/screenshots";

mkdirSync(OUT, { recursive: true });

const pages = [
  { path: "/", name: "01-home" },
  { path: "/posts", name: "02-posts-list" },
  { path: "/posts/hello-obsidian", name: "03-post-detail" },
  { path: "/novels", name: "04-novels-list" },
  { path: "/admin", name: "05-admin" }
];

async function main() {
  console.log(`📸 Screenshot from ${BASE}`);
  const browser = await chromium.launch({
    executablePath: "/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });

  for (const p of pages) {
    const page = await ctx.newPage();
    try {
      console.log(`  → ${p.path}`);
      await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${OUT}/${p.name}.png`,
        fullPage: true
      });
      console.log(`  ✅ ${p.name}.png`);
    } catch (e) {
      console.error(`  ❌ ${p.path}: ${(e as Error).message}`);
    } finally {
      await page.close();
    }
  }

  await ctx.close();
  await browser.close();
  console.log(`\n📁 截图保存到 ${OUT}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});