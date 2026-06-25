// ============================================================
// search.test.mts — Phase 2.2 FTS5 搜索 integration
// 严守 v0.6.1 schema: PostCategory ∈ {tech, life}
// 用 node:assert + 简单 runner (跟 repo.test.mts 一致, 走 tsx 跑)
// ============================================================

import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";

// ============================================================
// 隔离: 临时 test db
// ============================================================
const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-search.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);

// 覆盖 DATABASE_URL
process.env.DATABASE_URL = `file:${TEST_DB}`;

// dynamic import 让 env var 先生效
const { initSchema } = await import("../../lib/db.ts");
const repo = await import("../../lib/repo.ts");
const { postRepo, siteConfigRepo, userRepo, resetAllData } = repo;

initSchema();

// ============================================================
// Mini test runner
// ============================================================
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

// ============================================================
// Setup: reset + seed
// ============================================================
resetAllData();
const u = userRepo.create({
  email: "test@search.local",
  password_hash: "$2a$10$test",
  name: "Test",
  role: "admin"
});
siteConfigRepo.upsert({ site_name: "Test" });
postRepo.create({
  slug: "fts-blacktech",
  title: "黑曜石日志 FTS5 全文搜索",
  excerpt: "FTS5 + SQLite 实现高性能全文检索",
  content: "本节介绍 FTS5 virtual table + 触发器同步 + 降级容错方案",
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "fts5,sqlite,search",
  author_id: u.id,
  published_at: Math.floor(Date.now() / 1000)
});
postRepo.create({
  slug: "nextjs-blocks",
  title: "Next.js 14 Block 编辑器",
  excerpt: "Page Builder 自由搭建",
  content: "v0.6 Phase 3 重点实现 Page Builder, 13 种 Block 类型",
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "nextjs,blocks",
  author_id: u.id,
  published_at: Math.floor(Date.now() / 1000) - 100
});
postRepo.create({
  slug: "life-coffee",
  title: "晨间咖啡时间",
  excerpt: "一杯咖啡, 一段思考",
  content: "创业路上的片刻宁静, 写写代码, 想想未来",
  cover_image: null,
  status: "published",
  category: "life",
  tags: "life,coffee",
  author_id: u.id,
  published_at: Math.floor(Date.now() / 1000) - 200
});

// ============================================================
// postRepo.search
// ============================================================
await suite("postRepo.search (Phase 2.2 FTS5)", async () => {
  await test("空 q 应该返回空数组", () => {
    const r = postRepo.search({ q: "" });
    assert.deepEqual(r.items, []);
    assert.equal(r.degraded, false);
  });

  await test("FTS5 应该能搜到 title 关键词 (FTS5)", () => {
    const r = postRepo.search({ q: "FTS5" });
    assert.ok(r.items.length >= 1, `expected >= 1, got ${r.items.length}`);
    assert.equal(r.degraded, false);
    assert.ok(r.items[0].title.includes("FTS5"));
  });

  await test("FTS5 应该能搜到 content 关键词 (Page Builder)", () => {
    const r = postRepo.search({ q: "Page Builder" });
    assert.ok(r.items.length >= 1, `expected >= 1, got ${r.items.length}`);
    assert.equal(r.degraded, false);
  });

  await test("FTS5 应该能搜到 tags (nextjs)", () => {
    const r = postRepo.search({ q: "nextjs" });
    assert.ok(r.items.length >= 1, `expected >= 1, got ${r.items.length}`);
  });

  await test("FTS5 多词 OR 搜 (FTS5 SQLite)", () => {
    // unicode61 中文支持限制: 多词 OR 搜中英文混合
    const r = postRepo.search({ q: "FTS5 SQLite" });
    assert.ok(r.items.length >= 1, `expected >= 1, got ${r.items.length}`);
  });

  await test("FTS5 不存在关键词应该返回空", () => {
    const r = postRepo.search({ q: "xyznonexistent" });
    assert.equal(r.items.length, 0);
  });

  await test("FTS5 模糊匹配 (SQLite) 应该工作", () => {
    const r = postRepo.search({ q: "SQLite" });
    assert.ok(r.items.length >= 1, `expected >= 1, got ${r.items.length}`);
  });

  await test("FTS5 性能: 搜索响应 < 100ms", () => {
    const r = postRepo.search({ q: "FTS5" });
    assert.ok(r.tookMs < 100, `tookMs=${r.tookMs}ms 应该 < 100ms`);
  });

  await test("FTS5 严守: status='published' filter 默认 (草稿不返回)", () => {
    postRepo.create({
      slug: "draft-post",
      title: "草稿: FTS5 应该不返回我",
      content: "draft content",
      excerpt: null,
      cover_image: null,
      tags: null,
      status: "draft",
      category: "tech",
      author_id: u.id,
      published_at: null
    });
    const r = postRepo.search({ q: "草稿" });
    assert.equal(r.items.length, 0);
  });
});

// ============================================================
// postRepo.reindexFts
// ============================================================
await suite("postRepo.reindexFts (Phase 2.2 Admin)", async () => {
  await test("reindexFts 应该返回 ok=true 和 count > 0", () => {
    const r = postRepo.reindexFts();
    assert.equal(r.ok, true);
    assert.ok(r.count > 0, `expected count > 0, got ${r.count}`);
  });

  await test("reindex 后搜索仍能工作", () => {
    postRepo.reindexFts();
    const r = postRepo.search({ q: "FTS5" });
    assert.ok(r.items.length >= 1);
  });
});

console.log(`\n============================================================`);
console.log(`通过: \x1b[32m${passed}\x1b[0m    失败: \x1b[31m${failed}\x1b[0m`);
if (failed > 0) {
  console.log("\n失败详情:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
