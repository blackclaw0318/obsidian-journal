// ============================================================
// v0.34 Phase 4: Resource 计数 (mediaCounterRepo + mediaAccessLogRepo) 集成测试
// 验证: counter 创建 / incView / incDownload / 24h 去重
// ============================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

process.env.DATABASE_URL = "file:data/test-resource-counters.db";
process.env.SKIP_DB_INIT = "0";

const TEST_DB = "data/test-resource-counters.db";

const { mediaRepo, mediaCounterRepo, mediaAccessLogRepo, resetAllData } = await import("../../lib/repo.ts");
const { displayView, displayDownload, VIEW_DEDUPE_WINDOW_SEC } = await import("../../lib/counter.ts");

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

function makeMediaItem(mime = "image/png") {
  return mediaRepo.create({
    filename: `${randomBytes(4).toString("hex")}.png`,
    mime_type: mime,
    size: 1024,
    width: null, height: null, alt: null,
    url: "/uploads/x.png",
    storage_type: "local",
    category: mime.startsWith("image/") ? "image" : mime.startsWith("audio/") ? "audio" : "document",
    is_paid: false
  });
}

// ============================================================
// 1. create 时自动写入 counter (base_value 100-999)
// ============================================================
test("mediaRepo.create 自动写入 counter, base_value ∈ [100, 999]", () => {
  const m = makeMediaItem();
  const c = mediaCounterRepo.byId(m.id);
  assert.ok(c, "counter 应存在");
  assert.ok(c!.base_value >= 100 && c!.base_value <= 999, `base_value 应 ∈ [100,999], 实际 ${c!.base_value}`);
  assert.equal(c!.view_count, 0);
  assert.equal(c!.download_count, 0);
});

test("多个资源 base_value 应有差异 (随机性)", () => {
  const bases: number[] = [];
  for (let i = 0; i < 20; i++) {
    const m = makeMediaItem();
    bases.push(mediaCounterRepo.byId(m.id)!.base_value);
  }
  const unique = new Set(bases);
  assert.ok(unique.size >= 10, `20 个应有 ≥10 个不同 base_value, 实际 ${unique.size}`);
});

// ============================================================
// 2. incView / incDownload 累加
// ============================================================
test("incView 累加 view_count", () => {
  const m = makeMediaItem();
  const c0 = mediaCounterRepo.byId(m.id)!;
  mediaCounterRepo.incView(m.id);
  mediaCounterRepo.incView(m.id);
  mediaCounterRepo.incView(m.id);
  const c1 = mediaCounterRepo.byId(m.id)!;
  assert.equal(c1.view_count, 3);
  assert.ok(c1.last_viewed_at! > 0);
});

test("incDownload 累加 download_count, 不影响 view_count", () => {
  const m = makeMediaItem();
  mediaCounterRepo.incView(m.id);
  mediaCounterRepo.incDownload(m.id);
  mediaCounterRepo.incDownload(m.id);
  const c = mediaCounterRepo.byId(m.id)!;
  assert.equal(c.view_count, 1);
  assert.equal(c.download_count, 2);
});

test("displayView = base_value + view_count", () => {
  const m = makeMediaItem();
  const c0 = mediaCounterRepo.byId(m.id)!;
  for (let i = 0; i < 5; i++) mediaCounterRepo.incView(m.id);
  const c1 = mediaCounterRepo.byId(m.id)!;
  assert.equal(displayView(c1), c0.base_value + 5);
});

test("displayDownload = seed_download_count + download_count (v0.35)", () => {
  const m = makeMediaItem();
  const c0 = mediaCounterRepo.byId(m.id)!;
  for (let i = 0; i < 3; i++) mediaCounterRepo.incDownload(m.id);
  const c1 = mediaCounterRepo.byId(m.id)!;
  // v0.35: 下载种子独立可调, 默认 50
  assert.equal(displayDownload(c1), c0.seed_download_count + 3);
});

