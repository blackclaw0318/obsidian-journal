// ============================================================
// GET /api/resources/[id]/download — 简化: 直接 302 到文件 (不计数)
// 老板 2026-07-05 00:59 决策: 删所有计数功能
// 保留 URL 是为了前端 <a href> 链接不断 (公开/管理都用此 endpoint)
// ============================================================
import { NextResponse } from "next/server";
import { mediaRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const item = mediaRepo.byId(params.id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // 构造 public download URL (兼容 CDN/tunnel 反代)
  // 优先 x-forwarded-host (cloudflared/CFNginx 设), 然后 host header
  const xfHost = request.headers.get("x-forwarded-host");
  const xfProto = request.headers.get("x-forwarded-proto");
  const host = xfHost ?? request.headers.get("host") ?? new URL(request.url).host;
  const proto = xfProto ?? (host.startsWith("localhost") ? "http" : "https");
  const downloadUrl = item.url.startsWith("/") ? item.url : `/${item.url}`;
  const publicUrl = `${proto}://${host}${downloadUrl}`;

  return NextResponse.redirect(publicUrl, { status: 302 });
}
