// ============================================================
// GET /api/resources/[id]/download — 真实文件下载 + 计数 +1
// 老板 Q3: 真实累计, 不做来源限制 (公开资源浏览即可下载)
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

  // 302 重定向到静态 URL (本地: /uploads/{filename})
  // 真实部署 CDN/OSS 时, 这里改成 signed URL
  const downloadUrl = item.url;
  return NextResponse.redirect(new URL(downloadUrl, request.url), { status: 302 });
}