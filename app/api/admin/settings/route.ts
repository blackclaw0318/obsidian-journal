// ============================================================
// /api/admin/settings - SiteConfig CRUD (Phase 3.8, v0.15)
// GET: 获取当前 site_config (singleton)
// PUT: 更新 site_config
// ============================================================

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { siteConfigRepo } from "@/lib/repo";
import type { Theme } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_THEMES: Theme[] = ["light", "dark", "auto"];

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const config = siteConfigRepo.get();
  return NextResponse.json({ ok: true, config });
}

interface UpdateBody {
  site_name?: string;
  site_tagline?: string;
  site_description?: string | null;
  site_keywords?: string | null;
  default_theme?: Theme;
  allow_custom_html?: 0 | 1 | boolean;
  baidu_push_enabled?: 0 | 1 | boolean;
  baidu_push_token?: string | null;
  og_image?: string | null;
  favicon?: string | null;
  analytics?: string | null;
  // v0.38 P5.5: 版权声明 6 字段
  site_license?: string;
  site_license_url?: string;
  copyright_holder?: string;
  aigc_disclosure?: 0 | 1 | boolean;
  copyright_page_md?: string;
  contact_email?: string;
}

function toInt(v: unknown): 0 | 1 {
  if (v === true || v === 1 || v === "1") return 1;
  return 0;
}

export async function PUT(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.site_name !== undefined) {
    const v = body.site_name.trim();
    if (!v) return NextResponse.json({ ok: false, error: "missing_site_name" }, { status: 400 });
    if (v.length > 100) return NextResponse.json({ ok: false, error: "site_name_too_long" }, { status: 400 });
    updates.site_name = v;
  }
  if (body.site_tagline !== undefined) {
    if (body.site_tagline.length > 200) return NextResponse.json({ ok: false, error: "site_tagline_too_long" }, { status: 400 });
    updates.site_tagline = body.site_tagline.trim();
  }
  if (body.site_description !== undefined) updates.site_description = body.site_description?.trim() || null;
  if (body.site_keywords !== undefined) updates.site_keywords = body.site_keywords?.trim() || null;
  if (body.default_theme !== undefined) {
    if (!ALLOWED_THEMES.includes(body.default_theme)) {
      return NextResponse.json({ ok: false, error: "invalid_theme" }, { status: 400 });
    }
    updates.default_theme = body.default_theme;
  }
  if (body.allow_custom_html !== undefined) updates.allow_custom_html = toInt(body.allow_custom_html);
  if (body.baidu_push_enabled !== undefined) {
    updates.baidu_push_enabled = toInt(body.baidu_push_enabled);
    if (toInt(body.baidu_push_enabled) === 1 && !body.baidu_push_token) {
      // 关时不校验, 开时如未提供 token 则视为清空
      // 接受现状 (不强制)
    }
  }
  if (body.baidu_push_token !== undefined) updates.baidu_push_token = body.baidu_push_token?.trim() || null;
  if (body.og_image !== undefined) updates.og_image = body.og_image?.trim() || null;
  if (body.favicon !== undefined) updates.favicon = body.favicon?.trim() || null;
  if (body.analytics !== undefined) updates.analytics = body.analytics?.trim() || null;

  // v0.38 P5.5: 版权声明 6 字段校验 + 入库
  if (body.site_license !== undefined) {
    const v = String(body.site_license).trim();
    if (!v) return NextResponse.json({ ok: false, error: "missing_site_license" }, { status: 400 });
    if (v.length > 100) return NextResponse.json({ ok: false, error: "site_license_too_long" }, { status: 400 });
    updates.site_license = v;
  }
  if (body.site_license_url !== undefined) {
    const v = String(body.site_license_url).trim();
    if (v && !/^https?:\/\//.test(v)) {
      return NextResponse.json({ ok: false, error: "invalid_site_license_url" }, { status: 400 });
    }
    updates.site_license_url = v || "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  }
  if (body.copyright_holder !== undefined) {
    const v = String(body.copyright_holder).trim();
    if (v.length > 100) return NextResponse.json({ ok: false, error: "copyright_holder_too_long" }, { status: 400 });
    updates.copyright_holder = v || "上坤";
  }
  if (body.aigc_disclosure !== undefined) updates.aigc_disclosure = toInt(body.aigc_disclosure);
  if (body.copyright_page_md !== undefined) updates.copyright_page_md = String(body.copyright_page_md);
  if (body.contact_email !== undefined) {
    const v = String(body.contact_email).trim();
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      return NextResponse.json({ ok: false, error: "invalid_contact_email" }, { status: 400 });
    }
    updates.contact_email = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
  }

  const config = siteConfigRepo.upsert(updates);
  return NextResponse.json({ ok: true, config });
}