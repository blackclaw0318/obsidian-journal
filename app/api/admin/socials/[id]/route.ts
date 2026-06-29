// ============================================================
// /api/admin/socials/[id] - 更新/删除 (v0.11)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { socialRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface UpdateBody {
  platform?: string;
  label?: string;
  url?: string;
  icon?: string | null;
  order?: number;
  visible?: boolean;
}

const ALLOWED_PLATFORMS = ["github", "twitter", "email", "wechat", "bilibili", "zhihu", "rss", "custom"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  const existing = socialRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  let body: UpdateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const patch: Record<string, any> = {};
  if (typeof body.platform === "string") {
    if (!ALLOWED_PLATFORMS.includes(body.platform)) return NextResponse.json({ ok: false, error: "invalid_platform" }, { status: 400 });
    patch.platform = body.platform;
  }
  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label || label.length > 100) return NextResponse.json({ ok: false, error: "invalid_label" }, { status: 400 });
    patch.label = label;
  }
  if (typeof body.url === "string") {
    const url = body.url.trim();
    if (!url || url.length > 500) return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
    patch.url = url;
  }
  if (body.icon !== undefined) patch.icon = body.icon;
  if (typeof body.order === "number") patch.order = body.order;
  if (typeof body.visible === "boolean") patch.visible = body.visible ? 1 : 0;

  const updated = socialRepo.update(params.id, patch);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, social: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  const existing = socialRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ok = socialRepo.hardDelete(params.id);
  return NextResponse.json({ ok });
}
