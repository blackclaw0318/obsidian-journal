// ============================================================
// POST /api/admin/socials - 创建社交 (v0.11)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { socialRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  platform?: string;
  label?: string;
  url?: string;
  icon?: string | null;
  order?: number;
  visible?: boolean;
}

const ALLOWED_PLATFORMS = ["github", "twitter", "email", "wechat", "bilibili", "zhihu", "rss", "custom"];

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  let body: CreateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const platform = (body.platform ?? "").toString().trim();
  const label = (body.label ?? "").toString().trim();
  const url = (body.url ?? "").toString().trim();
  const order = typeof body.order === "number" ? body.order : 0;
  const visible = body.visible !== false;

  if (!platform || !ALLOWED_PLATFORMS.includes(platform)) return NextResponse.json({ ok: false, error: "invalid_platform" }, { status: 400 });
  if (!label) return NextResponse.json({ ok: false, error: "missing_label" }, { status: 400 });
  if (!url) return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });
  if (label.length > 100) return NextResponse.json({ ok: false, error: "label_too_long" }, { status: 400 });
  if (url.length > 500) return NextResponse.json({ ok: false, error: "url_too_long" }, { status: 400 });

  const social = socialRepo.create({
    platform, label, url,
    icon: body.icon ?? null,
    order, visible: visible ? 1 : 0
  });

  return NextResponse.json({ ok: true, social }, { status: 201 });
}
