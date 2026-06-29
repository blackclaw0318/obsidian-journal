// ============================================================
// socials repo 集成测试 (v0.11)
// ============================================================
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = resolve(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const TEST_DB = resolve(DATA_DIR, `test-socials-${randomBytes(4).toString("hex")}.db`);
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.SKIP_DB_INIT = "0";
process.env.NODE_ENV = "test";

const { initSchema } = await import("../../lib/db.ts");
const { socialRepo, resetAllData } = await import("../../lib/repo.ts");

initSchema();

after(() => {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    try { unlinkSync(f); } catch {}
  }
});

test("socialRepo.create + byId", () => {
  const s = socialRepo.create({
    platform: "github", label: "GitHub", url: "https://github.com/x",
    icon: null, order: 0, visible: 1
  });
  assert.ok(s.id);
  const got = socialRepo.byId(s.id);
  assert.equal(got!.label, "GitHub");
});

test("socialRepo.list 默认 visible=true 过滤", () => {
  socialRepo.create({ platform: "rss", label: "Hidden RSS", url: "https://rss", icon: null, order: 99, visible: 0 });
  const visible = socialRepo.list(true);
  const all = socialRepo.list(false);
  assert.ok(visible.every((s) => s.visible === 1));
  assert.ok(all.length > visible.length);
});

test("socialRepo.update 切 visible 0/1", () => {
  const s = socialRepo.create({ platform: "wechat", label: "WX", url: "wx://x", icon: null, order: 1, visible: 1 });
  const u = socialRepo.update(s.id, { visible: 0 });
  assert.equal(u!.visible, 0);
});

test("socialRepo.hardDelete 物理删除", () => {
  const s = socialRepo.create({ platform: "email", label: "del", url: "x@x.com", icon: null, order: 0, visible: 1 });
  assert.equal(socialRepo.hardDelete(s.id), true);
  assert.equal(socialRepo.byId(s.id), null);
});

test("socialRepo.count", () => {
  const c = socialRepo.count();
  assert.ok(c >= 3);
});
