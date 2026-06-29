// ============================================================
// /api/admin/pages/[id] - 更新 / 删除 / 恢复 (Phase 3.5)
// PUT:    更新
// DELETE: 软删除 (status='archived')
// PATCH:  { action: 'restore' } 恢复
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pageRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  blocks?: string;
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

  const page = pageRepo.byId(params.id);
  if (!page) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, page });
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

  const existing = pageRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.status && body.status !== "draft" && body.status !== "published" && body.status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (pageRepo.slugExists(body.slug, params.id)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  if (body.blocks !== undefined) {
    try {
      JSON.parse(body.blocks);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_blocks_json" }, { status: 400 });
    }
  }

  const updates: any = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.blocks !== undefined) updates.blocks = body.blocks;
  if (body.status !== undefined) updates.status = body.status;
  if (body.status === "published" && !existing.published_at) {
    updates.published_at = Math.floor(Date.now() / 1000);
  }

  const updated = pageRepo.update(params.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, page: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = pageRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = pageRepo.softDelete(params.id);
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

  const existing = pageRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "restore") {
    const ok = pageRepo.restore(params.id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
