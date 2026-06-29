// ============================================================
// POST /api/admin/upload/chapter - MD 上传创建 Chapter (v0.11)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { chapterRepo, volumeRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface Body {
  volume_id?: string;
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  publish?: boolean;
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const volumeId = (body.volume_id ?? "").toString().trim();
  const slug = (body.slug ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const content = (body.content ?? "").toString();
  const publish = body.publish === true;

  if (!volumeId) return NextResponse.json({ ok: false, error: "missing_volume" }, { status: 400 });
  const vol = volumeRepo.byId(volumeId);
  if (!vol) return NextResponse.json({ ok: false, error: "volume_not_found" }, { status: 404 });
  if (!slug || slug.length > 200) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  if (!title || title.length > 200) return NextResponse.json({ ok: false, error: "invalid_title" }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  if (chapterRepo.slugExists(slug)) return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });

  const order = chapterRepo.nextOrder(volumeId);
  const now = Math.floor(Date.now() / 1000);
  const chapter = chapterRepo.create({
    volume_id: volumeId,
    order,
    slug, title, content,
    excerpt: body.excerpt ?? null,
    published: publish,
    published_at: publish ? now : null
  });

  return NextResponse.json({ ok: true, chapter }, { status: 201 });
}
