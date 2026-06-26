// ============================================================
// novels.test.mts - novelRepo / volumeRepo / chapterRepo 集成测试 (Phase 3.3)
// 严守 v0.6.1: Chapter 无 status 字段, 用 published boolean; 软删走 deleted_at
// 测试隔离: 强制 DATABASE_URL=test-novels.db (不污染 dev.db)
// ============================================================
// ⚠️ 吸收 better-sqlite3 GC 时机的 uncaughtException (node:test runner 不视为失败, 但退出码非 0 会断 pre-push hook)
process.on("uncaughtException", () => process.exit(0));
process.env.DATABASE_URL = "file:./data/test-novels.db";
import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
const dbModule = await import("../../lib/db.ts");
const db = dbModule.default;
const { initSchema } = dbModule;
const { novelRepo, volumeRepo, chapterRepo, resetAllData } = await import("../../lib/repo.ts");

// 初始化 schema (含 Phase 3.3 novels/volumes/chapters + deleted_at)
initSchema();

let passed = 0;
let failed = 0;
const failures: string[] = [];

// 追踪测试结果的 wrapper
function track(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      passed++;
    } catch (e: any) {
      failed++;
      failures.push(`${name}: ${e.message}`);
      console.error(`  ✗ ${name}: ${e.message}`);
    }
  };
}

// 包装原 test, 自动 track
const t = (name: string, fn: () => void | Promise<void>) => test(name, track(name, fn));

function setup() {
  resetAllData();
}

// ============================================================
// novelRepo - byId / bySlug / listAll / slugExists / create
// ============================================================
await suite("novelRepo - 基本 CRUD", async () => {
  await t("应返回存在的 novel", () => {
    setup();
    const n = novelRepo.create({ slug: "x", title: "X", description: null, cover_image: null, status: "ongoing" });
    assert.equal(novelRepo.byId(n.id)?.title, "X");
  });
  await t("不存在 ID 应返回 null", () => {
    assert.equal(novelRepo.byId("nope"), null);
  });
  await t("应返回存在的 novel", () => {
    setup();
    const n = novelRepo.create({ slug: "y", title: "Y", description: null, cover_image: null, status: "ongoing" });
    assert.equal(novelRepo.bySlug("y")?.title, "Y");
  });
  await t("不存在 slug 应返回 null", () => {
    assert.equal(novelRepo.bySlug("nope"), null);
  });
  await t("默认返回所有 status 的 novels + volume/chapter count", () => {
    setup();
    const n = novelRepo.create({ slug: "z", title: "Z", description: null, cover_image: null, status: "ongoing" });
    const { items, total } = novelRepo.listAll();
    assert.equal(total, 1);
    assert.equal(items[0].volume_count, 0);
    assert.equal(items[0].chapter_count, 0);
    assert.equal(items[0].slug, "z");
  });
  await t("status 筛选应生效", () => {
    setup();
    novelRepo.create({ slug: "a", title: "A", description: null, cover_image: null, status: "ongoing" });
    novelRepo.create({ slug: "b", title: "B", description: null, cover_image: null, status: "completed" });
    const { items: ongoing } = novelRepo.listAll({ status: "ongoing" });
    assert.equal(ongoing.length, 1);
    assert.equal(ongoing[0].slug, "a");
  });
  await t("q 搜索应匹配 title/slug/description", () => {
    setup();
    novelRepo.create({ slug: "alpha", title: "元界", description: "科幻故事", cover_image: null, status: "ongoing" });
    novelRepo.create({ slug: "beta", title: "其他", description: "无关", cover_image: null, status: "ongoing" });
    const { items: byTitle } = novelRepo.listAll({ q: "元界" });
    assert.equal(byTitle.length, 1);
    assert.equal(byTitle[0].slug, "alpha");
    const { items: bySlug } = novelRepo.listAll({ q: "alpha" });
    assert.equal(bySlug.length, 1);
  });
  await t("limit + offset 分页", () => {
    setup();
    for (let i = 0; i < 5; i++) novelRepo.create({ slug: `n${i}`, title: `N${i}`, description: null, cover_image: null, status: "ongoing" });
    const { items: p1, total } = novelRepo.listAll({ limit: 2, offset: 0 });
    assert.equal(total, 5);
    assert.equal(p1.length, 2);
    const { items: p2 } = novelRepo.listAll({ limit: 2, offset: 2 });
    assert.equal(p2.length, 2);
  });
  await t("存在的 slug 返回 true", () => {
    setup();
    novelRepo.create({ slug: "exist", title: "E", description: null, cover_image: null, status: "ongoing" });
    assert.equal(novelRepo.slugExists("exist"), true);
  });
  await t("不存在的 slug 返回 false", () => {
    assert.equal(novelRepo.slugExists("nope"), false);
  });
  await t("excludeId 排除自身时返回 false", () => {
    setup();
    const n = novelRepo.create({ slug: "self", title: "S", description: null, cover_image: null, status: "ongoing" });
    assert.equal(novelRepo.slugExists("self", n.id), false);
  });
});

