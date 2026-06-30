// ============================================================
// /api/admin/users - 用户管理 (Phase 3.9, v0.16)
// POST: 新建用户
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { userRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface CreateBody {
  email?: string;
  password?: string;
  name?: string | null;
  role?: "admin" | "user";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim() || null;
  const role = body.role === "admin" ? "admin" : "user";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }
  if (password.length > 200) {
    return NextResponse.json({ ok: false, error: "password_too_long" }, { status: 400 });
  }
  if (name && name.length > 100) {
    return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });
  }
  if (userRepo.emailExists(email)) {
    return NextResponse.json({ ok: false, error: "email_exists" }, { status: 409 });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = userRepo.create({
    email,
    password_hash: passwordHash,
    name,
    role
  });

  // 不返回 password_hash
  const { password_hash, ...safe } = newUser;
  return NextResponse.json({ ok: true, user: safe }, { status: 201 });
}