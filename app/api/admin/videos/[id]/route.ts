// ============================================================
// /api/admin/videos/[id] - 更新 / 删除 / 恢复 (Phase 3.4)
// PUT:    更新
// DELETE: 软删除 (status='archived')
// PATCH:  { action: 'restore' } 恢复
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { videoRepo, videoSeriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  series_id?: string | null;
  embed_url?: string;
  cover_image?: string | null;
  duration?: number | null;
  status?: "draft" | "published" | "archived";
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

  const video = videoRepo.byId(params.id);
  if (!video) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, video });
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

  const existing = videoRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.status && body.status !== "draft" && body.status !== "published" && body.status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  // slug 唯一性
  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (videoRepo.slugExists(body.slug, params.id)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  // series 存在性
  if (body.series_id && !videoSeriesRepo.byId(body.series_id)) {
    return NextResponse.json({ ok: false, error: "series_not_found" }, { status: 400 });
  }

  const updates: any = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.series_id !== undefined) updates.series_id = body.series_id;
  if (body.embed_url !== undefined) updates.embed_url = body.embed_url;
  if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
  if (body.duration !== undefined) updates.duration = body.duration;
  if (body.status !== undefined) updates.status = body.status;
  if (body.status === "published" && !existing.published_at) {
    updates.published_at = Math.floor(Date.now() / 1000);
  }

  const updated = videoRepo.update(params.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, video: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = videoRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = videoRepo.softDelete(params.id);
  return NextResponse.json({ ok });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const existing = videoRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "restore") {
    const ok = videoRepo.restore(params.id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
