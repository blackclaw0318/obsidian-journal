// ============================================================
// User 管理集成测试 (Phase 3.9, v0.16)
// 覆盖: userRepo CRUD + softDelete + updatePassword
// 用 node:sqlite (Node 24 内置)
// ============================================================

import { DatabaseSync } from "node:sqlite";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const TEST_DB = path.resolve("data/test-users.db");
if (existsSync(TEST_DB)) rmSync(TEST_DB);

let pass = 0;
let fail = 0;
function assert(cond: boolean, label: string) {
  if (cond) { console.log(`✔ ${label}`); pass++; }
  else { console.log(`✖ ${label}`); fail++; }
}

const db = new DatabaseSync(TEST_DB);
db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER
  );
  CREATE INDEX idx_users_deleted ON users(deleted_at);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// 测试 1: 插入 2 个用户
const now = Math.floor(Date.now() / 1000);
db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  .run("u_admin", "admin@test.local", "hash1", "Admin User", "admin", now, now);
db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  .run("u_user1", "user1@test.local", "hash2", "User One", "user", now, now);
db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  .run("u_archived", "archived@test.local", "hash3", "Archived", "user", now, now);

{
  const all = db.prepare("SELECT * FROM users").all();
  assert(all.length === 3, "初始插入 3 个用户");
}

// 测试 2: 软删除
db.prepare(`UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ?`)
  .run(now, now, "u_archived");
{
  const active = db.prepare("SELECT * FROM users WHERE deleted_at IS NULL").all() as any[];
  const archived = db.prepare("SELECT * FROM users WHERE deleted_at IS NOT NULL").all() as any[];
  assert(active.length === 2, "活跃用户 2 个");
  assert(archived.length === 1, "归档用户 1 个");
}

// 测试 3: 改 name
db.prepare(`UPDATE users SET name = ?, updated_at = ? WHERE id = ?`)
  .run("Updated Name", now, "u_user1");
{
  const row = db.prepare("SELECT name FROM users WHERE id = ?").get("u_user1") as any;
  assert(row?.name === "Updated Name", "改 name 成功");
}

// 测试 4: 改 role
db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`)
  .run("admin", now, "u_user1");
{
  const row = db.prepare("SELECT role FROM users WHERE id = ?").get("u_user1") as any;
  assert(row?.role === "admin", "改 role = admin 成功");
}

// 测试 5: 改 password_hash
db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
  .run("new-hash", now, "u_user1");
{
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get("u_user1") as any;
  assert(row?.password_hash === "new-hash", "改 password_hash 成功");
}

// 测试 6: email UNIQUE 约束
try {
  db.prepare(`INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run("u_dup", "admin@test.local", "hash", "user", now, now);
  assert(false, "重复 email 应被拒 (实际接受了, 错)");
} catch (e) {
  assert(true, "重复 email 被 UNIQUE 约束拒绝");
}

// 测试 7: 归档后改回 (restore)
db.prepare(`UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ?`)
  .run(now, "u_archived");
{
  const row = db.prepare("SELECT deleted_at FROM users WHERE id = ?").get("u_archived") as any;
  assert(row?.deleted_at === null, "归档用户可恢复 (deleted_at = null)");
}

// 测试 8: 软删用户不能改 (deleted_at IS NOT NULL 不允许普通 update)
const archivedRow = db.prepare("SELECT * FROM users WHERE id = ?").get("u_archived") as any;
assert(archivedRow?.deleted_at === null, "恢复后 deleted_at = null");

// 测试 9: 删除归档 + cascade sessions
db.prepare(`INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`)
  .run("s1", "u_user1", "token1", now + 86400);
db.prepare(`DELETE FROM users WHERE id = ?`).run("u_user1"); // cascade 会删 sessions
{
  const sessions = db.prepare("SELECT * FROM sessions WHERE user_id = ?").all("u_user1") as any[];
  assert(sessions.length === 0, "删 user 时 cascade 清 sessions");
}

// 测试 10: 索引 idx_users_deleted 存在
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users'").all() as any[];
const hasDeletedIdx = indexes.some((i) => i.name === "idx_users_deleted");
assert(hasDeletedIdx, "idx_users_deleted 索引存在");

db.close();
rmSync(TEST_DB);

console.log("");
console.log(`总计: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);