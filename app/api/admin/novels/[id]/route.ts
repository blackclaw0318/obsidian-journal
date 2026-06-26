// ============================================================
// /api/admin/novels/[id] - 更新 / 软删 / 恢复 (Phase 3.3)
// PUT: 更新
// DELETE: 软删除 (status='archived')
// PATCH: { action: 'restore' } 恢复
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo } from "@/lib/repo";
import type { NovelStatus } from "@/lib/types";

export const runtime = "nodejs";

// 严守 v0.6.1: NovelStatus 3 值, archived 由 deleted_at 字段承载 (不入 enum)
const VALID_STATUS: NovelStatus[] = ["ongoing", "completed", "hiatus"];

interface UpdateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  status?: NovelStatus;
}

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
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

  const existing = novelRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  // slug 唯一性
  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (novelRepo.slugExists(body.slug, params.id)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  const updates: Partial<UpdateBody> = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
  if (body.status !== undefined) updates.status = body.status;

  const updated = novelRepo.update(params.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, novel: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = novelRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = novelRepo.softDelete(params.id);
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

  const existing = novelRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "restore") {
    const ok = novelRepo.restore(params.id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}