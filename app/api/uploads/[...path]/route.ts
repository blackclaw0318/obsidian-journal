// ============================================================
// GET /api/uploads/[...path] - 动态 serve public/uploads/* 静态资源
// 解决 next start 启动时缓存 public/ 文件列表导致新上传文件 404 的问题
// middleware.ts 把 /uploads/* 重写到本路由 (URL 保持 /uploads/...)
// ============================================================
import { NextResponse } from "next/server";
import { createReadStream, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
// 不缓存 (文件可能随时更新)
export const dynamic = "force-dynamic";

// MIME 推断 (覆盖常用类型, 缺省 application/octet-stream)
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function mimeFor(filename: string): string {
  const ext = filename.toLowerCase().match(/\.[^./]+$/)?.[0] ?? "";
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  // 1. 路径安全检查: 防 ../ 跳出 public/uploads/
  const segments = params.path;
  if (!segments || segments.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_path" }, { status: 400 });
  }
  for (const seg of segments) {
    if (!seg || seg === ".." || seg === "." || seg.includes("\0")) {
      return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }
  }

  // 2. 解析绝对路径, 校验在 public/uploads/ 下
  const projectRoot = process.cwd();
  const uploadRoot = resolve(join(projectRoot, "public", "uploads"));
  const requested = resolve(join(uploadRoot, ...segments));
  if (!requested.startsWith(uploadRoot + "/") && requested !== uploadRoot) {
    return NextResponse.json({ ok: false, error: "path_traversal" }, { status: 403 });
  }

  // 3. stat 检查文件
  let stat;
  try {
    stat = statSync(requested);
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ ok: false, error: "not_a_file" }, { status: 404 });
  }

  // 4. 转 ReadableStream 给 NextResponse (Edge-friendly)
  const nodeStream = createReadStream(requested);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  // 5. Last-Modified / If-Modified-Since 简易缓存
  const lastModified = new Date(stat.mtimeMs).toUTCString();
  const ifModifiedSince = _req.headers.get("if-modified-since");
  if (ifModifiedSince && ifModifiedSince === lastModified) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": mimeFor(segments[segments.length - 1]),
      "Content-Length": String(stat.size),
      "Last-Modified": lastModified,
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "Accept-Ranges": "bytes",
    },
  });
}