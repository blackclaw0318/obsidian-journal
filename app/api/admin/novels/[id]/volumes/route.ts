// ============================================================
// /api/admin/novels/[id]/volumes - 创建卷 (Phase 3.3)
// 自动算 order = max+1
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { novelRepo, volumeRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  title?: string;
  description?: string | null;
  order?: number;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const novel = novelRepo.byId(params.id);
  if (!novel) return NextResponse.json({ ok: false, error: "novel_not_found" }, { status: 404 });

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = (body.title ?? "").toString().trim();
  const description = (body.description ?? "").toString().trim() || null;

  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (title.length > 200) {
    return NextResponse.json({ ok: false, error: "input_too_long" }, { status: 400 });
  }

  // order: 如果传了,验证 >0; 否则自动 max+1
  let order = body.order;
  if (order === undefined || order === null) {
    order = volumeRepo.nextOrder(params.id);
  } else {
    if (typeof order !== "number" || order < 1 || !Number.isInteger(order)) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }
  }

  try {
    const volume = volumeRepo.create({
      novel_id: params.id,
      order,
      title,
      description
    });
    return NextResponse.json({ ok: true, volume }, { status: 201 });
  } catch (e: any) {
    // UNIQUE (novel_id, "order") 冲突
    if (String(e.message ?? "").includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "order_exists" }, { status: 409 });
    }
    throw e;
  }
}