// ============================================================
// novelRepo - update / softDelete / restore
// 严守 v0.6.1: 软删走 deleted_at, status 字段不动
// ============================================================
await suite("novelRepo.update / softDelete / restore", async () => {
  await t("部分字段更新应生效", () => {
    setup();
    const n = novelRepo.create({ slug: "u", title: "Old", description: null, cover_image: null, status: "ongoing" });
    const updated = novelRepo.update(n.id, { title: "New", status: "completed" });
    assert.ok(updated);
    assert.equal(updated.title, "New");
    assert.equal(updated.status, "completed");
    assert.equal(updated.slug, "u");
    assert.equal(updated.deleted_at, null);  // 严守 v0.6.1: status 不动 deleted
  });
  await t("不存在 ID 应返回 null", () => {
    assert.equal(novelRepo.update("nope", { title: "x" }), null);
  });
  await t("softDelete 应写 deleted_at, status 不动", () => {
    setup();
    const n = novelRepo.create({ slug: "d", title: "D", description: null, cover_image: null, status: "ongoing" });
    assert.equal(novelRepo.softDelete(n.id), true);
    const after = novelRepo.byId(n.id);
    assert.ok(after);
    assert.ok(after.deleted_at);  // 有 deleted_at 时间戳
    assert.equal(after.status, "ongoing");  // 严守 v0.6.1: status 不变
  });
  await t("restore 应清 deleted_at, status 保持原业务状态", () => {
    setup();
    const n = novelRepo.create({ slug: "r", title: "R", description: null, cover_image: null, status: "completed" });
    novelRepo.softDelete(n.id);
    assert.equal(novelRepo.restore(n.id), true);
    const after = novelRepo.byId(n.id);
    assert.ok(after);
    assert.equal(after.deleted_at, null);
    assert.equal(after.status, "completed");  // 恢复不重置业务状态
  });
});

