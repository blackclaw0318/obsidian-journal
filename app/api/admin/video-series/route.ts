// ============================================================
// /api/admin/video-series - 系列 CRUD (Phase 3.4)
// GET:  列表
// POST: 创建
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { videoSeriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  order?: number;
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const items = videoSeriesRepo.listWithCount();
  return NextResponse.json({ ok: true, items });
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
  const description = (body.description ?? "").toString().trim();

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  if (videoSeriesRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  const series = videoSeriesRepo.create({
    slug,
    title,
    description: description || null,
    cover_image: body.cover_image ?? null,
    order: body.order ?? videoSeriesRepo.nextOrder()
  });

  return NextResponse.json({ ok: true, series }, { status: 201 });
}
