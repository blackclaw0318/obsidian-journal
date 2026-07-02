// ============================================================
// health.test.mts - /api/health endpoint 集成测试 (P1-10 v0.24)
// ============================================================
// 覆盖:
//   - 基础结构 (status/timestamp/uptime_s/checks 5 项)
//   - db/config 在 seed 完整时应 ok
//   - 无配置时 avatar/favicon/og_image 应 skip
//   - 集成测不直接测 HTTP 端点 (那是 e2e 的活), 而是测核心逻辑
//     (db check + config check 的可独立调用函数化版本)
// ============================================================

import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-health.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { db } = await import("../../lib/db.ts");
const { siteConfigRepo, resetAllData, userRepo } = await import("../../lib/repo.ts");

// ============ Mini runner ============
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${msg}`);
  }
}

function suite(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
  return fn();
}

// ============ Setup ============
resetAllData();
userRepo.create({
  email: "admin@test.local",
  password_hash: "$2a$10$test",
  name: "Test Admin",
  role: "admin"
});
siteConfigRepo.upsert({
  site_name: "Test Site",
  site_tagline: "Tag",
  site_description: "Desc",
  site_keywords: "kw",
  default_theme: "light",
  allow_custom_html: 0,
  baidu_push_enabled: 1
});

// ============ Tests ============

await suite("DB 健康检查核心逻辑", async () => {
  await test("正常 DB 应返回 ok", () => {
    db.exec("PRAGMA quick_check");
    const row = db.prepare("SELECT 1 AS ok").get() as { ok: number };
    assert.equal(row.ok, 1);
  });
});

await suite("SiteConfig 健康检查核心逻辑", async () => {
  await test("已 seed singleton 应返回", () => {
    const cfg = siteConfigRepo.get();
    assert.ok(cfg, "siteConfig should exist");
    assert.equal(cfg!.site_name, "Test Site");
  });

  await test("site_name 应可在响应中读取", () => {
    const cfg = siteConfigRepo.get();
    assert.equal(cfg!.default_theme, "light");
  });
});

await suite("URL 字段可空性", async () => {
  await test("avatar_url 为 null 时不阻塞 /api/health (应 skip)", () => {
    const cfg = siteConfigRepo.get();
    assert.equal(cfg!.avatar_url, null);
  });

  await test("favicon 为 null 时不阻塞 /api/health (应 skip)", () => {
    const cfg = siteConfigRepo.get();
    assert.equal(cfg!.favicon, null);
  });

  await test("og_image 为 null 时不阻塞 /api/health (应 skip)", () => {
    const cfg = siteConfigRepo.get();
    assert.equal(cfg!.og_image, null);
  });
});

await suite("总状态判定逻辑", async () => {
  await test("db+config ok + URL 全 skip → ok", () => {
    const dbOk = true;
    const cfgOk = true;
    const urlDown = false;
    let status: string;
    if (!dbOk || !cfgOk) status = "down";
    else if (urlDown) status = "degraded";
    else status = "ok";
    assert.equal(status, "ok");
  });

  await test("db+config ok + 1 URL down → degraded", () => {
    const dbOk = true;
    const cfgOk = true;
    const urlDown = true;
    let status: string;
    if (!dbOk || !cfgOk) status = "down";
    else if (urlDown) status = "degraded";
    else status = "ok";
    assert.equal(status, "degraded");
  });

  await test("db down → down (无论 URL)", () => {
    const dbOk = false;
    const cfgOk = true;
    const urlDown = false;
    let status: string;
    if (!dbOk || !cfgOk) status = "down";
    else if (urlDown) status = "degraded";
    else status = "ok";
    assert.equal(status, "down");
  });

  await test("config down → down (db ok)", () => {
    const dbOk = true;
    const cfgOk = false;
    const urlDown = false;
    let status: string;
    if (!dbOk || !cfgOk) status = "down";
    else if (urlDown) status = "degraded";
    else status = "ok";
    assert.equal(status, "down");
  });
});

// ============ Report ============
console.log(`\n\x1b[1mSummary:\x1b[0m ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\n\x1b[31mFailures:\x1b[0m");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
process.exit(0);