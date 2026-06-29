// ============================================================
// 视频 + 视频系列 repo 集成测试 (Phase 3.4)
// 跑在独立 test DB (DATABASE_URL=file:data/test-videos.db)
// ============================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync } from "node:fs";

// 测试 DB 隔离
process.env.DATABASE_URL = "file:data/test-videos.db";
process.env.SKIP_DB_INIT = "0";

const TEST_DB = "data/test-videos.db";

const { videoRepo, videoSeriesRepo, resetAllData } = await import("../../lib/repo.ts");

before(() => {
  // 清理可能的残留
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  if (existsSync(`${TEST_DB}-wal`)) unlinkSync(`${TEST_DB}-wal`);
  if (existsSync(`${TEST_DB}-shm`)) unlinkSync(`${TEST_DB}-shm`);
});

after(() => {
  // 清理测试 DB
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    if (existsSync(f)) unlinkSync(f);
  }
});

beforeEach(() => {
  resetAllData();
});

test("videoSeriesRepo.create + byId", () => {
  const s = videoSeriesRepo.create({
    slug: "s1",
    title: "系列 1",
    description: "测试",
    cover_image: null,
    order: 1
  });
  assert.ok(s.id.startsWith("vs_"));
  assert.equal(s.slug, "s1");

  const found = videoSeriesRepo.byId(s.id);
  assert.ok(found);
  assert.equal(found.title, "系列 1");
});

test("videoSeriesRepo.listWithCount 统计视频数", () => {
  const s1 = videoSeriesRepo.create({ slug: "s1", title: "S1", description: null, cover_image: null, order: 1 });
  videoSeriesRepo.create({ slug: "s2", title: "S2", description: null, cover_image: null, order: 2 });

  videoRepo.create({
    series_id: s1.id,
    slug: "v1",
    title: "V1",
    description: null,
    embed_url: "https://example.com/v1",
    cover_image: null,
    duration: 60,
    status: "draft",
    published_at: null
  });
  videoRepo.create({
    series_id: s1.id,
    slug: "v2",
    title: "V2",
    description: null,
    embed_url: "https://example.com/v2",
    cover_image: null,
    duration: null,
    status: "published",
    published_at: Math.floor(Date.now() / 1000)
  });

  const result = videoSeriesRepo.listWithCount();
  const s1Row = result.find((r) => r.series.id === s1.id);
  assert.equal(s1Row?.videoCount, 2);
  const s2Row = result.find((r) => r.series.id !== s1.id);
  assert.equal(s2Row?.videoCount, 0);
});

test("videoSeriesRepo.hardDelete 级联把 videos.series_id 置 NULL", () => {
  const s = videoSeriesRepo.create({ slug: "s1", title: "S1", description: null, cover_image: null, order: 1 });
  const v = videoRepo.create({
    series_id: s.id,
    slug: "v1",
    title: "V1",
    description: null,
    embed_url: "https://example.com/v1",
    cover_image: null,
    duration: null,
    status: "draft",
    published_at: null
  });

  videoSeriesRepo.hardDelete(s.id);
  const vAfter = videoRepo.byId(v.id);
  assert.equal(vAfter?.series_id, null, "ON DELETE SET NULL 应生效");
});

test("videoSeriesRepo.slugExists 唯一性", () => {
  videoSeriesRepo.create({ slug: "s1", title: "S1", description: null, cover_image: null, order: 1 });
  assert.equal(videoSeriesRepo.slugExists("s1"), true);
  assert.equal(videoSeriesRepo.slugExists("s2"), false);
  // excludeId
  const s = videoSeriesRepo.create({ slug: "s3", title: "S3", description: null, cover_image: null, order: 1 });
  assert.equal(videoSeriesRepo.slugExists("s3", s.id), false);
});

test("videoRepo.create + bySlug", () => {
  const v = videoRepo.create({
    series_id: null,
    slug: "test-v1",
    title: "Test",
    description: "desc",
    embed_url: "https://example.com/v",
    cover_image: null,
    duration: 100,
    status: "draft",
    published_at: null
  });
  assert.ok(v.id.startsWith("vid_"));
  assert.equal(v.view_count, 0);

  const found = videoRepo.bySlug("test-v1");
  assert.equal(found?.title, "Test");
});

test("videoRepo.listAll 支持 status/series/搜索", () => {
  const s = videoSeriesRepo.create({ slug: "s1", title: "S1", description: null, cover_image: null, order: 1 });
  for (let i = 0; i < 5; i++) {
    videoRepo.create({
      series_id: i % 2 === 0 ? s.id : null,
      slug: `v${i}`,
      title: `视频 ${i}`,
      description: null,
      embed_url: `https://example.com/v${i}`,
      cover_image: null,
      duration: null,
      status: i < 2 ? "published" : "draft",
      published_at: i < 2 ? Math.floor(Date.now() / 1000) : null
    });
  }

  const all = videoRepo.listAll({});
  assert.equal(all.total, 5);

  const published = videoRepo.listAll({ status: "published" });
  assert.equal(published.total, 2);

  const inSeries = videoRepo.listAll({ seriesId: s.id });
  assert.equal(inSeries.total, 3);

  const searched = videoRepo.listAll({ q: "视频 1" });
  assert.equal(searched.total, 1);
});

test("videoRepo.update 部分字段", () => {
  const v = videoRepo.create({
    series_id: null,
    slug: "v1",
    title: "V1",
    description: null,
    embed_url: "https://example.com/v1",
    cover_image: null,
    duration: 60,
    status: "draft",
    published_at: null
  });
  const updated = videoRepo.update(v.id, { title: "新标题", duration: 120 });
  assert.equal(updated?.title, "新标题");
  assert.equal(updated?.duration, 120);
  assert.equal(updated?.slug, "v1", "未变更字段保持");
});

test("videoRepo.softDelete / restore", () => {
  const v = videoRepo.create({
    series_id: null,
    slug: "v1",
    title: "V1",
    description: null,
    embed_url: "https://example.com/v1",
    cover_image: null,
    duration: null,
    status: "published",
    published_at: Math.floor(Date.now() / 1000)
  });
  assert.equal(videoRepo.softDelete(v.id), true);
  assert.equal(videoRepo.byId(v.id)?.status, "archived");

  assert.equal(videoRepo.restore(v.id), true);
  assert.equal(videoRepo.byId(v.id)?.status, "draft");
});

test("videoRepo.slugExists 唯一性", () => {
  videoRepo.create({
    series_id: null,
    slug: "v1",
    title: "V1",
    description: null,
    embed_url: "https://example.com/v1",
    cover_image: null,
    duration: null,
    status: "draft",
    published_at: null
  });
  assert.equal(videoRepo.slugExists("v1"), true);
  const v = videoRepo.create({
    series_id: null,
    slug: "v2",
    title: "V2",
    description: null,
    embed_url: "https://example.com/v2",
    cover_image: null,
    duration: null,
    status: "draft",
    published_at: null
  });
  // excludeId 时不与自己冲突
  assert.equal(videoRepo.slugExists("v2", v.id), false);
  assert.equal(videoRepo.slugExists("v2", "vid_other"), true);
});
