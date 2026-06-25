// ============================================================
// auth.test.mts - Phase 3.1 集成测试
// 严守 node:sqlite 隔离: 临时 test-auth.db + 覆盖 DATABASE_URL
// 用 node:assert + mini runner, 跟 repo.test.mts 风格一致
// ============================================================
import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-auth.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { initSchema, db } = await import("../../lib/db.ts");
const { userRepo } = await import("../../lib/repo.ts");
const auth = await import("../../lib/auth.ts");

initSchema();

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

function reset() {
  db.exec("DELETE FROM sessions");
  db.exec("DELETE FROM users");
}

// ============================================================
// hashPassword / verifyPassword
// ============================================================
await suite("hashPassword / verifyPassword", async () => {
  await test("应该能哈希并验证密码", () => {
    const hash = auth.hashPassword("hunter2");
    assert.match(hash, /^\$2[aby]\$10\$/);
    assert.equal(auth.verifyPassword("hunter2", hash), true);
    assert.equal(auth.verifyPassword("wrong", hash), false);
  });

  await test("verifyPassword 应拒绝非 bcrypt 格式 hash", () => {
    assert.equal(auth.verifyPassword("any", "not-a-bcrypt-hash"), false);
    assert.equal(auth.verifyPassword("any", ""), false);
  });

  await test("不同密码应产生不同 hash", () => {
    const h1 = auth.hashPassword("a");
    const h2 = auth.hashPassword("b");
    assert.notEqual(h1, h2);
  });
});

// ============================================================
// Session 生命周期
// ============================================================
await suite("Session 生命周期", async () => {
  await test("createSessionJwt 写 sessions 表 + 返回 JWT", async () => {
    const u = userRepo.create({ email: "s1@t", password_hash: "x", name: "S1", role: "admin" });
    const { jwt, expiresAt } = await auth.createSessionJwt(u.id);
    // JWT 是 base64url 编码, 以 eyJ 开头
    assert.match(jwt, /^eyJ/);
    assert.ok(expiresAt > Math.floor(Date.now() / 1000));
    const row = db.prepare("SELECT * FROM sessions WHERE user_id = ?").get(u.id);
    assert.ok(row);
  });

  await test("JWT payload 解析后 sub = userId, sid = session id", async () => {
    const u = userRepo.create({ email: "s2@t", password_hash: "x", name: null, role: "admin" });
    const { jwt } = await auth.createSessionJwt(u.id);
    const payload = await auth.verifyJwt(jwt);
    assert.equal(payload?.sub, u.id);
    assert.match(payload?.sid ?? "", /^s_/);
  });

  await test("findSessionBySid 过期 sid 返回 null", async () => {
    const u = userRepo.create({ email: "s3@t", password_hash: "x", name: null, role: "admin" });
    const { jwt } = await auth.createSessionJwt(u.id);
    const payload = await auth.verifyJwt(jwt);
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(Math.floor(Date.now() / 1000) - 1, payload!.sid);
    assert.equal(auth.findSessionBySid(payload!.sid), null);
  });

  await test("deleteSessionBySid 移除记录", async () => {
    const u = userRepo.create({ email: "s4@t", password_hash: "x", name: null, role: "admin" });
    const { jwt } = await auth.createSessionJwt(u.id);
    const payload = await auth.verifyJwt(jwt);
    auth.deleteSessionBySid(payload!.sid);
    assert.equal(auth.findSessionBySid(payload!.sid), null);
  });

  await test("deleteAllUserSessions 清空该用户所有 session", async () => {
    const u = userRepo.create({ email: "s5@t", password_hash: "x", name: null, role: "admin" });
    await auth.createSessionJwt(u.id);
    await auth.createSessionJwt(u.id);
    await auth.createSessionJwt(u.id);
    auth.deleteAllUserSessions(u.id);
    const r = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE user_id = ?").get(u.id) as { c: number };
    assert.equal(r.c, 0);
  });
});

// ============================================================
// JWT 签发/验证
// ============================================================
await suite("JWT 签发/验证", async () => {
  await test("signJwt + verifyJwt 圆环成功", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = await auth.signJwt("user-1", "sess-1", exp);
    const payload = await auth.verifyJwt(token);
    assert.equal(payload?.sub, "user-1");
    assert.equal(payload?.sid, "sess-1");
  });

  await test("篡改 token 应失败", async () => {
    const t = await auth.signJwt("u1", "s1", Math.floor(Date.now() / 1000) + 60);
    assert.equal(await auth.verifyJwt(t + "x"), null);
  });

  await test("过期 token 应失败", async () => {
    const t = await auth.signJwt("u1", "s1", Math.floor(Date.now() / 1000) - 1);
    assert.equal(await auth.verifyJwt(t), null);
  });
});

// ============================================================
// login() 业务
// ============================================================
await suite("login() 业务", async () => {
  function makeAdmin() {
    reset();
    return userRepo.create({
      email: "admin@test.local",
      password_hash: auth.hashPassword("correct-horse"),
      name: "Admin",
      role: "admin"
    });
  }

  await test("正确凭据返回 user + jwt", async () => {
    makeAdmin();
    const r = await auth.login("admin@test.local", "correct-horse");
    assert.equal(r.ok, true);
    assert.equal(r.user?.email, "admin@test.local");
    assert.equal((r.user as any)?.password_hash, undefined);
    assert.match(r.jwt!, /^eyJ/);
  });

  await test("邮箱大小写/前后空格不敏感", async () => {
    makeAdmin();
    const r = await auth.login("  Admin@Test.LOCAL  ", "correct-horse");
    assert.equal(r.ok, true);
  });

  await test("错误密码返回 invalid_credentials", async () => {
    makeAdmin();
    const r = await auth.login("admin@test.local", "wrong");
    assert.equal(r.ok, false);
    assert.equal(r.error, "invalid_credentials");
  });

  await test("不存在用户也返回 invalid_credentials (不泄露存在性)", async () => {
    makeAdmin();
    const r = await auth.login("ghost@test.local", "any");
    assert.equal(r.ok, false);
    assert.equal(r.error, "invalid_credentials");
  });

  await test("5 次失败后限流 (rate_limited)", async () => {
    makeAdmin();
    for (let i = 0; i < 5; i++) {
      await auth.login("admin@test.local", "wrong");
    }
    const r = await auth.login("admin@test.local", "correct-horse");
    assert.equal(r.ok, false);
    assert.equal(r.error, "rate_limited");
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

// 清理
db.exec("DELETE FROM sessions");
db.exec("DELETE FROM users");
process.exit(0);
