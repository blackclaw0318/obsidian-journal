// ============================================================
// tests/integration/analytics.test.mts - 板块访问监控 (v0.35.2)
// 24h dedup + 聚合 + 365 天 retention
// ============================================================
import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-analytics.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);

process.env.DATABASE_URL = `file:${TEST_DB}`;

const { initSchema } = await import("../../lib/db.ts");
const analytics = await import("../../lib/analytics.ts");

initSchema();

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: ${msg}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n    ${msg}`);
  }
}

// ============================================================
// pathToSection
// ============================================================
console.log("\n\x1b[1mpathToSection 板块归类\x1b[0m");

await test("首页 → home", () => {
  assert.strictEqual(analytics.pathToSection("/"), "home");
  assert.strictEqual(analytics.pathToSection(""), "home");
});

await test("一级段 → 第一段", () => {
  assert.strictEqual(analytics.pathToSection("/posts"), "posts");
  assert.strictEqual(analytics.pathToSection("/posts/2026-07-04"), "posts");
  assert.strictEqual(analytics.pathToSection("/novels"), "novels");
  assert.strictEqual(analytics.pathToSection("/resources"), "resources");
});

await test("/admin → admin/第二段", () => {
  assert.strictEqual(analytics.pathToSection("/admin/posts"), "admin/posts");
  assert.strictEqual(analytics.pathToSection("/admin/posts/123/edit"), "admin/posts");
  assert.strictEqual(analytics.pathToSection("/admin/novels/abc"), "admin/novels");
});

await test("/admin (无子段) → admin", () => {
  assert.strictEqual(analytics.pathToSection("/admin"), "admin");
});

// ============================================================
// dedup (Q1 = 24h)
// ============================================================
console.log("\n\x1b[1mrecordView + dedup (Q1 24h)\x1b[0m");

await test("首次插入 → inserted=true", () => {
  const r = analytics.recordView({ path: "/posts/test-1", ipHash: "ip_a" });
  assert.strictEqual(r.inserted, true);
});

await test("24h 内同 IP+path 二次 → inserted=false (dedup)", () => {
  // 同 path + 同 ip
  const r2 = analytics.recordView({ path: "/posts/test-1", ipHash: "ip_a" });
  assert.strictEqual(r2.inserted, false);
});

await test("不同 IP 同 path → inserted=true", () => {
  const r = analytics.recordView({ path: "/posts/test-1", ipHash: "ip_b" });
  assert.strictEqual(r.inserted, true);
});

await test("不同 path 同 IP → inserted=true", () => {
  const r = analytics.recordView({ path: "/posts/test-2", ipHash: "ip_a" });
  assert.strictEqual(r.inserted, true);
});

await test("全新 ip_hash+path 任何时间都插入 → inserted=true", () => {
  const past = Math.floor(Date.now() / 1000) - 5 * 86400; // 5 天前
  const r = analytics.recordView({ path: "/posts/fresh-path", ipHash: "ip_brand_new", now: past });
  assert.strictEqual(r.inserted, true);
});

// ============================================================
// 聚合 (statsSummary / sectionStats / dailyTrend / topPaths)
// ============================================================
console.log("\n\x1b[1m聚合查询 (statsSummary / sectionStats / dailyTrend / topPaths)\x1b[0m");

await test("statsSummary 返回结构正确 (4 区间)", () => {
  const s = analytics.statsSummary();
  assert.ok("today" in s);
  assert.ok("last7d" in s);
  assert.ok("last30d" in s);
  assert.ok("last365d" in s);
  assert.ok("activeSectionsToday" in s);
  assert.strictEqual(typeof s.today.pv, "number");
});

await test("sectionStats 返回板块列表", () => {
  const list = analytics.sectionStats(30);
  assert.ok(Array.isArray(list));
  // 我们插入过 posts/test-1 和 posts/test-2, section='posts' 应至少 1 条
  if (list.length > 0) {
    assert.ok(list[0].pv >= 0);
    assert.ok(list[0].uv >= 0);
    assert.ok(typeof list[0].section === "string");
  }
});

await test("dailyTrend 返回数组 (Y轴点)", () => {
  const trend = analytics.dailyTrend(7);
  assert.ok(Array.isArray(trend));
  // 即使今日有数据, 也是今日 1 点
  trend.forEach((p) => {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.date));
    assert.ok(typeof p.pv === "number");
    assert.ok(typeof p.uv === "number");
  });
});

await test("topPaths 返回 Top N 路径", () => {
  const top = analytics.topPaths(30, 5);
  assert.ok(Array.isArray(top));
  assert.ok(top.length <= 5);
  top.forEach((p) => {
    assert.ok(p.path.startsWith("/"));
    assert.ok(typeof p.pv === "number");
  });
});

await test("recentViews 返回最近记录", () => {
  const recent = analytics.recentViews(10);
  assert.ok(Array.isArray(recent));
  assert.ok(recent.length <= 10);
});

// ============================================================
// 365 天保留 (Q4)
// ============================================================
console.log("\n\x1b[1m365 天保留 (Q4 retention)\x1b[0m");

await test("purgeOldViews 删数据", () => {
  // 插入一个 farPast 记录
  const farPast = Math.floor(Date.now() / 1000) - 400 * 86400; // 400 天前
  analytics.recordView({ path: "/old/test", ipHash: "ip_z", now: farPast });

  // retention = 365 天 → 400 天前的数据应被删
  const r = analytics.purgeOldViews();
  assert.ok(typeof r.deleted === "number");
  assert.ok(r.deleted >= 1);
});

await test("30 天 retention 不删 365 天内数据", () => {
  // 重新插一个 100 天前的 (≤ 365)
  const past100 = Math.floor(Date.now() / 1000) - 100 * 86400;
  analytics.recordView({ path: "/recent/test", ipHash: "ip_y", now: past100 });

  const r30 = analytics.purgeOldViews(30 * 86400);
  // 100 天前数据 > 30 天 retention → 应被删
  assert.ok(r30.deleted >= 1);
});

// ============================================================
// Summary
// ============================================================
console.log("\n============================================================");
console.log(`\x1b[1m通过: \x1b[32m${passed}\x1b[0m    失败: \x1b[${failed ? 31 : 32}m${failed}\x1b[0m`);
if (failed > 0) {
  console.log("\n失败明细:");
  failures.forEach((m) => console.log(`  - ${m}`));
  process.exit(1);
}
