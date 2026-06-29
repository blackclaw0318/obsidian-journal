// ============================================================
// dailyStats repo 集成测试 (v0.11)
// ============================================================
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = resolve(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const TEST_DB = resolve(DATA_DIR, `test-daily-${randomBytes(4).toString("hex")}.db`);
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.SKIP_DB_INIT = "0";
process.env.NODE_ENV = "test";

const { initSchema } = await import("../../lib/db.ts");
const { dailyStatsRepo, resetAllData } = await import("../../lib/repo.ts");

initSchema();

after(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    try { unlinkSync(f); } catch {}
  }
});

test("dailyStatsRepo.upsert 创建", () => {
  const today = new Date().toISOString().slice(0, 10);
  const r = dailyStatsRepo.upsert(today, { pv: 10, uv: 3 });
  assert.equal(r.pv, 10);
  assert.equal(r.uv, 3);
});

test("dailyStatsRepo.upsert 累加", () => {
  const today = new Date().toISOString().slice(0, 10);
  dailyStatsRepo.upsert(today, { pv: 5, post_views: 2 });
  const r = dailyStatsRepo.upsert(today, { pv: 3, post_views: 1 });
  assert.equal(r.pv, 10 + 5 + 3);
  assert.equal(r.post_views, 2 + 1);
});

test("dailyStatsRepo.recent 7 天", () => {
  const r = dailyStatsRepo.recent(7);
  assert.ok(Array.isArray(r));
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(r.some((d) => d.date === today));
});
