// ============================================================
// POST /api/external/chapters - 外部 publisher HMAC 注入小说章节 (v0.38 P2)
// ============================================================
// 契约: docs/API_INTEGRATION.md (obsidian-novel-publisher 仓库, chapters 端点)
// 接收 publisher (obsidian-novel-publisher) 推送的小说章节, 自动建 Novel + Volume + Chapter 三层
// 鉴权: HMAC-SHA256 over `${timestamp}.${body}`, ±5min window (复用 lib/external-auth.ts)
// 幂等: chapters.external_id UNIQUE 索引 + idempotency_key UNIQUE 索引
// rate limit: 10 req/min/IP (复用 lib/external-auth.ts)
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { novelRepo, volumeRepo, chapterRepo } from "@/lib/repo";
import {
  ALLOWED_PUBLISHERS,
  checkRateLimit,
  verifyHmac,
} from "@/lib/external-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 重新导出供 unit test 覆盖
export { checkRateLimit, verifyHmac } from "@/lib/external-auth";

// ============ 类型 ============
interface ChapterCreateBody {
  // Novel 层
  novel_slug: string;
  novel_title: string;
  novel_description?: string;
  novel_cover_image?: string | null;
  novel_status?: "ongoing" | "completed" | "hiatus";
  // Volume 层
  volume_title: string;
  volume_order?: number;
  volume_description?: string;
  // Chapter 层
  chapter_slug: string;
  chapter_title: string;
  chapter_content: string;
  chapter_excerpt?: string;
  chapter_cover_image?: string | null;
  chapter_order?: number;
  chapter_published?: boolean;
  // 幂等 + 元数据
  external_id: string;
  idempotency_key?: string;
  external_meta?: Record<string, unknown>;
}

interface ValidatedData {
  novel: { slug: string; title: string; description: string | null; cover_image: string | null; status: "ongoing" | "completed" | "hiatus" };
  volume: { title: string; order: number; description: string | null };
  chapter: { slug: string; title: string; content: string; excerpt: string | null; cover_image: string | null; order: number; published: boolean };
  external_id: string;
  idempotency_key: string | null;
  external_meta: string | null;
}

function chapterUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  return `${base}/chapters/${slug}`;
}

