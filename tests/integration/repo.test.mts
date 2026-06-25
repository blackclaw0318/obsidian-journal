// ============================================================
// repo.test.mts — Phase 2.5 Q14 integration test
// 严守 v0.6.1 schema: PostCategory ∈ {tech, life}
// 用 node:assert + 简单 runner, 脱离 vitest (避免 esbuild 不识别 node:sqlite)
// ============================================================

import { strict as assert } from "node:assert";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// ============================================================
// 隔离: 临时 test.db (覆盖 .env 的 DATABASE_URL)
// ============================================================
const DATA_DIR = resolve(process.cwd(), "data");
const TEST_DB = resolve(DATA_DIR, "test.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(TEST_DB)) rmSync(TEST_DB);

// 关键: 必须在 import lib/db.ts 之前覆盖 DATABASE_URL
// 否则 lib/db.ts 读 .env 的 DATABASE_URL 拿 dev.db
process.env.DATABASE_URL = `file:${TEST_DB}`;

// 必须 dynamic import, 让上面的 env var 先生效
const { initSchema } = await import("../../lib/db.ts");
const repo = await import("../../lib/repo.ts");
const { db, initSchema: _i } = await import("../../lib/db.ts");
const { postRepo, novelRepo, volumeRepo, chapterRepo, videoSeriesRepo, videoRepo, siteConfigRepo, socialRepo, userRepo, pageRepo, resetAllData } = repo;

initSchema();

// ============================================================
// Mini test runner
// ============================================================
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

function setup() {
  resetAllData();
  const u = userRepo.create({
    email: "admin@test.local",
    password_hash: "$2a$10$test",
    name: "Test Admin",
    role: "admin"
  });
  siteConfigRepo.upsert({ site_name: "Test Site", site_tagline: "Integration Test" });
  return u.id; // 返回 user id, post 需要真实 FK
}
let CURRENT_USER_ID = "user_1";

// ============================================================
// siteConfigRepo
// ============================================================
await suite("siteConfigRepo", async () => {
  await test("应该默认 upsert 出 SiteConfig (Q5/Q9b 严守 default)", () => {
    CURRENT_USER_ID = setup();
    const sc = siteConfigRepo.get()!;
    assert.ok(sc, "siteConfig 应该存在");
    assert.equal(sc.site_name, "Test Site");
    assert.equal(sc.default_theme, "light"); // Q5
    assert.equal(sc.allow_custom_html, 0); // Q9b 默认禁
    assert.equal(sc.baidu_push_enabled, 1);
  });

  await test("应该能 upsert 多个字段", () => {
    CURRENT_USER_ID = setup();
    const updated = siteConfigRepo.upsert({
      site_tagline: "New Tagline",
      default_theme: "dark",
      allow_custom_html: 1
    });
    assert.equal(updated.site_tagline, "New Tagline");
    assert.equal(updated.default_theme, "dark");
    assert.equal(updated.allow_custom_html, 1);
  });
});

// ============================================================
// postRepo (v0.6.1 PostCategory ∈ {tech, life})
// ============================================================
await suite("postRepo (v0.6.1 PostCategory 严守)", async () => {
  await test("create + bySlug 应该能存读", () => {
    CURRENT_USER_ID = setup();
    CURRENT_USER_ID = setup();
    CURRENT_USER_ID = setup();
    const post = postRepo.create({
      slug: "test-post", title: "Test", excerpt: "Excerpt", content: "Content",
      cover_image: null, status: "published", category: "tech", tags: "a,b",
      author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000)
    });
    assert.match(post.id, /^post_/);
    const fetched = postRepo.bySlug("test-post");
    assert.ok(fetched, "bySlug 应该找到");
    assert.equal(fetched!.title, "Test");
    assert.equal(fetched!.author.email, "admin@test.local");
  });

  await test("list 默认 status=published + limit=20 + publishedAt DESC", () => {
    CURRENT_USER_ID = setup();
    for (let i = 0; i < 5; i++) {
      postRepo.create({
        slug: `p${i}`, title: `Post ${i}`, excerpt: null, content: "x",
        cover_image: null, status: "published", category: "tech", tags: null,
        author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) - i
      });
    }
    postRepo.create({
      slug: "draft", title: "Draft", excerpt: null, content: "x",
      cover_image: null, status: "draft", category: "tech", tags: null,
      author_id: CURRENT_USER_ID, published_at: null
    });
    const published = postRepo.list();
    assert.equal(published.length, 5);
    assert.equal(published[0].slug, "p0"); // 最新
  });

  await test("listByCategory 应该只返回 tech 或 life", () => {
    CURRENT_USER_ID = setup();
    postRepo.create({ slug: "tech-1", title: "T1", excerpt: null, content: "x", cover_image: null, status: "published", category: "tech", tags: null, author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) });
    postRepo.create({ slug: "life-1", title: "L1", excerpt: null, content: "x", cover_image: null, status: "published", category: "life", tags: null, author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) });
    assert.equal(postRepo.listByCategory({ category: "tech" }).length, 1);
    assert.equal(postRepo.listByCategory({ category: "life" }).length, 1);
  });

  await test("count + countByCategory 应该正确", () => {
    CURRENT_USER_ID = setup();
    for (let i = 0; i < 3; i++) {
      postRepo.create({ slug: `t${i}`, title: `T${i}`, excerpt: null, content: "x", cover_image: null, status: "published", category: "tech", tags: null, author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) });
    }
    postRepo.create({ slug: "l1", title: "L1", excerpt: null, content: "x", cover_image: null, status: "published", category: "life", tags: null, author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) });
    assert.equal(postRepo.count(), 4);
    assert.equal(postRepo.countByCategory("tech"), 3);
    assert.equal(postRepo.countByCategory("life"), 1);
  });

  await test("incrementView 应该累加 view_count", () => {
    CURRENT_USER_ID = setup();
    const p = postRepo.create({ slug: "v1", title: "V", excerpt: null, content: "x", cover_image: null, status: "published", category: "tech", tags: null, author_id: CURRENT_USER_ID, published_at: Math.floor(Date.now() / 1000) });
    assert.equal(p.view_count, 0);
    postRepo.incrementView(p.id);
    postRepo.incrementView(p.id);
    const fetched = postRepo.bySlug("v1");
    assert.equal(fetched!.view_count, 2);
  });

  await test("bySlug 不存在应该返回 null", () => {
    CURRENT_USER_ID = setup();
    assert.equal(postRepo.bySlug("nonexistent"), null);
  });
});

