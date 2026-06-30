// ============================================================
// /api/admin/users/[id] - 用户更新/软删 (Phase 3.9, v0.16)
// PUT: 更新 name/role/email
// DELETE: 软删除 (deleted_at)
// PATCH: { action: 'restore' } 恢复; { action: 'change_password', password }
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, deleteAllUserSessions } from "@/lib/auth";
import { userRepo } from "@/lib/repo";

export const runtime = "nodejs";

async function auth() {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return { user: null, error: "forbidden" as const };
    return { user, error: null as null };
  } catch {
    return { user: null, error: "unauthorized" as const };
  }
}

interface UpdateBody {
  name?: string | null;
  email?: string;
  role?: "admin" | "user";
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { user, error } = await auth();
  if (error === "unauthorized") return NextResponse.json({ ok: false, error }, { status: 401 });
  if (error === "forbidden") return NextResponse.json({ ok: false, error }, { status: 403 });

  const existing = userRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (existing.deleted_at) return NextResponse.json({ ok: false, error: "user_archived" }, { status: 410 });

  let body: UpdateBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const updates: Partial<UpdateBody> = {};
  if (body.name !== undefined) {
    if (body.name && body.name.length > 100) return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });
    updates.name = body.name?.trim() || null;
  }
  if (body.email !== undefined) {
    const newEmail = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    if (newEmail !== existing.email && userRepo.emailExists(newEmail, existing.id)) {
      return NextResponse.json({ ok: false, error: "email_exists" }, { status: 409 });
    }
    updates.email = newEmail;
  }
  if (body.role !== undefined) {
    if (existing.id === user!.id && body.role !== "admin") {
      return NextResponse.json({ ok: false, error: "cannot_demote_self" }, { status: 400 });
    }
    updates.role = body.role;
  }

  const updated = userRepo.update(existing.id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  const { password_hash, ...safe } = updated;
  return NextResponse.json({ ok: true, user: safe });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user, error } = await auth();
  if (error === "unauthorized") return NextResponse.json({ ok: false, error }, { status: 401 });
  if (error === "forbidden") return NextResponse.json({ ok: false, error }, { status: 403 });

  const existing = userRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (existing.id === user!.id) return NextResponse.json({ ok: false, error: "cannot_archive_self" }, { status: 400 });

  // 软删 + 清所有 session (踢下线)
  const ok = userRepo.softDelete(existing.id);
  if (!ok) return NextResponse.json({ ok: false, error: "archive_failed" }, { status: 500 });
  deleteAllUserSessions(existing.id);

  return NextResponse.json({ ok: true, userId: existing.id, archived: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await auth();
  if (error === "unauthorized") return NextResponse.json({ ok: false, error }, { status: 401 });
  if (error === "forbidden") return NextResponse.json({ ok: false, error }, { status: 403 });

  const existing = userRepo.byId(params.id);
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  let body: { action?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  if (body.action === "restore") {
    if (!existing.deleted_at) return NextResponse.json({ ok: false, error: "user_not_archived" }, { status: 400 });
    const ok = userRepo.restore(existing.id);
    if (!ok) return NextResponse.json({ ok: false, error: "restore_failed" }, { status: 500 });
    const updated = userRepo.byId(existing.id);
    const { password_hash, ...safe } = updated!;
    return NextResponse.json({ ok: true, user: safe });
  }

  if (body.action === "change_password") {
    const newPassword = body.password ?? "";
    if (newPassword.length < 8) return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
    if (newPassword.length > 200) return NextResponse.json({ ok: false, error: "password_too_long" }, { status: 400 });
    const hash = bcrypt.hashSync(newPassword, 10);
    const ok = userRepo.updatePassword(existing.id, hash);
    if (!ok) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    // 踢所有 session (强制重新登录)
    deleteAllUserSessions(existing.id);
    return NextResponse.json({ ok: true, userId: existing.id, sessionsRevoked: true });
  }

  return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
}