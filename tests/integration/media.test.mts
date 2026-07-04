// ============================================================
// 媒体库 (Media) repo 集成测试 (Phase 3.6)
// 测试 DB 隔离
// ============================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

process.env.DATABASE_URL = "file:data/test-media.db";
process.env.SKIP_DB_INIT = "0";

const TEST_DB = "data/test-media.db";

const { mediaRepo, resetAllData } = await import("../../lib/repo.ts");
const { categoryFromMime } = await import("../../lib/media-categories.ts");

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
});

function makeMediaItem(opts: Partial<{ mime: string; size: number; alt: string; filename: string }> = {}) {
  return mediaRepo.create({
    filename: opts.filename ?? `${randomBytes(4).toString("hex")}.png`,
    mime_type: opts.mime ?? "image/png",
    size: opts.size ?? 1024,
    width: null,
    height: null,
    alt: opts.alt ?? null,
    url: `/uploads/${opts.filename ?? "x.png"}`,
    storage_type: "local",
    category: categoryFromMime(opts.mime ?? "image/png"),
    is_paid: false
  });
}

test("mediaRepo.create + byId", () => {
  const m = makeMediaItem({ alt: "测试" });
  assert.ok(m.id.startsWith("med_"));
  assert.equal(m.alt, "测试");

  const found = mediaRepo.byId(m.id);
  assert.equal(found?.filename, m.filename);
});

test("mediaRepo.byFilename 唯一性", () => {
  makeMediaItem({ filename: "abc.png" });
  assert.ok(mediaRepo.byFilename("abc.png"));
  assert.equal(mediaRepo.byFilename("not-exists.png"), null);
});

test("mediaRepo.listAll mimePrefix 过滤", () => {
  makeMediaItem({ mime: "image/png", filename: "a.png" });
  makeMediaItem({ mime: "image/jpeg", filename: "b.jpg" });
  makeMediaItem({ mime: "video/mp4", filename: "c.mp4" });
  makeMediaItem({ mime: "application/pdf", filename: "d.pdf" });

  const all = mediaRepo.listAll({});
  assert.equal(all.total, 4);

  const images = mediaRepo.listAll({ mimePrefix: "image/" });
  assert.equal(images.total, 2);

  const videos = mediaRepo.listAll({ mimePrefix: "video/" });
  assert.equal(videos.total, 1);
});

test("mediaRepo.listAll 搜索 filename/alt", () => {
  makeMediaItem({ filename: "logo.png", alt: "公司 logo" });
  makeMediaItem({ filename: "banner.png", alt: null });
  makeMediaItem({ filename: "random.txt", alt: null }); // 不会进 (mim 不是默认), 跳过

  // 默认 mime 过滤不限, 用 q 搜
  const all = mediaRepo.listAll({ q: "logo" });
  assert.ok(all.total >= 1);
  assert.ok(all.items.some((i) => i.filename === "logo.png"));

  const altSearch = mediaRepo.listAll({ q: "公司" });
  assert.ok(altSearch.items.some((i) => i.alt === "公司 logo"));
});

test("mediaRepo.update alt", () => {
  const m = makeMediaItem({ alt: "old" });
  const updated = mediaRepo.update(m.id, { alt: "new" });
  assert.equal(updated?.alt, "new");
  assert.equal(mediaRepo.byId(m.id)?.alt, "new");
});

test("mediaRepo.hardDelete 级联清 media_usages", () => {
  const m = makeMediaItem({ filename: "del.png" });
  mediaRepo.addUsage(m.id, "post", "post_1", "cover_image");
  mediaRepo.addUsage(m.id, "post", "post_2", "cover_image");
  mediaRepo.addUsage(m.id, "chapter", "ch_1", null);

  const usages = mediaRepo.listUsages(m.id);
  assert.equal(usages.length, 3);

  const result = mediaRepo.hardDelete(m.id);
  assert.equal(result.mediaOk, true);
  assert.equal(result.usageCount, 3);
  assert.equal(mediaRepo.byId(m.id), null);
  assert.equal(mediaRepo.listUsages(m.id).length, 0);
});

test("mediaRepo.addUsage UNIQUE 去重", () => {
  const m = makeMediaItem({ filename: "u.png" });
  mediaRepo.addUsage(m.id, "post", "p1", "cover");
  mediaRepo.addUsage(m.id, "post", "p1", "cover"); // 重复
  mediaRepo.addUsage(m.id, "post", "p1", "cover"); // 重复
  const usages = mediaRepo.listUsages(m.id);
  assert.equal(usages.length, 1, "UNIQUE(media_id, ref_type, ref_id, field) 应去重");
});

test("mediaRepo.removeUsage 按 field 匹配", () => {
  const m = makeMediaItem({ filename: "u.png" });
  mediaRepo.addUsage(m.id, "post", "p1", "cover");
  mediaRepo.addUsage(m.id, "post", "p1", "body");
  assert.equal(mediaRepo.listUsages(m.id).length, 2);

  mediaRepo.removeUsage(m.id, "post", "p1", "cover");
  const after = mediaRepo.listUsages(m.id);
  assert.equal(after.length, 1);
  assert.equal(after[0].field, "body");
});

test("mediaRepo.count + totalSize 统计", () => {
  assert.equal(mediaRepo.count(), 0);
  assert.equal(mediaRepo.totalSize(), 0);

  makeMediaItem({ size: 1024 });
  makeMediaItem({ size: 2048 });
  makeMediaItem({ size: 512 });

  assert.equal(mediaRepo.count(), 3);
  assert.equal(mediaRepo.totalSize(), 1024 + 2048 + 512);
});
