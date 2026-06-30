// ============================================================
// /admin/users/new - 新建用户 (Phase 3.9, v0.16)
// ============================================================

import { UserForm } from "../_components/UserForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "新建用户 · Admin" };

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">➕ 新建用户</h1>
        <p className="mt-1 text-xs text-fg-muted">初始密码必须 ≥8 字符, 用户首次登录后必须修改</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <UserForm mode="create" />
      </div>
    </div>
  );
}