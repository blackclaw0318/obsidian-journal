// ============================================================
// /api/admin/pages - 页面 CRUD (Phase 3.5)
// GET:  列表
// POST: 创建
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pageRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  blocks?: string; // JSON string of Block[]
  status?: "draft" | "published" | "archived";
  publish?: boolean;
}

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const result = pageRepo.listAll({ status, q, limit: 100 });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const slug = (body.slug ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const description = (body.description ?? "").toString().trim();
  const blocks = (body.blocks ?? "[]").toString();
  const status = body.status ?? (body.publish ? "published" : "draft");

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (status !== "draft" && status !== "published" && status !== "archived") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  // 校验 blocks JSON
  try {
    JSON.parse(blocks);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_blocks_json" }, { status: 400 });
  }

  if (pageRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const published_at = status === "published" ? now : null;

  const page = pageRepo.create({
    slug,
    title,
    description: description || null,
    blocks,
    status,
    author_id: user.id,
    published_at
  });

  return NextResponse.json({ ok: true, page }, { status: 201 });
}
