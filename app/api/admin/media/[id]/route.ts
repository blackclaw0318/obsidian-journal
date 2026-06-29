// ============================================================
// /api/admin/media/[id] - 媒体更新 / 删除 (Phase 3.6)
// GET:    详情 + 引用追踪
// PATCH:  更新 alt 文本
// DELETE: 物理删除 (含 unlink 文件 + 清 media_usages)
// ============================================================
import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { requireUser } from "@/lib/auth";
import { mediaRepo } from "@/lib/repo";

export const runtime = "nodejs";

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

  const media = mediaRepo.byId(params.id);
  if (!media) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const usages = mediaRepo.listUsages(media.id);
  return NextResponse.json({ ok: true, media, usages });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: { alt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const existing = mediaRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const updates: any = {};
  if (body.alt !== undefined) updates.alt = body.alt;

  const updated = mediaRepo.update(params.id, updates);
  return NextResponse.json({ ok: true, media: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const existing = mediaRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // 1) DB 软关联清 + 物理删除 media 记录 (级联清 media_usages)
  const result = mediaRepo.hardDelete(params.id);

  // 2) unlink 文件 (失败不阻塞, 留下 orphan 以后清理)
  if (existing.storage_type === "local") {
    const filePath = resolve(process.cwd(), "public", existing.url.replace(/^\//, ""));
    if (existsSync(filePath)) {
      try { await unlink(filePath); } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ ok: result.mediaOk, usageCount: result.usageCount });
}
