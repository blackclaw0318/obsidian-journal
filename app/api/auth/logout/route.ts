// ============================================================
// POST /api/auth/logout
// ============================================================
import { NextResponse } from "next/server";
import {
  getSessionJwtFromCookie,
  deleteSessionByJwt,
  clearSessionCookie
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const jwt = getSessionJwtFromCookie();
  if (jwt) {
    await deleteSessionByJwt(jwt);
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
