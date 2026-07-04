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

test("displayDownload = base_value + download_count", () => {
  const m = makeMediaItem();
  const c0 = mediaCounterRepo.byId(m.id)!;
  for (let i = 0; i < 3; i++) mediaCounterRepo.incDownload(m.id);
  const c1 = mediaCounterRepo.byId(m.id)!;
  assert.equal(displayDownload(c1), c0.base_value + 3);
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