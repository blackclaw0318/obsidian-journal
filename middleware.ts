// ============================================================
// middleware.ts - 保护 /admin/* + 板块访问记录 (v0.35.2)
//              + 文章详情 view_count 服务端 +1 (v0.35.3 修复"不累加")
// Edge Runtime: 仅验 JWT 签名 + fire-and-forget 调用 /api/internal/*
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { shouldCountView, viewCookieKey, VIEW_TTL_SEC } from "@/lib/view-counter";

const SESSION_COOKIE = "obsidian_session";
const LOGIN_PATH = "/admin/login";

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-insecure-secret-change-in-prod-please";
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const { jwtVerify } = await import("jose");
    await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * v0.35.2: 板块访问监控 (Q2 = 含 admin, 老板看自己访问频率)
 * - 不记录: /api/*, /_next/*, /uploads/*, /admin/login, 静态资源
 * - 记录范围: 任何 HTML GET 请求
 * - 用 fire-and-forget POST 到 /api/internal/record-view (Edge 不能直接 sqlite)
 */
function shouldRecord(pathname: string): boolean {
  if (pathname === LOGIN_PATH) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/uploads")) return false;
  // 静态资源后缀 (svg/png/jpg/jpeg/webp/ico/css/js/map/json/xml/txt)
  if (/\.(svg|png|jpg|jpeg|webp|ico|css|js|map|json|xml|txt|woff2?|ttf|eot)$/i.test(pathname)) {
    return false;
  }
  return true;
}

/**
 * v0.35.3: 文章详情 view_count 服务端 +1
 *  - 拦截 GET /posts/[slug] (Next.js Link 预取也会进, cookie dedup 兜底)
 *  - 24h 同 cookie 去重 (复用 lib/view-counter 逻辑)
 *  - set-cookie 在 NextResponse 上 (中间件响应才能写浏览器 cookie)
 *  - fire-and-forget POST 到 /api/internal/increment-post-view (Node runtime 写 sqlite)
 *  - 失败静默: 不影响主请求
 *  注: Next.js 会抹去自定义头 (RSC, Next-Router-Prefetch), 故不依赖预取检测;
 *      cookie dedup 保证同 (browser, slug) 24h 内最多 +1, 不管预取还是真实访问
 */
function maybeIncrementPostView(req: NextRequest, response: NextResponse, slug: string): void {
  if (req.method !== "GET") return;
  // 防御: 防止分隔符注入或非正常 slug
  if (slug.includes("/") || slug.includes("\0")) return;

  const cookieKey = viewCookieKey("post", slug);
  const seen = req.cookies.get(cookieKey)?.value;
  // 见过且未过期 → 不增,也不刷 cookie
  if (seen && !shouldCountView(seen)) return;

  // 设 24h cookie (响应里走 Set-Cookie 给浏览器)
  response.cookies.set({
    name: cookieKey,
    value: String(Date.now()),
    maxAge: VIEW_TTL_SEC,
    path: "/",
    sameSite: "lax",
    httpOnly: false
  });

  // fire-and-forget: Node runtime 写 sqlite
  const xfHost = req.headers.get("x-forwarded-host");
  const xfProto = req.headers.get("x-forwarded-proto");
  const host = xfHost ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = xfProto ?? (host.startsWith("localhost") ? "http" : "https");
  const target = new URL(`/api/internal/increment-post-view`, `${proto}://${host}`);
  fetch(target, {
    method: "POST",
    headers: {
      "x-internal-record": "1",
      "content-type": "application/json"
    },
    body: JSON.stringify({ slug }),
    keepalive: true
  }).catch(() => {
    /* 静默吞错, view 计数失败不影响详情页 */
  });
}

function fireRecord(req: NextRequest): void {
  // 仅 GET 请求记录
  if (req.method !== "GET") return;
  if (!shouldRecord(req.nextUrl.pathname)) return;

  const headers: Record<string, string> = {
    "x-internal-record": "1",
    "content-type": "application/json"
  };
  // 转发客户端 IP 信息
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["x-forwarded-for"] = xff;
  const ua = req.headers.get("user-agent");
  if (ua) headers["user-agent"] = ua;

  // 用 x-forwarded-* 优先构造绝对 URL (与 download route 一致)
  const xfHost = req.headers.get("x-forwarded-host");
  const xfProto = req.headers.get("x-forwarded-proto");
  const host = xfHost ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = xfProto ?? (host.startsWith("localhost") ? "http" : "https");
  const target = new URL(`/api/internal/record-view`, `${proto}://${host}`);

  // fire-and-forget: 不 await, 不阻塞响应
  fetch(target, {
    method: "POST",
    headers,
    body: JSON.stringify({ path: req.nextUrl.pathname }),
    keepalive: true
  }).catch(() => {
    /* 静默吞错, record 失败不影响主请求 */
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ===== /posts/[slug] 服务端 view_count +1 (v0.35.3) =====
  // 只匹配单段 slug (避免命中 /posts 或 /posts/page/...)
  const postMatch = pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (postMatch) {
    const slug = decodeURIComponent(postMatch[1]);
    const response = NextResponse.next();
    maybeIncrementPostView(req, response, slug);
    // 板块访问监控也要记 (公开页面)
    fireRecord(req);
    return response;
  }

  // ===== /admin/* 走 JWT 验签 (原有逻辑) =====
  if (pathname.startsWith("/admin")) {
    if (pathname === LOGIN_PATH) {
      // login 也算记录 (老板输入密码)
      fireRecord(req);
      return NextResponse.next();
    }
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    }
    const valid = await verifyToken(token);
    if (!valid) {
      const res = NextResponse.redirect(new URL(LOGIN_PATH, req.url));
      res.cookies.set({ name: SESSION_COOKIE, value: "", maxAge: 0, path: "/" });
      return res;
    }
    fireRecord(req);
    return NextResponse.next();
  }

  // ===== 公开页面: 直接记录 =====
  fireRecord(req);
  return NextResponse.next();
}

export const config = {
  // 覆盖所有非静态路径: 让 /admin 仍走 JWT, 公开页面也 record
  // 静态资源在 shouldRecord 里二次过滤
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