// ============ Body 校验 ============
export function validateBody(b: Record<string, unknown>): { ok: true; data: ValidatedData } | { ok: false; error: string } {
  // novel
  const novel_slug = typeof b.novel_slug === "string" ? b.novel_slug.trim() : "";
  const novel_title = typeof b.novel_title === "string" ? b.novel_title.trim() : "";
  if (!novel_slug || novel_slug.length > 200) return { ok: false, error: "missing_novel_slug" };
  if (!novel_title || novel_title.length > 200) return { ok: false, error: "missing_novel_title" };
  const novel_description = typeof b.novel_description === "string" ? b.novel_description.trim() || null : null;
  const novel_cover_image = typeof b.novel_cover_image === "string" ? b.novel_cover_image : null;
  const novel_status_raw = b.novel_status;
  const novel_status: "ongoing" | "completed" | "hiatus" =
    novel_status_raw === "completed" || novel_status_raw === "hiatus" ? novel_status_raw : "ongoing";

  // volume
  const volume_title = typeof b.volume_title === "string" ? b.volume_title.trim() : "";
  if (!volume_title || volume_title.length > 200) return { ok: false, error: "missing_volume_title" };
  const volume_order_raw = b.volume_order;
  const volume_order = Number.isFinite(volume_order_raw) && Number(volume_order_raw) >= 1
    ? Math.floor(Number(volume_order_raw))
    : 0; // 0 = 让服务端算 nextOrder
  const volume_description = typeof b.volume_description === "string" ? b.volume_description.trim() || null : null;

  // chapter
  const chapter_slug = typeof b.chapter_slug === "string" ? b.chapter_slug.trim() : "";
  const chapter_title = typeof b.chapter_title === "string" ? b.chapter_title.trim() : "";
  const chapter_content = typeof b.chapter_content === "string" ? b.chapter_content : "";
  if (!chapter_slug || chapter_slug.length > 200) return { ok: false, error: "missing_chapter_slug" };
  if (!chapter_title || chapter_title.length > 200) return { ok: false, error: "missing_chapter_title" };
  if (!chapter_content) return { ok: false, error: "missing_chapter_content" };
  const chapter_excerpt = typeof b.chapter_excerpt === "string" ? b.chapter_excerpt.trim().slice(0, 500) || null : null;
  const chapter_cover_image = typeof b.chapter_cover_image === "string" ? b.chapter_cover_image : null;
  const chapter_order_raw = b.chapter_order;
  const chapter_order = Number.isFinite(chapter_order_raw) && Number(chapter_order_raw) >= 1
    ? Math.floor(Number(chapter_order_raw))
    : 0; // 0 = 让服务端算 nextOrder
  const chapter_published = b.chapter_published === false ? false : true; // 默认 true (publisher 推送即发布)

  // 幂等
  const external_id = typeof b.external_id === "string" ? b.external_id.trim() : "";
  if (!external_id || external_id.length > 200) return { ok: false, error: "missing_external_id" };
  const idempotency_key = typeof b.idempotency_key === "string" ? b.idempotency_key.trim() || null : null;
  const external_meta = b.external_meta && typeof b.external_meta === "object"
    ? JSON.stringify(b.external_meta)
    : null;

  return {
    ok: true,
    data: {
      novel: { slug: novel_slug, title: novel_title, description: novel_description, cover_image: novel_cover_image, status: novel_status },
      volume: { title: volume_title, order: volume_order, description: volume_description },
      chapter: {
        slug: chapter_slug, title: chapter_title, content: chapter_content, excerpt: chapter_excerpt,
        cover_image: chapter_cover_image, order: chapter_order, published: chapter_published
      },
      external_id,
      idempotency_key,
      external_meta,
    },
  };
}

// ============ POST Handler ============
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  try {
    return await handlePost(req, ip);
  } catch (err) {
    console.error("[external/chapters] 500:", err);
    return NextResponse.json(
      { ok: false, error: "internal", detail: (err as Error).message },
      { status: 500 }
    );
  }
}

