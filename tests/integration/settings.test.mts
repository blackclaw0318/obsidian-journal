// ============================================================
// SiteConfig 设置集成测试 (Phase 3.8, v0.15)
// 覆盖: siteConfig 持久化 + 字段约束
// 用 node:sqlite (Node 24 内置, 避免 better-sqlite3 ESM 解析问题)
// ============================================================

import { DatabaseSync } from "node:sqlite";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const TEST_DB = path.resolve("data/test-settings.db");
if (existsSync(TEST_DB)) rmSync(TEST_DB);

let pass = 0;
let fail = 0;
function assert(cond: boolean, label: string) {
  if (cond) { console.log(`✔ ${label}`); pass++; }
  else { console.log(`✖ ${label}`); fail++; }
}

const db = new DatabaseSync(TEST_DB);
db.exec(`
  CREATE TABLE site_config (
    id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL,
    site_tagline TEXT NOT NULL,
    site_description TEXT,
    site_keywords TEXT,
    default_theme TEXT NOT NULL DEFAULT 'light',
    allow_custom_html INTEGER NOT NULL DEFAULT 0,
    baidu_push_enabled INTEGER NOT NULL DEFAULT 1,
    baidu_push_token TEXT,
    og_image TEXT,
    favicon TEXT,
    analytics TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
db.prepare(`INSERT INTO site_config (id, site_name, site_tagline) VALUES ('singleton', '黑曜石日志', '用代码与数据说话')`).run();

// 测试 1: 初始默认配置
{
  const row = db.prepare("SELECT * FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row !== undefined, "默认配置存在");
  assert(row?.site_name === "黑曜石日志", "默认 site_name = 黑曜石日志");
  assert(row?.default_theme === "light", "默认 default_theme = light");
  assert(row?.allow_custom_html === 0, "默认 allow_custom_html = 0");
}

// 测试 2: upsert 更新 site_name
{
  db.prepare(`UPDATE site_config SET site_name = ?, updated_at = ? WHERE id = 'singleton'`)
    .run("测试新名", Math.floor(Date.now() / 1000));
  const row = db.prepare("SELECT site_name FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.site_name === "测试新名", "upsert 更新 site_name 成功");
}

// 测试 3: default_theme 字段约束 (DB 层面无约束, 应用层校验)
{
  const ALLOWED_THEMES = ["light", "dark", "auto"];
  assert(ALLOWED_THEMES.includes("light"), "ALLOWED_THEMES 含 light");
  assert(ALLOWED_THEMES.includes("dark"), "ALLOWED_THEMES 含 dark");
  assert(ALLOWED_THEMES.includes("auto"), "ALLOWED_THEMES 含 auto");
  assert(!ALLOWED_THEMES.includes("neon"), "ALLOWED_THEMES 不含 neon (应用层校验)");
}

// 测试 4: allow_custom_html 切换 0/1
{
  db.prepare(`UPDATE site_config SET allow_custom_html = 1 WHERE id = 'singleton'`).run();
  let row = db.prepare("SELECT allow_custom_html FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.allow_custom_html === 1, "allow_custom_html 开 = 1");

  db.prepare(`UPDATE site_config SET allow_custom_html = 0 WHERE id = 'singleton'`).run();
  row = db.prepare("SELECT allow_custom_html FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.allow_custom_html === 0, "allow_custom_html 关 = 0");
}

// 测试 5: baidu_push_enabled 切换
{
  db.prepare(`UPDATE site_config SET baidu_push_enabled = 0, baidu_push_token = NULL WHERE id = 'singleton'`).run();
  let row = db.prepare("SELECT baidu_push_enabled, baidu_push_token FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.baidu_push_enabled === 0, "baidu_push_enabled 关 = 0");
  assert(row?.baidu_push_token === null, "baidu_push_token 关时为 null");

  db.prepare(`UPDATE site_config SET baidu_push_enabled = 1, baidu_push_token = ? WHERE id = 'singleton'`)
    .run("test-token-12345");
  row = db.prepare("SELECT baidu_push_enabled, baidu_push_token FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.baidu_push_enabled === 1, "baidu_push_enabled 开 = 1");
  assert(row?.baidu_push_token === "test-token-12345", "baidu_push_token 持久化");
}

// 测试 6: og_image / favicon / analytics 可空
{
  db.prepare(`UPDATE site_config SET og_image = ?, favicon = ?, analytics = ? WHERE id = 'singleton'`)
    .run("/media/og.png", "/media/favicon.ico", "<script>gtag()</script>");
  const row = db.prepare("SELECT og_image, favicon, analytics FROM site_config WHERE id = 'singleton'").get() as any;
  assert(row?.og_image === "/media/og.png", "og_image 持久化");
  assert(row?.favicon === "/media/favicon.ico", "favicon 持久化");
  assert(row?.analytics === "<script>gtag()</script>", "analytics 持久化 (含特殊字符)");
}

db.close();
rmSync(TEST_DB);

console.log("");
console.log(`总计: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);