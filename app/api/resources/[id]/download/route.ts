// ============================================================
// GET /api/resources/[id]/download — 真实文件下载 + 计数 +1
// 老板 Q3: 真实累计, 不做来源限制 (公开资源浏览即可下载)
// 老板 21:54 反馈: 下载后跳转 localhost:3000/... (错)
//   根因: Next.js `request.url` 在 cloudflared tunnel 后返回内部 URL
//   修复: 用 x-forwarded-host + x-forwarded-proto 构造 public URL
// ============================================================
import { NextResponse } from "next/server";
import { mediaRepo, mediaCounterRepo, mediaAccessLogRepo } from "@/lib/repo";
import { displayDownload } from "@/lib/counter";
import { getClientIp, hashIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const item = mediaRepo.byId(params.id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  // 计数 + 写日志 (下载不去重, 用户多次下载每次都计数)
  const counter = mediaCounterRepo.incDownload(params.id);
  if (!counter) {
    return NextResponse.json({ ok: false, error: "counter_missing" }, { status: 500 });
  }
  mediaAccessLogRepo.insert({
    media_id: params.id,
    access_type: "download",
    ip_hash: ipHash,
    user_agent_hash: null,
    country: null
  });

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