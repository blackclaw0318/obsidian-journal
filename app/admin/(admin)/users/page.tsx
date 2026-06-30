// ============================================================
// /admin/users - 用户列表 (Phase 3.9, v0.16)
// Server Component: 列所有 user (含 session_count)
// ============================================================

import Link from "next/link";
import { userRepo } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "用户管理 · Admin" };

export default async function UsersPage() {
  const me = await requireUser();
  const users = userRepo.listWithStats({ limit: 100 });
  const total = userRepo.count();
  const archivedCount = userRepo.count({ includeDeleted: true }) - total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👥 用户管理</h1>
          <p className="mt-1 text-xs text-fg-muted">
            {total} 活跃用户 · {archivedCount} 归档用户
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/change-password"
            className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-base"
          >
            🔐 改自己密码
          </Link>
          <Link
            href="/admin/users/new"
            className="rounded bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-80"
          >
            ➕ 新建用户
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-bg-base text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left">邮箱</th>
              <th className="px-4 py-3 text-left">显示名</th>
              <th className="px-4 py-3 text-left">角色</th>
              <th className="px-4 py-3 text-left">活跃 session</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-bg-base">
                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">{u.name ?? <span className="text-fg-muted">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${u.role === "admin" ? "bg-fg text-bg" : "bg-bg-base text-fg-muted"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{u.session_count}</span>
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted">
                  {new Date(u.created_at * 1000).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-accent hover:underline"
                  >
                    {u.id === me.id ? "✏️ 编辑 (自己)" : "✏️ 编辑"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}