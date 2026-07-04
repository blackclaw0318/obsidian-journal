// ============================================================
// v0.34 Phase 4 P2: 资源计数 API 集成测试
// 测试: view API (24h 去重) + download API (无去重)
// ============================================================
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync } from "node:fs";

process.env.DATABASE_URL = "file:data/test-resource-counter-api.db";
process.env.SKIP_DB_INIT = "0";

const TEST_DB = "data/test-resource-counter-api.db";

const { mediaRepo, resetAllData } = await import("../../lib/repo.ts");
const { displayView, displayDownload, VIEW_DEDUPE_WINDOW_SEC } = await import("../../lib/counter.ts");
const { hashIp } = await import("../../lib/utils.ts");

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

function makeImage() {
  return mediaRepo.create({
    filename: "test.png",
    mime_type: "image/png",
    size: 1024,
    width: null, height: null, alt: null,
    url: "/uploads/test.png",
    storage_type: "local",
    category: "image",
    is_paid: false
  });
}

// ============================================================
// 测 view 路由 (透过 fetch 到本地 Next dev server? 不, 直接测逻辑)
// ============================================================
// 因为 Next.js API route 难直接测 (需要 fetch + 真实 server),
// 这里测 view 的核心 business logic: hasRecent + incView + log insert

test("view 1st: incView + log insert, display = base + 1", async () => {
  const { mediaCounterRepo, mediaAccessLogRepo } = await import("../../lib/repo.ts");
  const m = makeImage();
  const c0 = mediaCounterRepo.byId(m.id)!;
  const ipHash = hashIp("1.2.3.4");

  // 24h 内无记录 → 触发 incView
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "view", ipHash, VIEW_DEDUPE_WINDOW_SEC), false);
  mediaCounterRepo.incView(m.id);
  mediaAccessLogRepo.insert({
    media_id: m.id, access_type: "view", ip_hash: ipHash,
    user_agent_hash: null, country: null
  });

  const c1 = mediaCounterRepo.byId(m.id)!;
  assert.equal(c1.view_count, c0.view_count + 1);
  assert.equal(displayView(c1), c0.base_value + 1);
  assert.equal(mediaAccessLogRepo.hasRecent(m.id, "view", ipHash, VIEW_DEDUPE_WINDOW_SEC), true);
});

test("view 2nd (同 ip 24h 内): 跳过 incView (去重生效)", async () => {
  const { mediaCounterRepo, mediaAccessLogRepo } = await import("../../lib/repo.ts");
  const m = makeImage();
  const ipHash = hashIp("5.6.7.8");

  // 1st
  mediaCounterRepo.incView(m.id);
  mediaAccessLogRepo.insert({
    media_id: m.id, access_type: "view", ip_hash: ipHash,
    user_agent_hash: null, country: null
  });
  const c1 = mediaCounterRepo.byId(m.id)!;

  // 2nd - 去重跳过 (这里直接表达"不调用 incView")
  if (mediaAccessLogRepo.hasRecent(m.id, "view", ipHash, VIEW_DEDUPE_WINDOW_SEC)) {
    // dedup 分支, 不 incView
  } else {
    mediaCounterRepo.incView(m.id); // 这是理论上不执行的路径
  }

  const c2 = mediaCounterRepo.byId(m.id)!;
  assert.equal(c2.view_count, c1.view_count, "24h 内同 ip 不应 +1");
});

test("不同 ip: 各自独立 +1 (无跨 ip 去重)", async () => {
  const { mediaCounterRepo, mediaAccessLogRepo } = await import("../../lib/repo.ts");
  const m = makeImage();

  for (const ip of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
    const ipHash = hashIp(ip);
    if (mediaAccessLogRepo.hasRecent(m.id, "view", ipHash, VIEW_DEDUPE_WINDOW_SEC)) continue;
    mediaCounterRepo.incView(m.id);
    mediaAccessLogRepo.insert({
      media_id: m.id, access_type: "view", ip_hash: ipHash,
      user_agent_hash: null, country: null
    });
  }

  const c = mediaCounterRepo.byId(m.id)!;
  assert.equal(c.view_count, 3);
});

test("不同 access_type (view vs download) 独立计数", async () => {
  const { mediaCounterRepo, mediaAccessLogRepo } = await import("../../lib/repo.ts");
  const m = makeImage();
  const ipHash = hashIp("9.9.9.9");

  // 同时 view + download
  mediaCounterRepo.incView(m.id);
  mediaAccessLogRepo.insert({
    media_id: m.id, access_type: "view", ip_hash: ipHash,
    user_agent_hash: null, country: null
  });
  mediaCounterRepo.incDownload(m.id);
  mediaAccessLogRepo.insert({
    media_id: m.id, access_type: "download", ip_hash: ipHash,
    user_agent_hash: null, country: null
  });

  const c = mediaCounterRepo.byId(m.id)!;
  assert.equal(c.view_count, 1, "view +1");
  assert.equal(c.download_count, 1, "download +1");
  assert.equal(displayView(c) - c.base_value, 1);
  // v0.35: download seed 独立, 兑底为 base_value/2 但默认 50
  assert.equal(displayDownload(c) - c.seed_download_count, 1);
});

test("download 不去重 (用户多次下载每次 +1)", async () => {
  const { mediaCounterRepo, mediaAccessLogRepo } = await import("../../lib/repo.ts");
  const m = makeImage();
  const ipHash = hashIp("10.10.10.10");

  for (let i = 0; i < 5; i++) {
    // download 永远不查 hasRecent
    mediaCounterRepo.incDownload(m.id);
    mediaAccessLogRepo.insert({
      media_id: m.id, access_type: "download", ip_hash: ipHash,
      user_agent_hash: null, country: null
    });
  }

  const c = mediaCounterRepo.byId(m.id)!;
  assert.equal(c.download_count, 5);
  // v0.35: 下载种子独立于 view seed, 默认 50
  assert.equal(displayDownload(c), c.seed_download_count + 5);
});

test("hashIp 确定性 + 不可逆", () => {
  // 同样 IP → 同样 hash
  assert.equal(hashIp("1.2.3.4"), hashIp("1.2.3.4"));
  // 不同 IP → 不同 hash
  assert.notEqual(hashIp("1.2.3.4"), hashIp("1.2.3.5"));
  // hash 16 字符
  assert.equal(hashIp("anything").length, 16);
});