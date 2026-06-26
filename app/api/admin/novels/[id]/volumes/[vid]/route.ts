// ============================================================
// /api/admin/novels/[id]/volumes/[vid] - 更新 / 软删 (Phase 3.3)
// PUT: 更新 (title/description/order)
// DELETE: 软删除 (所有 chapters status=archived, volume description 加标记)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo, volumeRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  title?: string;
  description?: string | null;
  order?: number;
}

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
}

async function getVolume(novelId: string, volumeId: string) {
  const novel = novelRepo.byId(novelId);
  if (!novel) return { error: "novel_not_found", status: 404 };
  const volume = volumeRepo.byId(volumeId);
  if (!volume) return { error: "not_found", status: 404 };
  if (volume.novel_id !== novelId) return { error: "volume_not_in_novel", status: 400 };
  return { volume };
}

export async function PUT(req: Request, { params }: { params: { id: string; vid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getVolume(params.id, params.vid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  }
  if (body.order !== undefined && (typeof body.order !== "number" || body.order < 1 || !Number.isInteger(body.order))) {
    return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
  }

  const updates: Partial<UpdateBody> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description;
  if (body.order !== undefined) updates.order = body.order;

  try {
    const updated = volumeRepo.update(params.vid, updates);
    if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, volume: updated });
  } catch (e: any) {
    if (String(e.message ?? "").includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "order_exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; vid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getVolume(params.id, params.vid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  const result = volumeRepo.softDeleteWithChapters(params.vid);
  return NextResponse.json({ ok: true, ...result });
}

// 严守 v0.6.1: 软删走 deleted_at, restore 清 deleted_at + 级联恢复 chapters
export async function PATCH(req: Request, { params }: { params: { id: string; vid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getVolume(params.id, params.vid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "restore") {
    const result = volumeRepo.restoreWithChapters(params.vid);
    return NextResponse.json({ ok: true, ...result });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}