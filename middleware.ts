// ============================================================
// middleware.ts - 保护 /admin/* (除 /admin/login)
// Edge Runtime: 仅验 JWT 签名 (查表放 RSC, 因 node:sqlite 不跑 Edge)
// ============================================================
import { NextResponse, type NextRequest } from "next/server";

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
    // 用 jose 在 Edge 验签
    const { jwtVerify } = await import("jose");
    await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 登录页放行
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
  }

  const valid = await verifyToken(token);
  if (!valid) {
    const res = NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    // 清掉无效 cookie
    res.cookies.set({
      name: SESSION_COOKIE,
      value: "",
      maxAge: 0,
      path: "/"
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
