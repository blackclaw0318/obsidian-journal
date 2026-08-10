// ============================================================
// POST /api/external/posts - 外部 publisher HMAC 注入 (v0.37 P4)
// ============================================================
// 契约: docs/API_INTEGRATION.md (obsidian-novel-publisher 仓库)
// 接收 publisher (obsidian-novel-publisher / obsidian-yk-script) 推送的小说/视频脚本内容
// 鉴权: HMAC-SHA256 over `${timestamp}.${body}`, ±5min window (shared lib/external-auth.ts)
// 幂等: external_id UNIQUE 索引 + idempotency_key UNIQUE 索引
// rate limit: 10 req/min/IP (shared lib/external-auth.ts)
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { postRepo } from "@/lib/repo";
import {
  ALLOWED_PUBLISHERS,
  checkRateLimit,
  verifyHmac,
} from "@/lib/external-auth";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";
// 不缓存 (每次都是新请求)
export const dynamic = "force-dynamic";

// 重新导出 HMAC/rate-limit 给现有测试 (避免破坏 v0.37 P4 的 unit 覆盖)
export { checkRateLimit, verifyHmac } from "@/lib/external-auth";

// ============ 规范化 body 函数已删 (HMAC 签名本身保证 body 完整性) ============

function postUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  return `${base}/posts/${slug}`;
}

// ============ 字段校验 ============
export function validateBody(b: Record<string, unknown>): { ok: true; data: PostCreateData } | { ok: false; error: string } {
  const slug = typeof b.slug === "string" ? b.slug.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const content = typeof b.content === "string" ? b.content : "";
  const category = typeof b.category === "string" ? b.category : "";
  const externalId = typeof b.external_id === "string" ? b.external_id.trim() : "";
  if (!slug || slug.length > 200) return { ok: false, error: "missing_slug" };
  if (!title || title.length > 200) return { ok: false, error: "missing_title" };
  if (!content) return { ok: false, error: "missing_content" };
  if (!category) return { ok: false, error: "missing_category" };
  if (!externalId || externalId.length > 200) return { ok: false, error: "missing_external_id" };
  if (b.excerpt !== undefined && b.excerpt !== null && typeof b.excerpt !== "string") {
    return { ok: false, error: "invalid_excerpt" };
  }
  if (b.excerpt && (b.excerpt as string).length > 500) return { ok: false, error: "excerpt_too_long" };
  return {
    ok: true,
    data: {
      slug,
      title,
      content,
      category,
      external_id: externalId,
      excerpt: (b.excerpt as string | undefined) ?? null,
      tags: typeof b.tags === "string" ? b.tags : null,
      cover_image: typeof b.cover_image === "string" ? b.cover_image : null,
      idempotency_key: typeof b.idempotency_key === "string" ? b.idempotency_key : null,
      external_meta: b.external_meta ? JSON.stringify(b.external_meta) : null,
    },
  };
}

interface PostCreateData {
  slug: string;
  title: string;
  content: string;
  category: string;
  external_id: string;
  excerpt: string | null;
  tags: string | null;
  cover_image: string | null;
  idempotency_key: string | null;
  external_meta: string | null;
}

// ============ POST Handler ============
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  try {
    return await handlePost(req, ip);
  } catch (err) {
    console.error("[external/posts] 500:", err);
    return NextResponse.json(
      { ok: false, error: "internal", detail: (err as Error).message },
      { status: 500 }
    );
  }
}

async function handlePost(req: Request, ip: string) {
  // 1. rate limit
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
    console.error(`[external/posts] OBSIDIAN_${publisherId.toUpperCase().replace(/-/g, "_")}_PUBLISH_SECRET not set`);
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  // 4. 读 body (raw text, 用于 HMAC)
  const rawBody = await req.text();

  // 5. HMAC 验签
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

  // 7. (验证 body 完整性由 HMAC 签名保证 - raw body 已被签, 改则验签失败)
  //    不重做 canonical body 匹配 (publisher 端可以用自己的序列化器)

  // 8. 字段校验
  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }
  const data = validated.data;

  // 9. category 白名单
  if (!publisher.allowedCategories.includes(data.category)) {
    return NextResponse.json(
      { ok: false, error: "category_not_allowed_for_publisher" },
      { status: 400 }
    );
  }

  // 10. 幂等: external_id 已存在 → 返回 200 + deduplicated
  if (data.external_id) {
    const existing = postRepo.findByExternalId(data.external_id);
    if (existing) {
      return NextResponse.json(
        { ok: true, post: serializePost(existing), deduplicated: true },
        { status: 200 }
      );
    }
  }
  // 11. 幂等: idempotency_key 已存在 → 返回 200 + deduplicated
  if (data.idempotency_key) {
    const existing = postRepo.findByIdempotencyKey(data.idempotency_key);
    if (existing) {
      return NextResponse.json(
        { ok: true, post: serializePost(existing), deduplicated: true },
        { status: 200 }
      );
    }
  }

  // 12. slug 已存在 → 409 (posts 表无 deleted_at 字段, 仅查 slug)
  const slugRow = db
    .prepare(`SELECT id FROM posts WHERE slug = ? LIMIT 1`)
    .get(data.slug);
  if (slugRow) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  // 13. 创建 (默认 published, 免人工再发布; 老板可 admin 后台改 draft)
  // publisher.authorId 现在直接是 user_id (v0.38 P2): novel-publisher 用 admin (上坤), yk-script 用 yk-bot
  const post: Post = postRepo.create({
    slug: data.slug,
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    cover_image: data.cover_image,
    status: "published",
    category: data.category as Post["category"],
    tags: data.tags,
    author_id: publisher.resolveAuthorId(),
    series_id: null,
    published_at: Math.floor(Date.now() / 1000),
    external_id: data.external_id,
    idempotency_key: data.idempotency_key,
    external_meta: data.external_meta,
  });

  console.log(
    `[external/posts] created: publisher=${publisherId} slug=${post.slug} author_id=${publisher.resolveAuthorId()} post_id=${post.id}`
  );

  return NextResponse.json(
    { ok: true, post: { id: post.id, slug: post.slug, url: postUrl(post.slug) } },
    { status: 201 }
  );
}

// ============ Response serializer (null prototype 安全) ============
function serializePost(p: Post) {
  return {
    id: p.id,
    slug: p.slug,
    url: postUrl(p.slug),
    title: p.title,
    category: p.category,
    status: p.status,
    published_at: p.published_at,
    external_id: p.external_id,
  };
}

// ============ 测试 helper ============
export { __resetRateLimitForTesting } from "@/lib/external-auth";