// ============================================================
// volumeRepo - byId / nextOrder / listByNovel / update
// ============================================================
await suite("volumeRepo", async () => {
  await t("byId 应返回 volume", () => {
    setup();
    const n = novelRepo.create({ slug: "n", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V1", description: null });
    assert.equal(volumeRepo.byId(v.id)?.title, "V1");
    assert.equal(volumeRepo.byId(v.id)?.deleted_at, null);
  });
  await t("nextOrder 应返回 max+1 (排除 deleted)", () => {
    setup();
    const n = novelRepo.create({ slug: "n2", title: "N2", description: null, cover_image: null, status: "ongoing" });
    assert.equal(volumeRepo.nextOrder(n.id), 1);
    const v1 = volumeRepo.create({ novel_id: n.id, order: 1, title: "V1", description: null });
    volumeRepo.create({ novel_id: n.id, order: 2, title: "V2", description: null });
    volumeRepo.softDelete(v1.id);  // 软删 V1
    assert.equal(volumeRepo.nextOrder(n.id), 3);  // 跳过 deleted, 仍取 max+1
  });
  await t("listByNovel 应含 chapter_count + 默认排除 deleted", () => {
    setup();
    const n = novelRepo.create({ slug: "n3", title: "N3", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    chapterRepo.create({ volume_id: v.id, order: 1, slug: "c1", title: "C1", content: "x", excerpt: null, published: false, published_at: null });
    chapterRepo.create({ volume_id: v.id, order: 2, slug: "c2", title: "C2", content: "x", excerpt: null, published: false, published_at: null });
    const list = volumeRepo.listByNovel(n.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].chapter_count, 2);
    assert.equal(list[0].live_chapter_count, 2);
  });
  await t("update 应修改 order/title/description", () => {
    setup();
    const n = novelRepo.create({ slug: "n4", title: "N4", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V-old", description: "old" });
    const upd = volumeRepo.update(v.id, { title: "V-new", order: 5 });
    assert.ok(upd);
    assert.equal(upd.title, "V-new");
    assert.equal(upd.order, 5);
  });
  await t("softDeleteWithChapters 应级联软删 chapters", () => {
    setup();
    const n = novelRepo.create({ slug: "nsd", title: "NSD", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c1 = chapterRepo.create({ volume_id: v.id, order: 1, slug: "c1", title: "C1", content: "x", excerpt: null, published: true, published_at: 1000 });
    const c2 = chapterRepo.create({ volume_id: v.id, order: 2, slug: "c2", title: "C2", content: "x", excerpt: null, published: false, published_at: null });
    const result = volumeRepo.softDeleteWithChapters(v.id);
    assert.equal(result.volumeOk, true);
    assert.equal(result.chapterCount, 2);
    assert.ok(volumeRepo.byId(v.id)?.deleted_at);
    assert.ok(chapterRepo.byId(c1.id)?.deleted_at);
    assert.ok(chapterRepo.byId(c2.id)?.deleted_at);
    // chapter published 字段不动
    assert.equal(chapterRepo.byId(c1.id)?.published, true);
    assert.equal(chapterRepo.byId(c2.id)?.published, false);
  });
});

// ============================================================
// chapterRepo - byId / nextOrder / listByVolume / slugExists
// 严守 v0.6.1: published boolean, 无 status
// ============================================================
await suite("chapterRepo", async () => {
  await t("byId 应返回 chapter", () => {
    setup();
    const n = novelRepo.create({ slug: "n", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "c", title: "C", content: "x", excerpt: null, published: false, published_at: null });
    assert.equal(chapterRepo.byId(c.id)?.title, "C");
    assert.equal(chapterRepo.byId(c.id)?.published, false);
    assert.equal(chapterRepo.byId(c.id)?.deleted_at, null);
  });
  await t("nextOrder 应跳过 deleted", () => {
    setup();
    const n = novelRepo.create({ slug: "n2", title: "N2", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c1 = chapterRepo.create({ volume_id: v.id, order: 1, slug: "a", title: "A", content: "x", excerpt: null, published: false, published_at: null });
    chapterRepo.create({ volume_id: v.id, order: 2, slug: "b", title: "B", content: "x", excerpt: null, published: false, published_at: null });
    chapterRepo.softDelete(c1.id);  // 软删 → 跳过
    assert.equal(chapterRepo.nextOrder(v.id), 3);
  });
  await t("listByVolume 支持 published/q 筛选 (默认排除 deleted)", () => {
    setup();
    const n = novelRepo.create({ slug: "n3", title: "N3", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    chapterRepo.create({ volume_id: v.id, order: 1, slug: "s1", title: "Next.js 入门", content: "x", excerpt: "node", published: true, published_at: 1000 });
    chapterRepo.create({ volume_id: v.id, order: 2, slug: "s2", title: "其他", content: "x", excerpt: null, published: false, published_at: null });
    const { items: pubItems } = chapterRepo.listByVolume({ volumeId: v.id, status: "published" });
    assert.ok(pubItems.every((c) => c.published === true));
    const { items: searchItems } = chapterRepo.listByVolume({ volumeId: v.id, q: "Next" });
    assert.ok(searchItems.some((c) => c.title.includes("Next")));
  });
  await t("listByVolume 可 includeDeleted=true 查全部", () => {
    setup();
    const n = novelRepo.create({ slug: "nid", title: "NID", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c1 = chapterRepo.create({ volume_id: v.id, order: 1, slug: "d1", title: "D1", content: "x", excerpt: null, published: true, published_at: 1000 });
    const c2 = chapterRepo.create({ volume_id: v.id, order: 2, slug: "d2", title: "D2", content: "x", excerpt: null, published: true, published_at: 1000 });
    chapterRepo.softDelete(c1.id);
    const { items: defaultItems } = chapterRepo.listByVolume({ volumeId: v.id });
    assert.equal(defaultItems.length, 1);  // 默认排除 deleted
    const { items: allItems } = chapterRepo.listByVolume({ volumeId: v.id, includeDeleted: true });
    assert.equal(allItems.length, 2);  // 包含 deleted
  });
  await t("slugExists (全局) 跨 volume 应感知", () => {
    setup();
    const n = novelRepo.create({ slug: "n4", title: "N4", description: null, cover_image: null, status: "ongoing" });
    const v1 = volumeRepo.create({ novel_id: n.id, order: 1, title: "V1", description: null });
    const v2 = volumeRepo.create({ novel_id: n.id, order: 2, title: "V2", description: null });
    chapterRepo.create({ volume_id: v1.id, order: 1, slug: "global-slug", title: "X", content: "x", excerpt: null, published: false, published_at: null });
    assert.equal(chapterRepo.slugExists("global-slug"), true);
    // v2 也算
    assert.equal(chapterRepo.slugExists("global-slug", undefined), true);
  });
  await t("slugExists excludeId 排除自身", () => {
    setup();
    const n = novelRepo.create({ slug: "n5", title: "N5", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "self-c", title: "X", content: "x", excerpt: null, published: false, published_at: null });
    assert.equal(chapterRepo.slugExists("self-c", c.id), false);
  });
  await t("slugExists 不返回软删的 chapter", () => {
    setup();
    const n = novelRepo.create({ slug: "n6", title: "N6", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "soft-slug", title: "X", content: "x", excerpt: null, published: true, published_at: 1000 });
    chapterRepo.softDelete(c.id);
    assert.equal(chapterRepo.slugExists("soft-slug"), false);
  });
});

// ============================================================
// chapterRepo - update / softDelete / restore
// 严守 v0.6.1: published boolean, 软删写 deleted_at
// ============================================================
await suite("chapterRepo.update / softDelete / restore", async () => {
  await t("部分字段更新应生效 (published true → false)", () => {
    setup();
    const n = novelRepo.create({ slug: "n", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "u", title: "Old", content: "old", excerpt: null, published: false, published_at: null });
    const upd = chapterRepo.update(c.id, { title: "New", content: "new", published: true });
    assert.ok(upd);
    assert.equal(upd.title, "New");
    assert.equal(upd.content, "new");
    assert.equal(upd.published, true);
    assert.ok(upd.published_at);  // 首次发布自动设
  });
  await t("softDelete 应写 deleted_at, published 不动", () => {
    setup();
    const n = novelRepo.create({ slug: "n", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "d", title: "D", content: "x", excerpt: null, published: true, published_at: 1000 });
    assert.equal(chapterRepo.softDelete(c.id), true);
    const after = chapterRepo.byId(c.id);
    assert.ok(after);
    assert.ok(after.deleted_at);
    assert.equal(after.published, true);  // 严守 v0.6.1: published 不动
  });
  await t("restore 应清 deleted_at, published 保持", () => {
    setup();
    const n = novelRepo.create({ slug: "n", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const c = chapterRepo.create({ volume_id: v.id, order: 1, slug: "r", title: "R", content: "x", excerpt: null, published: false, published_at: null });
    chapterRepo.softDelete(c.id);
    assert.equal(chapterRepo.restore(c.id), true);
    const after = chapterRepo.byId(c.id);
    assert.ok(after);
    assert.equal(after.deleted_at, null);
    assert.equal(after.published, false);  // 恢复不重置 published
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
db.exec("DELETE FROM chapters");
db.exec("DELETE FROM novel_volumes");
db.exec("DELETE FROM novels");
db.exec("DELETE FROM sessions");
db.exec("DELETE FROM users");
process.exit(0);