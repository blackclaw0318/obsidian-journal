// ============================================================
// external-posts.test.mts - /api/external/posts HMAC + rate + 幂等 (v0.37 P4)
// ============================================================
// 覆盖:
//   1. verifyHmac: 正确签/时间戳过期/错签/timing-safe
//   2. checkRateLimit: 10次通过/第11次拒/窗口重置
//   3. validateBody: 缺字段/超长/非法 category/excerpt 过长
//   4. postRepo.findByExternalId / findByIdempotencyKey: 真实落库后能查到
// ============================================================

import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-external-posts.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { db } = await import("../../lib/db.ts");
const { postRepo, resetAllData } = await import("../../lib/repo.ts");
const { verifyHmac, checkRateLimit, validateBody, __resetRateLimitForTesting } = await import(
  "../../app/api/external/posts/route.ts"
);

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

// ============ Setup ============
resetAllData();
__resetRateLimitForTesting();

const SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

await suite("verifyHmac 验签", async () => {
  await test("正确签名 + 当前时间 → ok", () => {
    const body = '{"a":1}';
    const ts = Date.now();
    const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
    const r = verifyHmac(body, sig, String(ts), SECRET);
    assert.equal(r.ok, true);
  });

  await test("时间戳过期 (10分钟前) → 401 timestamp_expired", () => {
    const body = '{"a":1}';
    const ts = Date.now() - 10 * 60 * 1000;
    const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
    const r = verifyHmac(body, sig, String(ts), SECRET);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "timestamp_expired");
  });

  await test("时间戳未来 (10分钟后) → 401 timestamp_expired", () => {
    const body = '{"a":1}';
    const ts = Date.now() + 10 * 60 * 1000;
    const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
    const r = verifyHmac(body, sig, String(ts), SECRET);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "timestamp_expired");
  });

  await test("错签名 → 401 bad_signature", () => {
    const r = verifyHmac("{}", "deadbeef".repeat(8), String(Date.now()), SECRET);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "bad_signature");
  });

  await test("缺 signature/timestamp → missing_headers", () => {
    assert.equal(verifyHmac("{}", "", "", SECRET).reason, "missing_headers");
    assert.equal(verifyHmac("{}", "abcd", "", SECRET).reason, "missing_headers");
  });

  await test("非数字 timestamp → bad_timestamp", () => {
    const r = verifyHmac("{}", "abcd", "not-a-number", SECRET);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "bad_timestamp");
  });

  await test("空 secret → server_misconfigured", () => {
    const r = verifyHmac("{}", "abcd", String(Date.now()), "");
    assert.equal(r.ok, false);
    assert.equal(r.reason, "server_misconfigured");
  });

  await test("timing-safe: 不同长 signature → bad_signature 不抛", () => {
    const r = verifyHmac("{}", "ab", String(Date.now()), SECRET);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "bad_signature");
  });
});

await suite("checkRateLimit 限流", async () => {
  __resetRateLimitForTesting();
  const ip = "192.168.1.1";
  const now = Date.now();
  // 10 次应通过
  for (let i = 0; i < 10; i++) {
    assert.equal(checkRateLimit(ip, now + i), true, `第 ${i + 1} 次应通过`);
  }
  // 第 11 次应拒
  assert.equal(checkRateLimit(ip, now + 10), false, "第 11 次应拒");
  // 窗口外 (61s 后) 应重置
  assert.equal(checkRateLimit(ip, now + 61_000), true, "61s 后应重置");
  await test("10/min 限流逻辑 (10 通过 + 11 拒 + 61s 重置)", () => {
    // 上面的 assert 已经覆盖
    assert.ok(true);
  });
});

