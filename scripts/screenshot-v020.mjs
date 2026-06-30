// v0.20 视觉回归截图: 首页 + 404 + 暗色主题 + 移动端 nav
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

mkdirSync('./output/screenshots', { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});

async function shot(ctx, name, url, opts = {}) {
  const page = await ctx.newPage();
  console.log('shot', name, url);
  await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(opts.wait || 1200);
  await page.screenshot({
    path: `./output/screenshots/${name}.png`,
    fullPage: opts.fullPage || false
  });
  console.log('  saved', name);
  await page.close();
}

// 桌面 1280x800 暗色 (老板默认主题)
const darkCtx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: 'dark',
  deviceScaleFactor: 2
});
await shot(darkCtx, 'v20-01-home-dark', '/', { wait: 1500 });
await shot(darkCtx, 'v20-02-posts-dark', '/posts', { wait: 1500 });
await shot(darkCtx, 'v20-03-post-detail-dark', '/posts/hello-obsidian', { wait: 1500 });
await shot(darkCtx, 'v20-04-404-dark', '/this-does-not-exist', { wait: 1500 });
await shot(darkCtx, 'v20-05-novels-dark', '/novels', { wait: 1500 });
await darkCtx.close();

// 桌面 亮色
const lightCtx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: 'light',
  deviceScaleFactor: 2
});
await shot(lightCtx, 'v20-06-home-light', '/', { wait: 1500 });
await shot(lightCtx, 'v20-07-404-light', '/non-exist', { wait: 1500 });
await lightCtx.close();

// 移动端 375x812 (iPhone X 尺寸)
const mCtx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  colorScheme: 'dark',
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});
const mPage = await mCtx.newPage();
await mPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await mPage.waitForTimeout(1500);
await mPage.screenshot({ path: './output/screenshots/v20-08-mobile-home.png' });
console.log('  saved v20-08-mobile-home');

// 移动端汉堡菜单
await mPage.click('button[aria-label="打开菜单"]');
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: './output/screenshots/v20-09-mobile-menu-open.png' });
console.log('  saved v20-09-mobile-menu-open');
await mPage.close();

// 移动端 404
const m404 = await mCtx.newPage();
await m404.goto('http://localhost:3000/non-exist', { waitUntil: 'networkidle' });
await m404.waitForTimeout(1500);
await m404.screenshot({ path: './output/screenshots/v20-10-mobile-404.png' });
console.log('  saved v20-10-mobile-404');
await m404.close();
await mCtx.close();

await browser.close();
console.log('all done');
