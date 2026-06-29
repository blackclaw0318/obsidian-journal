// ============================================================
// POST /api/admin/series - 创建系列 (v0.11, v0.6.1 §6 Series 还原)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { seriesRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  slug?: string;
  name?: string;
  description?: string;
  cover_image?: string | null;
  category?: "tech" | "life";
  order?: number;
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  let body: CreateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const slug = (body.slug ?? "").toString().trim();
  const name = (body.name ?? "").toString().trim();
  const category = body.category;
  const order = typeof body.order === "number" ? body.order : 0;

  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  if (category !== "tech" && category !== "life") return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  if (slug.length > 200) return NextResponse.json({ ok: false, error: "slug_too_long" }, { status: 400 });
  if (name.length > 200) return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });
  if (seriesRepo.slugExists(slug)) return NextResponse.json({ ok: false, error: "slug_exists" }, { status: 409 });

  const series = seriesRepo.create({
    slug,
    name,
    description: (body.description ?? "").toString().trim() || null,
    cover_image: body.cover_image ?? null,
    category,
    order
  });

  return NextResponse.json({ ok: true, series }, { status: 201 });
}
