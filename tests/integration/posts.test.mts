// ============================================================
// posts.test.mts - Phase 3.2 postRepo CRUD 集成测试
// 覆盖: byId / listAll / slugExists / update / softDelete / restore
// ============================================================
import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-posts.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { initSchema, db } = await import("../../lib/db.ts");
const { userRepo, postRepo, resetAllData } = await import("../../lib/repo.ts");

initSchema();

let ADMIN_ID = ""; // 每个 suite 自己 setup 时刷新

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

function setup() {
  resetAllData();
  const u = userRepo.create({
    email: "admin@test.local",
    password_hash: "$2a$10$test",
    name: "Test Admin",
    role: "admin"
  });
  ADMIN_ID = u.id;
  return u.id;
}

setup();

// ============================================================
// byId
// ============================================================
await suite("postRepo.byId", async () => {
  await test("应返回含 author 信息的 PostWithAuthor", () => {
    const p = postRepo.create({
      slug: "test-by-id",
      title: "test",
      content: "x",
      status: "draft",
      category: "tech",
      tags: null,
      author_id: ADMIN_ID,
      published_at: null,
      excerpt: null,
      cover_image: null
    });
    const got = postRepo.byId(p.id);
    assert.ok(got);
    assert.equal(got.id, p.id);
    assert.equal(got.author.email, "admin@test.local");
    assert.equal((got.author as any).name, "Test Admin");
  });

  await test("不存在 ID 应返回 null", () => {
    assert.equal(postRepo.byId("post_does_not_exist"), null);
  });
});

// ============================================================
// listAll
// ============================================================
await suite("postRepo.listAll", async () => {
  await test("默认返回所有 status 的帖子", () => {
    setup();
    postRepo.create({ slug: "p1", title: "P1", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    postRepo.create({ slug: "p2", title: "P2", content: "x", status: "published", category: "life", tags: null, author_id: ADMIN_ID, published_at: 1000, excerpt: null, cover_image: null });
    postRepo.create({ slug: "p3", title: "P3", content: "x", status: "archived", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const { items, total } = postRepo.listAll({});
    assert.ok(total >= 3);
    assert.ok(items.length >= 3);
  });

  await test("status 筛选应生效", () => {
    setup();
    postRepo.create({ slug: "d1", title: "D", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    postRepo.create({ slug: "pub1", title: "P", content: "x", status: "published", category: "tech", tags: null, author_id: ADMIN_ID, published_at: 1000, excerpt: null, cover_image: null });
    const { items, total } = postRepo.listAll({ status: "draft" });
    assert.ok(items.every((p) => p.status === "draft"));
    assert.ok(total >= 1);
  });

  await test("category 筛选应生效", () => {
    setup();
    postRepo.create({ slug: "t1", title: "T", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    postRepo.create({ slug: "l1", title: "L", content: "x", status: "draft", category: "life", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const { items } = postRepo.listAll({ category: "life" });
    assert.ok(items.every((p) => p.category === "life"));
  });

  await test("q 搜索应匹配 title", () => {
    setup();
    postRepo.create({ slug: "s1", title: "Next.js 教程", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    postRepo.create({ slug: "s2", title: "其他文章", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const { items } = postRepo.listAll({ q: "Next" });
    assert.ok(items.some((p) => p.title.includes("Next")));
  });

  await test("limit + offset 分页应工作", () => {
    setup();
    for (let i = 0; i < 5; i++) {
      postRepo.create({ slug: `pg-${i}`, title: `Post ${i}`, content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    }
    const page1 = postRepo.listAll({ limit: 2, offset: 0 });
    const page2 = postRepo.listAll({ limit: 2, offset: 2 });
    assert.ok(page1.items.length <= 2);
    assert.ok(page2.items.length <= 2);
    // 不同页的 ID 应不同
    const ids = new Set([...page1.items.map((p) => p.id), ...page2.items.map((p) => p.id)]);
    assert.equal(ids.size, page1.items.length + page2.items.length);
  });
});

// ============================================================
// slugExists
// ============================================================
await suite("postRepo.slugExists", async () => {
  await test("存在的 slug 返回 true", () => {
    setup();
    postRepo.create({ slug: "exists-slug", title: "X", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    assert.equal(postRepo.slugExists("exists-slug"), true);
  });

  await test("不存在的 slug 返回 false", () => {
    assert.equal(postRepo.slugExists("nope"), false);
  });

  await test("excludeId 排除自身时返回 false", () => {
    const p = postRepo.create({ slug: "self-slug", title: "S", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    assert.equal(postRepo.slugExists("self-slug", p.id), false);
  });
});

// ============================================================
// update
// ============================================================
await suite("postRepo.update", async () => {
  await test("部分字段更新应生效", () => {
    setup();
    const p = postRepo.create({ slug: "upd", title: "Old", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const updated = postRepo.update(p.id, { title: "New", status: "published" });
    assert.ok(updated);
    assert.equal(updated.title, "New");
    assert.equal(updated.status, "published");
    // 不变的字段保留
    assert.equal(updated.slug, "upd");
    assert.equal(updated.content, "x");
  });

  await test("不存在 ID 应返回 null", () => {
    assert.equal(postRepo.update("nope", { title: "x" }), null);
  });

  await test("应更新 updated_at 时间戳", async () => {
    setup();
    const p = postRepo.create({ slug: "ts", title: "T", content: "x", status: "draft", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const before = p.updated_at;
    await new Promise((r) => setTimeout(r, 1100)); // 1.1s
    const updated = postRepo.update(p.id, { title: "T2" });
    assert.ok(updated && updated.updated_at > before);
  });
});

// ============================================================
// softDelete / restore
// ============================================================
await suite("postRepo.softDelete / restore", async () => {
  await test("softDelete 应将 status 改为 archived", () => {
    setup();
    const p = postRepo.create({ slug: "del", title: "D", content: "x", status: "published", category: "tech", tags: null, author_id: ADMIN_ID, published_at: 1000, excerpt: null, cover_image: null });
    const ok = postRepo.softDelete(p.id);
    assert.equal(ok, true);
    const got = postRepo.byId(p.id);
    assert.equal(got?.status, "archived");
  });

  await test("softDelete 不存在 ID 返回 false", () => {
    assert.equal(postRepo.softDelete("nope"), false);
  });

  await test("restore 应将 status 改回 draft", () => {
    const p = postRepo.create({ slug: "res", title: "R", content: "x", status: "archived", category: "tech", tags: null, author_id: ADMIN_ID, published_at: null, excerpt: null, cover_image: null });
    const ok = postRepo.restore(p.id);
    assert.equal(ok, true);
    const got = postRepo.byId(p.id);
    assert.equal(got?.status, "draft");
  });
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