// ============================================================
// novelRepo + volumeRepo + chapterRepo (Q11 双层)
// ============================================================
await suite("novelRepo (Q11 Novel + NovelVolume 双层 model)", async () => {
  await test("create + list", () => {
    CURRENT_USER_ID = setup();
    const novel = novelRepo.create({
      slug: "meta-realm", title: "元界", description: "科幻",
      cover_image: null, status: "ongoing"
    });
    assert.match(novel.id, /^novel_/);
    assert.equal(novel.title, "元界");
    assert.equal(novelRepo.list().length, 1);
  });

  await test("count + latest 应该正确", () => {
    CURRENT_USER_ID = setup();
    novelRepo.create({ slug: "n1", title: "N1", description: null, cover_image: null, status: "ongoing" });
    novelRepo.create({ slug: "n2", title: "N2", description: null, cover_image: null, status: "completed" });
    assert.equal(novelRepo.count(), 2);
    assert.ok(novelRepo.latest(), "latest 应该返回");
  });

  await test("novel.volumes 应该包含 volumes 关系 (Q11)", () => {
    CURRENT_USER_ID = setup();
    const novel = novelRepo.create({ slug: "n1", title: "N1", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: novel.id, order: 1, title: "Vol 1", description: null });
    assert.match(v.id, /^vol_/);
    const fetched = novelRepo.list().find((n) => n.id === novel.id);
    assert.ok(fetched, "list 应该包含刚创建的 novel");
    assert.equal(fetched!.volumes.length, 1);
    assert.equal(fetched!.volumes[0].title, "Vol 1");
  });
});