// ============================================================
// 3. listByMediaIds (公开页批量取 counter)
// ============================================================
test("listByMediaIds 批量返回 counters", () => {
  const a = makeMediaItem();
  const b = makeMediaItem();
  mediaCounterRepo.incView(a.id);
  mediaCounterRepo.incView(b.id);
  mediaCounterRepo.incView(b.id);
  const map = mediaCounterRepo.listByMediaIds([a.id, b.id]);
  assert.equal(map.size, 2);
  assert.equal(map.get(a.id)!.view_count, 1);
  assert.equal(map.get(b.id)!.view_count, 2);
});

test("listByMediaIds 空数组返回空 Map (边界)", () => {
  const map = mediaCounterRepo.listByMediaIds([]);
  assert.equal(map.size, 0);
});

// ============================================================
// 4. access log + 24h 去重
// ============================================================
test("mediaAccessLogRepo.insert 写入记录", () => {
  const m = makeMediaItem();
  const log = mediaAccessLogRepo.insert({
    media_id: m.id,
    access_type: "view",
    ip_hash: "abc123",
    user_agent_hash: null,
    country: "CN"
  });
  assert.ok(log.id);
  assert.equal(log.access_type, "view");
});

test("hasRecent: 24h 内同 ip_hash + view 已记 → 返回 true", () => {
  const m = makeMediaItem();
  mediaAccessLogRepo.insert({ media_id: m.id, access_type: "view", ip_hash: "h1", user_agent_hash: null, country: null });
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "view", "h1", VIEW_DEDUPE_WINDOW_SEC), true);
});

test("hasRecent: 同 ip 但不同 access_type (download) → 返回 false", () => {
  const m = makeMediaItem();
  mediaAccessLogRepo.insert({ media_id: m.id, access_type: "view", ip_hash: "h1", user_agent_hash: null, country: null });
  // 下载记录不存在 → 应返回 false
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "download", "h1", VIEW_DEDUPE_WINDOW_SEC), false);
});

test("hasRecent: 不同 ip_hash → 返回 false", () => {
  const m = makeMediaItem();
  mediaAccessLogRepo.insert({ media_id: m.id, access_type: "view", ip_hash: "h1", user_agent_hash: null, country: null });
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "view", "h2", VIEW_DEDUPE_WINDOW_SEC), false);
});

