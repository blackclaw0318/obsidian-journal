// ============================================================
// /api/admin/video-series/[id] - 更新 / 删除 (Phase 3.4)
// PUT:    更新
// DELETE: 物理删除 (会级联把 videos.series_id 置 NULL)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { videoSeriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  order?: number;
}

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const series = videoSeriesRepo.byId(params.id);
  if (!series) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, series });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const existing = videoSeriesRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (videoSeriesRepo.slugExists(body.slug, params.id)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  const updates: any = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
  if (body.order !== undefined) updates.order = body.order;

  const updated = videoSeriesRepo.update(params.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, series: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = videoSeriesRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = videoSeriesRepo.hardDelete(params.id);
  return NextResponse.json({ ok });
}
