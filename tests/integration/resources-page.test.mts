// ============================================================
// resources-page 集成测试 (v0.42)
// 老板 2026-07-29 拍板: 图片分页 + 音/文档列表
// 测 mediaRepo.listByCategory 在分页/limit 场景下的正确性 (page.tsx 用此 API)
// ============================================================
import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test-resources-page.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);
for (const ext of ["", "-wal", "-shm"]) {
  const f = `${TEST_DB}${ext}`;
  if (existsSync(f)) rmSync(f);
}
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.SKIP_DB_INIT = "0";

const { initSchema, db } = await import("../../lib/db.ts");
const { mediaRepo, resetAllData } = await import("../../lib/repo.ts");
const { categoryFromMime } = await import("../../lib/media-categories.ts");

initSchema();

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

async function suite(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n\x1b[1m# ${name}\x1b[0m`);
  await fn();
}

function seedItems(count: number, mime: string, altPrefix = ""): string[] {
  const ids: string[] = [];
  const cat = categoryFromMime(mime);
  for (let i = 0; i < count; i++) {
    const item = mediaRepo.create({
      filename: `${altPrefix}${i}.${mime.split("/")[1] ?? "bin"}`,
      mime_type: mime,
      size: 1024 + i,
      width: null,
      height: null,
      alt: `${altPrefix}item-${i}`,
      url: `/uploads/${altPrefix}${i}`,
      storage_type: "local",
      category: cat,
      is_paid: false
    });
    ids.push(item.id);
  }
  return ids;
}

// ============ image 分页 ============
await suite("image 分页 (PAGE_SIZE=12, 老板 Q1 拍板)", async () => {
  await test("image 共 25 张: 第 1 页 12, 第 2 页 12, 第 3 页 1", () => {
    resetAllData();
    seedItems(25, "image/png", "img-");
    const p1 = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 0 });
    const p2 = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 12 });
    const p3 = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 24 });
    assert.equal(p1.total, 25);
    assert.equal(p1.items.length, 12);
    assert.equal(p2.items.length, 12);
    assert.equal(p3.items.length, 1);
    // 三页之间不重叠 (覆盖 25 张)
    const allIds = [
      ...p1.items.map((m) => m.id),
      ...p2.items.map((m) => m.id),
      ...p3.items.map((m) => m.id)
    ];
    assert.equal(new Set(allIds).size, 25);
  });

  await test("image 共 12 张: 第 1 页 12, 第 2 页 0 (边界)", () => {
    resetAllData();
    seedItems(12, "image/png", "edge-");
    const p1 = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 0 });
    const p2 = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 12 });
    assert.equal(p1.items.length, 12);
    assert.equal(p2.items.length, 0);
    assert.equal(p2.total, 12); // total 不变, 仅 items 空
  });

  await test("image 共 0 张: total=0, items=[] (空状态触发)", () => {
    resetAllData();
    const r = mediaRepo.listByCategory({ category: "image", limit: 12, offset: 0 });
    assert.equal(r.total, 0);
    assert.equal(r.items.length, 0);
  });
});

// ============ document 全量 (Q2 拍板: 不分页, 上限 200) ============
await suite("document 全量 (Q2 拍板: 不分页, 上限 200)", async () => {
  await test("document 共 5 张: 全量返回 5", () => {
    resetAllData();
    seedItems(5, "application/pdf", "doc-");
    const r = mediaRepo.listByCategory({ category: "document", limit: 200 });
    assert.equal(r.total, 5);
    assert.equal(r.items.length, 5);
  });

  await test("document 共 250 张: 上限 200 截断 (footer 提示)", () => {
    resetAllData();
    seedItems(250, "application/pdf", "big-");
    const r = mediaRepo.listByCategory({ category: "document", limit: 200 });
    assert.equal(r.total, 250); // total 真实
    assert.equal(r.items.length, 200); // items 截断
  });
});

// ============ audio 全量 ============
await suite("audio 全量 (Q2 拍板)", async () => {
  await test("audio 共 3 个: 全量返回 3", () => {
    resetAllData();
    seedItems(3, "audio/mpeg", "aud-");
    const r = mediaRepo.listByCategory({ category: "audio", limit: 200 });
    assert.equal(r.total, 3);
    assert.equal(r.items.length, 3);
  });
});

// ============ 跨类隔离 ============
await suite("跨类隔离", async () => {
  await test("只 seed image, document/audio 应为空", () => {
    resetAllData();
    seedItems(10, "image/png", "img-");
    const doc = mediaRepo.listByCategory({ category: "document", limit: 200 });
    const aud = mediaRepo.listByCategory({ category: "audio", limit: 200 });
    assert.equal(doc.total, 0);
    assert.equal(aud.total, 0);
  });

  await test("3 类混合: 按 category 各自 total 正确", () => {
    resetAllData();
    seedItems(5, "image/png", "img-");
    seedItems(3, "application/pdf", "doc-");
    seedItems(2, "audio/mpeg", "aud-");
    const img = mediaRepo.listByCategory({ category: "image", limit: 200 });
    const doc = mediaRepo.listByCategory({ category: "document", limit: 200 });
    const aud = mediaRepo.listByCategory({ category: "audio", limit: 200 });
    assert.equal(img.total, 5);
    assert.equal(doc.total, 3);
    assert.equal(aud.total, 2);
  });
});

// ============ 跨类搜索 (q 参数, 维持 listAll) ============
await suite("跨类搜索 (listAll)", async () => {
  await test("q 匹配 filename (跨类)", () => {
    resetAllData();
    seedItems(3, "image/png", "search-");
    seedItems(2, "application/pdf", "search-");
    const r = mediaRepo.listAll({ q: "search", limit: 100 });
    assert.equal(r.total, 5);
  });

  await test("q 匹配 alt (跨类)", () => {
    resetAllData();
    seedItems(2, "image/png", "a-");
    const r = mediaRepo.listAll({ q: "item-1", limit: 100 });
    // alt 含 "item-1": seedItems 设 alt 为 `${altPrefix}item-${i}`, 这里 altPrefix="a-"
    // 应该有 a-item-1 一个匹配
    assert.ok(r.total >= 1);
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
db.exec("DELETE FROM media_items");
process.exit(0);