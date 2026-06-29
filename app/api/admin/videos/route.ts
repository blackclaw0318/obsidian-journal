// ============================================================
// POST /api/admin/videos - 创建视频 (Phase 3.4)
// GET  /api/admin/videos - 列表 (admin 内部用, 公开页走别处)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { videoRepo, videoSeriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  series_id?: string | null;
  embed_url?: string;
  cover_image?: string | null;
  duration?: number | null;
  status?: "draft" | "published" | "archived";
  publish?: boolean;
}

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const seriesId = url.searchParams.get("series_id") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const result = videoRepo.listAll({ status, seriesId, q, limit: 100 });
  return NextResponse.json({ ok: true, ...result });
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
  const embedUrl = (body.embed_url ?? "").toString().trim();
  const description = (body.description ?? "").toString().trim();
  const seriesId = body.series_id ?? null;
  const status = body.status ?? (body.publish ? "published" : "draft");
  const duration = body.duration ?? null;

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (!embedUrl) return NextResponse.json({ ok: false, error: "missing_embed_url" }, { status: 400 });
  if (status !== "draft" && status !== "published" && status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  // 系列存在性
  if (seriesId && !videoSeriesRepo.byId(seriesId)) {
    return NextResponse.json({ ok: false, error: "series_not_found" }, { status: 400 });
  }

  if (videoRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const published_at = status === "published" ? now : null;

  const video = videoRepo.create({
    series_id: seriesId,
    slug,
    title,
    description: description || null,
    embed_url: embedUrl,
    cover_image: body.cover_image ?? null,
    duration,
    status,
    published_at
  });

  return NextResponse.json({ ok: true, video }, { status: 201 });
}