async function handlePost(req: Request, ip: string) {
  // 1. rate limit (复用)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // 2. 读 headers
  const publisherId = req.headers.get("x-publisher-id") || "";
  const signature = req.headers.get("x-publisher-signature") || "";
  const timestamp = req.headers.get("x-publisher-timestamp") || "";

  // 3. publisher 白名单 + secret
  const publisher = ALLOWED_PUBLISHERS[publisherId];
  if (!publisher) {
    return NextResponse.json({ ok: false, error: "unknown_publisher" }, { status: 403 });
  }
  if (!publisher.secret) {
    console.error(`[external/chapters] OBSIDIAN_${publisherId.toUpperCase().replace(/-/g, "_")}_PUBLISH_SECRET not set`);
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  // 4. 读 body (raw text 用于 HMAC)
  const rawBody = await req.text();

  // 5. HMAC 验签 (复用)
  const hmacResult = verifyHmac(rawBody, signature, timestamp, publisher.secret);
  if (!hmacResult.ok) {
    return NextResponse.json({ ok: false, error: hmacResult.reason }, { status: 401 });
  }

  // 6. 解析 JSON
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // 7. 字段校验
  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }
  const data = validated.data;

  // 8. 幂等: external_id 已存在 → 返回 200 + deduplicated
  const existingByExtId = db
    .prepare(`SELECT id, slug FROM chapters WHERE external_id = ? LIMIT 1`)
    .get(data.external_id) as { id: string; slug: string } | undefined;
  if (existingByExtId) {
    return NextResponse.json(
      {
        ok: true,
        chapter: { id: existingByExtId.id, slug: existingByExtId.slug, url: chapterUrl(existingByExtId.slug) },
        deduplicated: true
      },
      { status: 200 }
    );
  }

  // 9. 幂等: idempotency_key 已存在 → 返回 200 + deduplicated
  if (data.idempotency_key) {
    const existingByKey = db
      .prepare(`SELECT id, slug FROM chapters WHERE idempotency_key = ? LIMIT 1`)
      .get(data.idempotency_key) as { id: string; slug: string } | undefined;
    if (existingByKey) {
      return NextResponse.json(
        {
          ok: true,
          chapter: { id: existingByKey.id, slug: existingByKey.slug, url: chapterUrl(existingByKey.slug) },
          deduplicated: true
        },
        { status: 200 }
      );
    }
  }

  // 10. slug 已存在 (且不是 external_id 命中的) → 409 (与 posts route 一致)
  const slugRow = db
    .prepare(`SELECT id FROM chapters WHERE slug = ? LIMIT 1`)
    .get(data.chapter.slug);
  if (slugRow) {
    return NextResponse.json({ ok: false, error: "chapter_slug_exists" }, { status: 409 });
  }

  // 11. 找 / 建 Novel
  let novel = novelRepo.bySlug(data.novel.slug);
  if (!novel) {
    novel = novelRepo.create({
      slug: data.novel.slug,
      title: data.novel.title,
      description: data.novel.description,
      cover_image: data.novel.cover_image,
      status: data.novel.status,
    });
  } else if (data.novel.cover_image && !novel.cover_image) {
    // 已有 novel 但缺封面 → 补上 (不覆盖已有)
    novel = novelRepo.update(novel.id, { cover_image: data.novel.cover_image });
  }
  if (!novel) {
    // 不可能走到这里 (上面 create 或 bySlug 必返回 Novel), 但 TS 需要兜底
    throw new Error("[external/chapters] novel creation failed unexpectedly");
  }

  // 12. 找 / 建 Volume
  const targetVolumeOrder = data.volume.order > 0 ? data.volume.order : volumeRepo.nextOrder(novel.id);
  let volume = db
    .prepare(`SELECT * FROM novel_volumes WHERE novel_id = ? AND "order" = ? AND deleted_at IS NULL LIMIT 1`)
    .get(novel.id, targetVolumeOrder) as ReturnType<typeof volumeRepo.byId> | undefined;
  if (!volume) {
    volume = volumeRepo.create({
      novel_id: novel.id,
      order: targetVolumeOrder,
      title: data.volume.title,
      description: data.volume.description,
    });
  }

  // 13. 建 Chapter
  const targetChapterOrder = data.chapter.order > 0 ? data.chapter.order : chapterRepo.nextOrder(volume.id);
  const now = Math.floor(Date.now() / 1000);
  const chapterId = `ch_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  db.prepare(`
    INSERT INTO chapters (
      id, volume_id, "order", slug, title, content, excerpt,
      published, published_at, deleted_at, created_at, updated_at,
      view_count, fts, external_id, idempotency_key, external_meta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, NULL, ?, ?, ?)
  `).run(
    chapterId,
    volume.id,
    targetChapterOrder,
    data.chapter.slug,
    data.chapter.title,
    data.chapter.content,
    data.chapter.excerpt,
    data.chapter.published ? 1 : 0,
    data.chapter.published ? now : null,
    now,
    now,
    data.external_id,
    data.idempotency_key,
    data.external_meta
  );

  console.log(
    `[external/chapters] created: publisher=${publisherId} novel_slug=${novel.slug} volume_order=${volume.order} chapter_slug=${data.chapter.slug} chapter_id=${chapterId}`
  );

  return NextResponse.json(
    {
      ok: true,
      chapter: {
        id: chapterId,
        slug: data.chapter.slug,
        url: chapterUrl(data.chapter.slug),
        novel_slug: novel.slug,
        volume_order: volume.order,
        chapter_order: targetChapterOrder,
      }
    },
    { status: 201 }
  );
}