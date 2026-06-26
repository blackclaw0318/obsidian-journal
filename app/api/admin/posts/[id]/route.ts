// ============================================================
// /api/admin/posts/[id] - 更新 / 删除 / 恢复 (Phase 3.2)
// PUT: 更新
// DELETE: 软删除 (status='archived')
// PATCH: { action: 'restore' } 恢复
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { postRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  content?: string;
  cover_image?: string | null;
  status?: "draft" | "published" | "archived";
  category?: "tech" | "life";
  tags?: string | null;
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

  const existing = postRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // 校验 status/category
  if (body.status && body.status !== "draft" && body.status !== "published" && body.status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (body.category && body.category !== "tech" && body.category !== "life") {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }

  // slug 唯一性
  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (postRepo.slugExists(body.slug, params.id)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  // 计算 published_at: status -> published 且之前未发布
  const updates: any = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
  if (body.content !== undefined) updates.content = body.content;
  if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
  if (body.status !== undefined) updates.status = body.status;
  if (body.category !== undefined) updates.category = body.category;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.status === "published" && !existing.published_at) {
    updates.published_at = Math.floor(Date.now() / 1000);
  }

  const updated = postRepo.update(params.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, post: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = postRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = postRepo.softDelete(params.id);
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

  const existing = postRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "restore") {
    const ok = postRepo.restore(params.id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}