// ============================================================
// /admin/change-password - admin 改自己密码 (Phase 3.9, v0.16)
// ============================================================

import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "../users/_components/ChangePasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "修改我的密码 · Admin" };

export default async function ChangePasswordPage() {
  const me = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔐 修改我的密码</h1>
        <p className="mt-1 text-xs text-fg-muted">当前账号: {me.email} ({me.role})</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <ChangePasswordForm mode="self" userLabel={me.email} />
      </div>
    </div>
  );
}