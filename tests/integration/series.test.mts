// ============================================================
// series repo 集成测试 (v0.11)
// 跑在独立 test DB (与 media.test 同样 pattern: env 设好 + import 触发自动 initSchema)
// ============================================================
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = resolve(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const TEST_DB = resolve(DATA_DIR, `test-series-${randomBytes(4).toString("hex")}.db`);
// env 必须在 import lib/db 之前设好, 这样 openDb() 用 test 路径
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.SKIP_DB_INIT = "0";
process.env.NODE_ENV = "test";

const { initSchema } = await import("../../lib/db.ts");
const { seriesRepo, postRepo, userRepo, resetAllData } = await import("../../lib/repo.ts");

// import 完自动 initSchema (SKIP_DB_INIT=0)
initSchema();  // 幂等, 保险

after(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    try { unlinkSync(f); } catch {}
  }
});

test("seriesRepo.create + byId", () => {
  const s = seriesRepo.create({
    slug: "react-tips", name: "React 技巧集",
    description: "实战 tips", cover_image: null,
    category: "tech", order: 0
  });
  assert.ok(s.id);
  assert.equal(s.slug, "react-tips");
  const got = seriesRepo.byId(s.id);
  assert.ok(got);
  assert.equal(got!.name, "React 技巧集");
});

test("seriesRepo.slugExists 唯一性", () => {
  assert.equal(seriesRepo.slugExists("react-tips"), true);
  assert.equal(seriesRepo.slugExists("react-tips", "xxx"), true);
  assert.equal(seriesRepo.slugExists("react-tips", seriesRepo.bySlug("react-tips")!.id), false);
  assert.equal(seriesRepo.slugExists("nonexistent"), false);
});

test("seriesRepo.listAll 排序 + 按 category 过滤", () => {
  seriesRepo.create({ slug: "life-1", name: "生活", description: null, cover_image: null, category: "life", order: 1 });
  seriesRepo.create({ slug: "tech-2", name: "TS 进阶", description: null, cover_image: null, category: "tech", order: 2 });
  const tech = seriesRepo.listAll("tech");
  assert.ok(tech.length >= 2);
  assert.ok(tech.every((s) => s.category === "tech"));
  const all = seriesRepo.listAll();
  assert.ok(all.length >= 3);
});

test("seriesRepo.update 部分字段", () => {
  const s = seriesRepo.bySlug("react-tips")!;
  const updated = seriesRepo.update(s.id, { name: "React 进阶技巧", order: 5 });
  assert.equal(updated!.name, "React 进阶技巧");
  assert.equal(updated!.order, 5);
});

test("seriesRepo.hardDelete 物理删除", () => {
  const s = seriesRepo.bySlug("life-1")!;
  const ok = seriesRepo.hardDelete(s.id);
  assert.equal(ok, true);
  assert.equal(seriesRepo.byId(s.id), null);
});

test("seriesRepo.bySlugWithPosts 关联 Post", () => {
  // 先建测试 user (FK 约束)
  const u = userRepo.create({ email: "t@t.com", password_hash: "x", name: "T", role: "admin" });
  const ser = seriesRepo.bySlug("react-tips")!;
  const post = postRepo.create({
    slug: "r1", title: "Hook 入门", excerpt: null, content: "x", cover_image: null,
    status: "published", category: "tech", tags: null, author_id: u.id,
    series_id: ser.id, published_at: Math.floor(Date.now() / 1000)
  });
  const res = seriesRepo.bySlugWithPosts("react-tips");
  assert.ok(res);
  assert.equal(res!.posts.length, 1);
  assert.equal(res!.posts[0].id, post.id);
  seriesRepo.hardDelete(ser.id);
  const post2 = postRepo.byId(post.id)!;
  assert.equal(post2.series_id, null);
});

test("seriesRepo.count 准确", () => {
  const c = seriesRepo.count("tech");
  assert.ok(typeof c === "number");
  assert.ok(c >= 1);
});
