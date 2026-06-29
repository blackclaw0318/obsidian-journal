// ============================================================
// 页面 (Page) repo 集成测试 (Phase 3.5)
// 跑在独立 test DB
// ============================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

process.env.DATABASE_URL = "file:data/test-pages.db";
process.env.SKIP_DB_INIT = "0";

const TEST_DB = "data/test-pages.db";

const { pageRepo, userRepo, resetAllData } = await import("../../lib/repo.ts");

before(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    if (existsSync(f)) unlinkSync(f);
  }
});

after(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    if (existsSync(f)) unlinkSync(f);
  }
});

beforeEach(() => {
  resetAllData();
  // 测试需要至少 1 个 author
  userRepo.create({
    email: "test@test.local",
    password_hash: "x",
    name: "Test",
    role: "admin"
  });
});

function getUserId(): string {
  return userRepo.byEmail("test@test.local")!.id;
}

test("pageRepo.create + byId", () => {
  const p = pageRepo.create({
    slug: "about",
    title: "关于",
    description: "desc",
    blocks: "[]",
    status: "draft",
    author_id: getUserId(),
    published_at: null
  });
  assert.ok(p.id.startsWith("pg_"));
  assert.equal(p.view_count, 0);

  const found = pageRepo.byId(p.id);
  assert.equal(found?.title, "关于");
});

test("pageRepo.listAll 支持 status/搜索", () => {
  for (let i = 0; i < 4; i++) {
    pageRepo.create({
      slug: `p${i}`,
      title: `Page ${i}`,
      description: null,
      blocks: "[]",
      status: i < 2 ? "published" : "draft",
      author_id: getUserId(),
      published_at: i < 2 ? Math.floor(Date.now() / 1000) : null
    });
  }
  const all = pageRepo.listAll({});
  assert.equal(all.total, 4);

  const pub = pageRepo.listAll({ status: "published" });
  assert.equal(pub.total, 2);

  const search = pageRepo.listAll({ q: "Page 1" });
  assert.equal(search.total, 1);
});

test("pageRepo.slugExists 唯一性", () => {
  pageRepo.create({
    slug: "a",
    title: "A",
    description: null,
    blocks: "[]",
    status: "draft",
    author_id: getUserId(),
    published_at: null
  });
  assert.equal(pageRepo.slugExists("a"), true);
  assert.equal(pageRepo.slugExists("b"), false);

  const p = pageRepo.create({
    slug: "c",
    title: "C",
    description: null,
    blocks: "[]",
    status: "draft",
    author_id: getUserId(),
    published_at: null
  });
  assert.equal(pageRepo.slugExists("c", p.id), false);
  assert.equal(pageRepo.slugExists("c", "pg_other"), true);
});

test("pageRepo.update 部分字段", () => {
  const p = pageRepo.create({
    slug: "a",
    title: "A",
    description: "old",
    blocks: "[]",
    status: "draft",
    author_id: getUserId(),
    published_at: null
  });
  const updated = pageRepo.update(p.id, { title: "新标题", description: "new" });
  assert.equal(updated?.title, "新标题");
  assert.equal(updated?.description, "new");
  assert.equal(updated?.slug, "a", "未变更字段保持");
});

test("pageRepo.softDelete / restore", () => {
  const p = pageRepo.create({
    slug: "a",
    title: "A",
    description: null,
    blocks: "[]",
    status: "published",
    author_id: getUserId(),
    published_at: Math.floor(Date.now() / 1000)
  });
  assert.equal(pageRepo.softDelete(p.id), true);
  assert.equal(pageRepo.byId(p.id)?.status, "archived");

  assert.equal(pageRepo.restore(p.id), true);
  assert.equal(pageRepo.byId(p.id)?.status, "draft");
});

test("pageRepo.bySlug 保留公开页查询能力", () => {
  pageRepo.create({
    slug: "about",
    title: "About",
    description: null,
    blocks: '[{"type":"paragraph","text":"hi"}]',
    status: "published",
    author_id: getUserId(),
    published_at: Math.floor(Date.now() / 1000)
  });
  const found = pageRepo.bySlug("about");
  assert.equal(found?.title, "About");
  assert.equal(found?.status, "published");
});
