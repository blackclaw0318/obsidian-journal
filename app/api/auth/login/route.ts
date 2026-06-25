// ============================================================
// POST /api/auth/login
// ============================================================
import { NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = (body.email ?? "").toString().trim();
  const password = (body.password ?? "").toString();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
  }
  if (email.length > 200 || password.length > 200) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const result = await login(email, password);

  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 401;
    return NextResponse.json(
      { ok: false, error: result.error },
      {
        status,
        headers: result.error === "rate_limited" ? { "Retry-After": "900" } : undefined
      }
    );
  }

  setSessionCookie(result.jwt!, result.expiresAt!);

  return NextResponse.json({
    ok: true,
    user: result.user,
    expiresAt: result.expiresAt
  });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
