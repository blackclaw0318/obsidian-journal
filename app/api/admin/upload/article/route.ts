// ============================================================
// POST /api/admin/upload/article - MD 上传创建 Post (v0.11)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { postRepo, seriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface Body {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  cover_image?: string | null;
  category?: "tech" | "life";
  tags?: string | null;
  series_id?: string | null;
  publish?: boolean;
  status?: "draft" | "published" | "archived";
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const slug = (body.slug ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const content = (body.content ?? "").toString();
  const category = body.category;
  const status = body.status ?? (body.publish ? "published" : "draft");
  const seriesId = body.series_id || null;

  if (!slug || slug.length > 200) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  if (!title || title.length > 200) return NextResponse.json({ ok: false, error: "invalid_title" }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  if (category !== "tech" && category !== "life") return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  if (status !== "draft" && status !== "published" && status !== "archived") return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  if (postRepo.slugExists(slug)) return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  if (seriesId && !seriesRepo.byId(seriesId)) return NextResponse.json({ ok: false, error: "series_not_found" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const published_at = status === "published" ? now : null;
  const post = postRepo.create({
    slug, title, content,
    excerpt: body.excerpt ?? null,
    cover_image: body.cover_image ?? null,
    status, category,
    tags: body.tags ?? null,
    author_id: user.id,
    series_id: seriesId,
    published_at
  });

  return NextResponse.json({ ok: true, post }, { status: 201 });
}
