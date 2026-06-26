// ============================================================
// POST /api/admin/posts - 创建文章 (Phase 3.2)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { postRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string | null;
  status?: "draft" | "published" | "archived";
  category?: "tech" | "life";
  tags?: string;
  publish?: boolean;
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const slug = (body.slug ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const content = (body.content ?? "").toString();
  const category = body.category;
  const status = body.status ?? (body.publish ? "published" : "draft");
  const tags = (body.tags ?? "").toString().trim();
  const excerpt = (body.excerpt ?? "").toString().trim();

  // 校验
  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  if (category !== "tech" && category !== "life") {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }
  if (status !== "draft" && status !== "published" && status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  if (postRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const published_at = status === "published" ? now : null;

  const post = postRepo.create({
    slug,
    title,
    excerpt: excerpt || null,
    content,
    cover_image: body.cover_image ?? null,
    status,
    category,
    tags: tags || null,
    author_id: user.id,
    published_at
  });

  return NextResponse.json({ ok: true, post }, { status: 201 });
}