// ============================================================
// tests/integration/increment-post-view.test.mts
// v0.35.3: 内部 API /api/internal/increment-post-view 集成测试
// 老板 2026-07-05 08:12 反馈"浏览量不累加", 加 server-side 计数
//  - 防外部调用: 无 x-internal-record 头 → 403 forbidden
//  - 仅 published 文章 +1
//  - 不存在 / 草稿 → 200 ok 但不增 (静默)
//  - 缺失 slug → 400
// ============================================================
import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-increment-post-view.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { initSchema, db } = await import("../../lib/db.ts");
const { userRepo, postRepo } = await import("../../lib/repo.ts");
initSchema();

// 准备: 1 个 published 文章 + 1 个 draft + 1 个不存在 slug
const ADMIN = userRepo.create({
  email: "admin@test.local",
  password_hash: "x",
  name: "Test",
  role: "admin"
});
const PUBLISHED = postRepo.create({
  slug: "view-test-published",
  title: "View Test Published",
  content: "x",
  status: "published",
  category: "tech",
  tags: null,
  author_id: ADMIN.id,
  published_at: Math.floor(Date.now() / 1000),
  excerpt: null,
  cover_image: null
});
const DRAFT = postRepo.create({
  slug: "view-test-draft",
  title: "View Test Draft",
  content: "x",
  status: "draft",
  category: "tech",
  tags: null,
  author_id: ADMIN.id,
  published_at: null,
  excerpt: null,
  cover_image: null
});

// 直接 import 路由 (Node runtime OK)
const { POST } = await import("../../app/api/internal/increment-post-view/route.ts");

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
    console.log(`  \x1b[31m✗\x1b[0b ${name}\n    ${msg}`);
  }
}

function makeReq(body: unknown, internal: boolean): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (internal) headers["x-internal-record"] = "1";
  return new Request("http://localhost:3000/api/internal/increment-post-view", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

console.log("\n\x1b[1m内部 API /api/internal/increment-post-view 鉴权\x1b[0m");

await test("无 x-internal-record 头 → 403 forbidden", async () => {
  const res = await POST(makeReq({ slug: PUBLISHED.slug }, false));
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, "forbidden");
});

console.log("\n\x1b[1mpublished 文章 +1\x1b[0m");

await test("首次 published 调用应 +1 (DB 0 → 1)", async () => {
  const before = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  const res = await POST(makeReq({ slug: PUBLISHED.slug }, true));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.counted, true);
  assert.equal(body.view_count, before + 1);
  // DB 真实校验
  const after = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  assert.equal(after, before + 1);
});

await test("3 次连续调用累计 +3", async () => {
  const before = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  for (let i = 0; i < 3; i++) {
    await POST(makeReq({ slug: PUBLISHED.slug }, true));
  }
  const after = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  assert.equal(after, before + 3);
});

console.log("\n\x1b[1m未发布 / 不存在 静默跳过\x1b[0m");

await test("draft 文章应 200 ok 但不 +1", async () => {
  const before = postRepo.bySlug(DRAFT.slug)?.view_count ?? 0;
  const res = await POST(makeReq({ slug: DRAFT.slug }, true));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.counted, false);
  assert.equal(body.reason, "not_published");
  const after = postRepo.bySlug(DRAFT.slug)?.view_count ?? 0;
  assert.equal(after, before);
});

await test("不存在的 slug 应 200 ok 但不 +1", async () => {
  const res = await POST(makeReq({ slug: "nope-not-exist" }, true));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.counted, false);
  assert.equal(body.reason, "not_found");
});

console.log("\n\x1b[1m输入校验\x1b[0m");

await test("缺 slug → 400", async () => {
  const res = await POST(makeReq({}, true));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, "missing_slug");
});

await test("slug 非法类型 (number) → 400", async () => {
  const res = await POST(makeReq({ slug: 123 }, true));
  assert.equal(res.status, 400);
});

console.log("\n\x1b[1m并发幂等性 (SQLite 串行, 预期 +N)\x1b[0m");

await test("10 个并发调用, view_count 应 +10", async () => {
  const before = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  const promises = Array.from({ length: 10 }, () =>
    POST(makeReq({ slug: PUBLISHED.slug }, true))
  );
  await Promise.all(promises);
  const after = postRepo.bySlug(PUBLISHED.slug)!.view_count;
  assert.equal(after, before + 10);
});

// ============================================================
// 总结
// ============================================================
console.log(`\n\x1b[1m总计: ${passed} 通过, ${failed} 失败\x1b[0m`);
if (failed > 0) {
  console.log("\n失败列表:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
db.exec("DELETE FROM posts");
db.exec("DELETE FROM sessions");
db.exec("DELETE FROM users");
process.exit(0);