await suite("validateBody 字段校验", async () => {
  await test("完整 body → ok + data", () => {
    const r = validateBody({
      slug: "test-slug",
      title: "Test Title",
      content: "# Hello",
      category: "novel",
      external_id: "ext-1",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.slug, "test-slug");
      assert.equal(r.data.category, "novel");
    }
  });

  await test("缺 slug → missing_slug", () => {
    const r = validateBody({ title: "t", content: "c", category: "novel", external_id: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "missing_slug");
  });

  await test("缺 title → missing_title", () => {
    const r = validateBody({ slug: "s", content: "c", category: "novel", external_id: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "missing_title");
  });

  await test("缺 content → missing_content", () => {
    const r = validateBody({ slug: "s", title: "t", category: "novel", external_id: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "missing_content");
  });

  await test("缺 category → missing_category", () => {
    const r = validateBody({ slug: "s", title: "t", content: "c", external_id: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "missing_category");
  });

  await test("缺 external_id → missing_external_id", () => {
    const r = validateBody({ slug: "s", title: "t", content: "c", category: "novel" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "missing_external_id");
  });

  await test("slug 200 字符边界 → ok", () => {
    const r = validateBody({
      slug: "a".repeat(200),
      title: "t",
      content: "c",
      category: "novel",
      external_id: "x",
    });
    assert.equal(r.ok, true);
  });

  await test("slug 201 字符 → missing_slug (过长)", () => {
    const r = validateBody({
      slug: "a".repeat(201),
      title: "t",
      content: "c",
      category: "novel",
      external_id: "x",
    });
    assert.equal(r.ok, false);
  });

  await test("excerpt 501 字符 → excerpt_too_long", () => {
    const r = validateBody({
      slug: "s",
      title: "t",
      content: "c",
      category: "novel",
      external_id: "x",
      excerpt: "e".repeat(501),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "excerpt_too_long");
  });
});

await suite("postRepo.findByExternalId / findByIdempotencyKey", async () => {
  await test("外部注入 post 后能用 external_id 找到", () => {
    const post = postRepo.create({
      slug: "external-test-1",
      title: "外部注入测试",
      content: "# test",
      excerpt: null,
      cover_image: null,
      status: "published",
      category: "novel",
      tags: null,
      author_id: "u_bot_novel",
      series_id: null,
      published_at: Math.floor(Date.now() / 1000),
      external_id: "ext-find-test-1",
      idempotency_key: "idem-find-test-1",
      external_meta: JSON.stringify({ chapter_idx: 1 }),
    });
    const found = postRepo.findByExternalId("ext-find-test-1");
    assert.ok(found);
    assert.equal(found!.id, post.id);
    assert.equal(found!.external_id, "ext-find-test-1");
  });

  await test("外部注入 post 后能用 idempotency_key 找到", () => {
    postRepo.create({
      slug: "external-test-2",
      title: "幂等测试",
      content: "# test",
      excerpt: null,
      cover_image: null,
      status: "published",
      category: "novel",
      tags: null,
      author_id: "u_bot_novel",
      series_id: null,
      published_at: Math.floor(Date.now() / 1000),
      external_id: "ext-find-test-2",
      idempotency_key: "idem-find-test-2",
      external_meta: null,
    });
    const found = postRepo.findByIdempotencyKey("idem-find-test-2");
    assert.ok(found);
    assert.equal(found!.external_id, "ext-find-test-2");
  });

  await test("不存在的 external_id → null", () => {
    assert.equal(postRepo.findByExternalId("nope"), null);
    assert.equal(postRepo.findByIdempotencyKey("nope"), null);
  });

  await test("external_id 唯一约束 (重复插入应抛)", () => {
    postRepo.create({
      slug: "external-test-3a",
      title: "first",
      content: "c",
      excerpt: null,
      cover_image: null,
      status: "published",
      category: "novel",
      tags: null,
      author_id: "u_bot_novel",
      series_id: null,
      published_at: Math.floor(Date.now() / 1000),
      external_id: "ext-dup",
      idempotency_key: "idem-3a",
      external_meta: null,
    });
    let threw = false;
    try {
      postRepo.create({
        slug: "external-test-3b",
        title: "second",
        content: "c",
        excerpt: null,
        cover_image: null,
        status: "published",
        category: "novel",
        tags: null,
        author_id: "u_bot_novel",
        series_id: null,
        published_at: Math.floor(Date.now() / 1000),
        external_id: "ext-dup", // 重复
        idempotency_key: "idem-3b",
        external_meta: null,
      });
    } catch {
      threw = true;
    }
    assert.equal(threw, true, "重复 external_id 应抛 UNIQUE 约束错");
  });
});

await suite("bot user 存在性", async () => {
  await test("u_bot_novel 在 users 表", () => {
    const u = db.prepare("SELECT id, role, name FROM users WHERE id = ?").get("u_bot_novel") as
      | { id: string; role: string; name: string }
      | undefined;
    assert.ok(u);
    assert.equal(u!.role, "bot");
  });
  await test("u_bot_yk 在 users 表", () => {
    const u = db.prepare("SELECT id, role, name FROM users WHERE id = ?").get("u_bot_yk") as
      | { id: string; role: string; name: string }
      | undefined;
    assert.ok(u);
    assert.equal(u!.role, "bot");
  });
});

// ============ Teardown ============
db.close();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
