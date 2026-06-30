// ============================================================
// ChangePasswordForm - 改密码 (Phase 3.9, v0.16)
// 支持: admin 改自己 (旧密码必填) / admin 改其他用户 (无旧密码)
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none";

interface Props {
  mode: "self" | "other";
  userId?: string;  // mode=other 时必填
  userLabel?: string;
}

export function ChangePasswordForm({ mode, userId, userLabel }: Props) {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMsg({ kind: "err", text: "❌ 两次输入的新密码不一致" });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ kind: "err", text: "❌ 新密码至少 8 字符" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      let res, j;
      if (mode === "self") {
        res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
        j = await res.json();
        if (j.ok) {
          setMsg({ kind: "ok", text: "✅ 已修改, 3 秒后跳登录页" });
          setTimeout(() => router.push("/admin/login"), 3000);
        } else {
          setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
        }
      } else {
        res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "change_password", password: newPassword })
        });
        j = await res.json();
        if (j.ok) {
          setMsg({ kind: "ok", text: `✅ ${userLabel ?? "用户"} 密码已修改, 旧 session 全部撤销` });
          setOldPassword(""); setNewPassword(""); setConfirm("");
        } else {
          setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
        }
      }
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === "self" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">当前密码 *</span>
          <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputCls} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">新密码 * <span className="ml-2 text-xs font-normal text-fg-muted">(≥8 字符)</span></span>
        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} minLength={8} maxLength={200} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">确认新密码 *</span>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} minLength={8} maxLength={200} />
      </label>
      {mode === "self" && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-700">
          ⚠️ 修改后所有 session 会被撤销, 包括当前浏览器, 需要重新登录
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm">{msg?.text ?? ""}</div>
        <button type="submit" disabled={saving} className="rounded bg-fg px-6 py-2 text-sm font-medium text-bg hover:opacity-80 disabled:opacity-50">
          {saving ? "修改中..." : "🔐 修改密码"}
        </button>
      </div>
    </form>
  );
}