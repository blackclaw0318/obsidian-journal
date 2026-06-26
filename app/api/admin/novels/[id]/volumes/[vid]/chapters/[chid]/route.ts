// ============================================================
// /api/admin/novels/[id]/volumes/[vid]/chapters/[chid] - 更新 / 软删 / 恢复 (Phase 3.3)
// 严守 v0.6.1: Chapter 无 status 字段, 用 published boolean
// PUT: 更新
// DELETE: 软删除 (写 deleted_at, 不动 published)
// PATCH: { action: 'restore' } 清 deleted_at
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo, volumeRepo, chapterRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  published?: boolean;  // 严守 v0.6.1: 替代 status enum
  order?: number;
}

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
}

async function getContext(novelId: string, volumeId: string, chapterId: string) {
  const novel = novelRepo.byId(novelId);
  if (!novel) return { error: "novel_not_found", status: 404 };
  const volume = volumeRepo.byId(volumeId);
  if (!volume) return { error: "volume_not_found", status: 404 };
  if (volume.novel_id !== novelId) return { error: "volume_not_in_novel", status: 400 };
  const chapter = chapterRepo.byId(chapterId);
  if (!chapter) return { error: "not_found", status: 404 };
  if (chapter.volume_id !== volumeId) return { error: "chapter_not_in_volume", status: 400 };
  return { chapter, novel, volume };
}

export async function PUT(req: Request, { params }: { params: { id: string; vid: string; chid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getContext(params.id, params.vid, params.chid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const existing = ctx.chapter;

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  }
  if (body.content !== undefined && !body.content) {
    return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  }
  if (body.order !== undefined && (typeof body.order !== "number" || body.order < 1 || !Number.isInteger(body.order))) {
    return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
  }

  // slug 唯一性 (排除自身)
  if (body.slug && body.slug !== existing.slug) {
    if (!body.slug.trim()) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    if (chapterRepo.slugExists(body.slug, params.chid)) {
      return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
    }
  }

  // published_at 首次发布自动设
  let published_at: number | null | undefined = undefined;
  if (body.published === true && !existing.published_at) {
    published_at = Math.floor(Date.now() / 1000);
  } else if (body.published === false) {
    published_at = null;
  }

  const updates: any = {};
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
  if (body.published !== undefined) updates.published = body.published;
  if (body.order !== undefined) updates.order = body.order;
  if (published_at !== undefined) updates.published_at = published_at;

  try {
    const updated = chapterRepo.update(params.chid, updates);
    if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, chapter: updated });
  } catch (e: any) {
    if (String(e.message ?? "").includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "order_exists_or_slug_exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; vid: string; chid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getContext(params.id, params.vid, params.chid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  const ok = chapterRepo.softDelete(params.chid);
  return NextResponse.json({ ok });
}

export async function PATCH(req: Request, { params }: { params: { id: string; vid: string; chid: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = await getContext(params.id, params.vid, params.chid);
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "restore") {
    const ok = chapterRepo.restore(params.chid);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}