await suite("chapterRepo", async () => {
  await test("create + listByVolume", () => {
    CURRENT_USER_ID = setup();
    const n = novelRepo.create({ slug: "n1", title: "N", description: null, cover_image: null, status: "ongoing" });
    const v = volumeRepo.create({ novel_id: n.id, order: 1, title: "V", description: null });
    const ch = chapterRepo.create({
      volume_id: v.id, order: 1, slug: "c1", title: "C1",
      content: "x", excerpt: null, status: "published",
      published_at: Math.floor(Date.now() / 1000)
    });
    assert.match(ch.id, /^ch_/);
    assert.equal(chapterRepo.byVolume(v.id).length, 1);
  });
});

// ============================================================
// videoRepo + videoSeriesRepo
// ============================================================
await suite("videoSeriesRepo", async () => {
  await test("create + list (按 order ASC)", () => {
    CURRENT_USER_ID = setup();
    videoSeriesRepo.create({ slug: "s2", title: "S2", description: null, cover_image: null, order: 2 });
    videoSeriesRepo.create({ slug: "s1", title: "S1", description: null, cover_image: null, order: 1 });
    const list = videoSeriesRepo.list();
    assert.equal(list.length, 2);
    assert.equal(list[0].title, "S1");
  });
});

await suite("videoRepo (VideoSeries FK)", async () => {
  await test("create + list 应该返回 Video[]", () => {
    CURRENT_USER_ID = setup();
    const v = videoRepo.create({
      series_id: null, slug: "v1", title: "V1", description: null,
      embed_url: "https://x.com/embed", cover_image: null, duration: 60,
      status: "published", published_at: Math.floor(Date.now() / 1000)
    });
    assert.match(v.id, /^vid_/);
    assert.equal(videoRepo.list().length, 1);
  });
});

// ============================================================
// socialRepo (Social 独立表, v0.6.1 schema 严守)
// ============================================================
await suite("socialRepo (Social 独立表, 不放 SiteConfig JSON)", async () => {
  await test("list 默认 visibleOnly=true", () => {
    CURRENT_USER_ID = setup();
    socialRepo.create({ platform: "github", label: "GitHub", url: "https://x", icon: null, order: 1, visible: 1 });
    socialRepo.create({ platform: "hidden", label: "Hidden", url: "https://y", icon: null, order: 2, visible: 0 });
    assert.equal(socialRepo.list().length, 1);
    assert.equal(socialRepo.list(false).length, 2);
  });

  await test("list 应该按 order ASC 排序", () => {
    CURRENT_USER_ID = setup();
    socialRepo.create({ platform: "a", label: "A", url: "https://a", icon: null, order: 2, visible: 1 });
    socialRepo.create({ platform: "b", label: "B", url: "https://b", icon: null, order: 1, visible: 1 });
    assert.equal(socialRepo.list()[0].label, "B");
  });
});

// ============================================================
// userRepo
// ============================================================
await suite("userRepo", async () => {
  await test("byEmail 应该能查", () => {
    CURRENT_USER_ID = setup();
    const u = userRepo.byEmail("admin@test.local");
    assert.ok(u, "admin 应该存在");
    assert.equal(u!.role, "admin");
  });

  await test("byEmail 不存在返回 null", () => {
    CURRENT_USER_ID = setup();
    assert.equal(userRepo.byEmail("nobody@test.local"), null);
  });
});

// ============================================================
// pageRepo
// ============================================================
await suite("pageRepo (Phase 2.6 还没 create)", async () => {
  await test("bySlug 不存在应该返回 null", () => {
    CURRENT_USER_ID = setup();
    assert.equal(pageRepo.bySlug("about"), null);
  });
  await test("list 应该返回空数组 (没 create 方法, 严守 schema)", () => {
    CURRENT_USER_ID = setup();
    assert.deepEqual(pageRepo.list(), []);
  });
});

// ============================================================
// 总结 + 清理
// ============================================================
console.log(`\n${"=".repeat(60)}`);
console.log(`\x1b[1m通过: \x1b[32m${passed}\x1b[0m    失败: \x1b[${failed > 0 ? "31" : "32"}m${failed}\x1b[0m`);

if (failures.length > 0) {
  console.log("\n失败明细:");
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}

if (existsSync(TEST_DB)) rmSync(TEST_DB);

process.exit(failed > 0 ? 1 : 0);
