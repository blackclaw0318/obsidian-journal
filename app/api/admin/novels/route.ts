// ============================================================
// /api/admin/novels - 列表 + 创建 (Phase 3.3)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo } from "@/lib/repo";
import type { NovelStatus } from "@/lib/types";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  status?: NovelStatus;
}

// 严守 v0.6.1: NovelStatus 3 值 (ongoing|completed|hiatus), archived 由 deleted_at 字段承载
const VALID_STATUS: NovelStatus[] = ["ongoing", "completed", "hiatus"];

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
  const status: NovelStatus = body.status ?? "ongoing";
  const description = (body.description ?? "").toString().trim() || null;

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
  if (slug.length > 200 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  if (novelRepo.slugExists(slug)) {
    return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });
  }

  const novel = novelRepo.create({
    slug,
    title,
    description,
    cover_image: body.cover_image ?? null,
    status
  });

  return NextResponse.json({ ok: true, novel }, { status: 201 });
}