// ============================================================
// /api/admin/novels/[id]/volumes/[vid]/chapters - 创建章节 (Phase 3.3)
// 自动算 order = max+1 (跳过 deleted)
// slug 全局唯一
// 严守 v0.6.1: Chapter 无 status 字段, 用 published boolean
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo, volumeRepo, chapterRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  published?: boolean;  // 严守 v0.6.1: 替代 status enum
  order?: number;
}

export async function POST(req: Request, { params }: { params: { id: string; vid: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const novel = novelRepo.byId(params.id);
  if (!novel) return NextResponse.json({ ok: false, error: "novel_not_found" }, { status: 404 });
  const volume = volumeRepo.byId(params.vid);
  if (!volume) return NextResponse.json({ ok: false, error: "volume_not_found" }, { status: 404 });
  if (volume.novel_id !== params.id) {
    return NextResponse.json({ ok: false, error: "volume_not_in_novel" }, { status: 400 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const slug = (body.slug ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const content = (body.content ?? "").toString();
  const excerpt = (body.excerpt ?? "").toString().trim() || null;
  const published = body.published === true;  // 默认 false (draft)

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  if (chapterRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  let order = body.order;
  if (order === undefined || order === null) {
    order = chapterRepo.nextOrder(params.vid);
  } else {
    if (typeof order !== "number" || order < 1 || !Number.isInteger(order)) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const published_at = published ? now : null;

  try {
    const chapter = chapterRepo.create({
      volume_id: params.vid,
      order,
      slug,
      title,
      content,
      excerpt,
      published,
      published_at
    });
    return NextResponse.json({ ok: true, chapter }, { status: 201 });
  } catch (e: any) {
    if (String(e.message ?? "").includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "order_exists_or_slug_exists" }, { status: 409 });
    }
    throw e;
  }
}