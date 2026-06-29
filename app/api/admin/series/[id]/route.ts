// ============================================================
// /api/admin/series/[id] - 更新/软删/恢复 (v0.11)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { seriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  name?: string;
  description?: string;
  cover_image?: string | null;
  category?: "tech" | "life";
  order?: number;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  const existing = seriesRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  let body: UpdateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const patch: Record<string, any> = {};
  if (typeof body.slug === "string") {
    const slug = body.slug.trim();
    if (!slug) return NextResponse.json({ ok: false, error: "empty_slug" }, { status: 400 });
    if (slug.length > 200) return NextResponse.json({ ok: false, error: "slug_too_long" }, { status: 400 });
    if (seriesRepo.slugExists(slug, params.id)) return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    patch.slug = slug;
  }
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ ok: false, error: "empty_name" }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (body.cover_image !== undefined) patch.cover_image = body.cover_image;
  if (body.category === "tech" || body.category === "life") patch.category = body.category;
  if (typeof body.order === "number") patch.order = body.order;

  const updated = seriesRepo.update(params.id, patch);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, series: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  const existing = seriesRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = seriesRepo.hardDelete(params.id);
  return NextResponse.json({ ok });
}