test("hasRecent: 24h 窗口外 (created_at 老) → 返回 false", async () => {
  const m = makeMediaItem();
  // 直接 SQL 写入一个 25h 前的 log
  const { db } = await import("../../lib/db.ts");
  const old = Math.floor(Date.now() / 1000) - 25 * 3600;
  db.prepare(`INSERT INTO media_access_logs (id, media_id, access_type, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run("log_old", m.id, "view", "h1", old);
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "view", "h1", VIEW_DEDUPE_WINDOW_SEC), false);
});

// ============================================================
// 5. listByCategory (公开页 tabs)
// ============================================================
test("mediaRepo.listByCategory 按 category 筛", () => {
  const img1 = makeMediaItem("image/png");
  const img2 = makeMediaItem("image/jpeg");
  const pdf = makeMediaItem("application/pdf");
  const mp3 = makeMediaItem("audio/mpeg");

  const imgs = mediaRepo.listByCategory({ category: "image" });
  assert.equal(imgs.total, 2);
  assert.equal(imgs.items.length, 2);

  const docs = mediaRepo.listByCategory({ category: "document" });
  assert.equal(docs.total, 1);
  assert.equal(docs.items[0].id, pdf.id);

  const audios = mediaRepo.listByCategory({ category: "audio" });
  assert.equal(audios.total, 1);
  assert.equal(audios.items[0].id, mp3.id);
});

// ============================================================
// 6. v0.35: patchSeed + bulkAdjustSeed + seed_enabled (老板 2026-07-04 20:37)
// ============================================================

test("v0.35: patchSeed 可单独改 base_value", () => {
  const m = makeMediaItem();
  const updated = mediaCounterRepo.patchSeed(m.id, { base_value: 999 });
  assert.ok(updated);
  assert.equal(updated!.base_value, 999);
  assert.equal(displayView(updated!), 999);  // 0 real + 999 seed
});

test("v0.35: patchSeed 超过 999 被 CHECK 拒绝", () => {
  const m = makeMediaItem();
  assert.throws(
    () => mediaCounterRepo.patchSeed(m.id, { base_value: 5000 }),
    /CHECK constraint/
  );
});

test("v0.35: patchSeed 可单独改 seed_download_count (独立于 view seed)", () => {
  const m = makeMediaItem();
  const updated = mediaCounterRepo.patchSeed(m.id, { seed_download_count: 200 });
  assert.ok(updated);
  assert.equal(updated!.seed_download_count, 200);
  assert.equal(displayDownload(updated!), 200);  // 0 real + 200 seed
});

test("v0.35: patchSeed 可关 seed_enabled (只显示真实数)", () => {
  const m = makeMediaItem();
  mediaCounterRepo.incView(m.id);
  const before = mediaCounterRepo.byId(m.id)!;
  // seed_enabled 默认 1, 关闭后 view 数从 base+1 变为 1
  assert.equal(displayView(before), before.base_value + 1);

  const after = mediaCounterRepo.patchSeed(m.id, { seed_enabled: 0 })!;
  assert.equal(displayView(after), 1);  // 只显示真实数
  assert.equal(displayDownload(after), 0);
});

test("v0.35: bulkAdjustSeed 全站 +50 装门面 (CHECK 上限 999)", () => {
  for (let i = 0; i < 3; i++) makeMediaItem();
  const before = mediaCounterRepo.listByMediaIds(
    mediaRepo.listAll({ limit: 100 }).items.map((m) => m.id)
  );
  const beforeBaseValues = Array.from(before.values()).map((c) => c.base_value);

  const result = mediaCounterRepo.bulkAdjustSeed(50);
  assert.equal(result.affected, 3);

  const after = mediaCounterRepo.listByMediaIds(
    mediaRepo.listAll({ limit: 100 }).items.map((m) => m.id)
  );
  const afterBaseValues = Array.from(after.values()).map((c) => c.base_value);
  for (let i = 0; i < 3; i++) {
    assert.equal(afterBaseValues[i], beforeBaseValues[i] + 50);
  }
});

test("v0.35: bulkAdjustSeed 按 category 过滤 (只调图片)", () => {
  const img = makeMediaItem("image/png");
  const aud = makeMediaItem("audio/mpeg");
  const pdf = makeMediaItem("application/pdf");

  // 先置图片 100, audio/pdf 设为 999 (避免随机 干扰)
  mediaCounterRepo.patchSeed(img.id, { base_value: 100 });
  mediaCounterRepo.patchSeed(aud.id, { base_value: 999 });
  mediaCounterRepo.patchSeed(pdf.id, { base_value: 999 });

  const result = mediaCounterRepo.bulkAdjustSeed(50, { category: "image" });
  assert.equal(result.affected, 1, "只调 1 个图片");

  const imgCounter = mediaCounterRepo.byId(img.id)!;
  const audCounter = mediaCounterRepo.byId(aud.id)!;
  const pdfCounter = mediaCounterRepo.byId(pdf.id)!;
  assert.equal(imgCounter.base_value, 150);  // 100 + 50
  assert.equal(audCounter.base_value, 999);  // 不变
  assert.equal(pdfCounter.base_value, 999);  // 不变
});

test("v0.35: randomizeAllSeeds 重置为 100-999 随机", () => {
  const m = makeMediaItem();
  mediaCounterRepo.patchSeed(m.id, { base_value: 100 });  // 设为最小值
  const result = mediaCounterRepo.randomizeAllSeeds();
  assert.equal(result.affected, 1);
  const c = mediaCounterRepo.byId(m.id)!;
  assert.ok(c.base_value >= 100 && c.base_value <= 999, `base_value 应 ∈ [100,999], 实际 ${c.base_value}`);
});