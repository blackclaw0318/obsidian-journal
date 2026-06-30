// ============================================================
// /api/auth/change-password - 改自己密码 (Phase 3.9, v0.16)
// 鉴权: requireUser (登录态)
// 行为: 校验旧密码 → 改新密码 → 踢自己所有 session (含当前)
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, deleteAllUserSessions } from "@/lib/auth";
import { userRepo } from "@/lib/repo";

export const runtime = "nodejs";

interface Body {
  old_password?: string;
  new_password?: string;
}

export async function POST(req: Request) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); }

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const oldPwd = body.old_password ?? "";
  const newPwd = body.new_password ?? "";

  if (!oldPwd) return NextResponse.json({ ok: false, error: "missing_old_password" }, { status: 400 });
  if (newPwd.length < 8) return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  if (newPwd.length > 200) return NextResponse.json({ ok: false, error: "password_too_long" }, { status: 400 });
  if (oldPwd === newPwd) return NextResponse.json({ ok: false, error: "password_unchanged" }, { status: 400 });

  const dbUser = userRepo.byId(user.id);
  if (!dbUser) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  const oldMatch = bcrypt.compareSync(oldPwd, dbUser.password_hash);
  if (!oldMatch) return NextResponse.json({ ok: false, error: "old_password_invalid" }, { status: 401 });

  const newHash = bcrypt.hashSync(newPwd, 10);
  const ok = userRepo.updatePassword(user.id, newHash);
  if (!ok) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  // 踢所有 session (含当前, 强制重新登录)
  deleteAllUserSessions(user.id);

  return NextResponse.json({ ok: true, sessionsRevoked: true, mustReLogin: true });
}