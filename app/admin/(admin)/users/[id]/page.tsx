// ============================================================
// /admin/users/[id] - 用户编辑 (Phase 3.9, v0.16)
// 含: 基本信息编辑 + 改密码 + 归档
// ============================================================

import { notFound } from "next/navigation";
import { userRepo } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { UserForm } from "../_components/UserForm";
import { ChangePasswordForm } from "../_components/ChangePasswordForm";
import { ArchiveButton } from "../_components/ArchiveButton";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const me = await requireUser();
  const user = userRepo.byId(params.id);
  if (!user) notFound();

  const isSelf = user.id === me.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isSelf ? "✏️ 我的账户" : "✏️ 编辑用户"}</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">id: {user.id} · 邮箱: {user.email}</p>
      </div>

      {/* 基本信息 */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">📝 基本信息</h2>
        <UserForm
          mode="edit"
          userId={user.id}
          isSelf={isSelf}
          initial={{
            email: user.email,
            name: user.name,
            role: user.role
          }}
        />
      </div>

      {/* 改密码 */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">🔐 修改密码</h2>
        <ChangePasswordForm
          mode={isSelf ? "self" : "other"}
          userId={user.id}
          userLabel={user.email}
        />
      </div>

      {/* 归档 */}
      {!isSelf && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <h2 className="mb-2 text-base font-semibold text-red-700 dark:text-red-300">⚠️ 归档用户</h2>
          <p className="mb-4 text-sm text-fg-muted">
            归档后用户无法登录, 所有 session 立即撤销. 数据保留 (软删).
          </p>
          <ArchiveButton userId={user.id} userEmail={user.email} />
        </div>
      )}
    </div>
  );
}