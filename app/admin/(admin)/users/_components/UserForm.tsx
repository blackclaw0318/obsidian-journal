// ============================================================
// UserForm - 用户新建/编辑 (Phase 3.9, v0.16)
// 共享表单: 新建(name+email+password+role) / 编辑(name+role)
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none disabled:opacity-50";

interface UserFormProps {
  mode: "create" | "edit";
  userId?: string;
  initial?: {
    email?: string;
    name?: string | null;
    role?: string;
  };
  isSelf?: boolean; // 编辑自己时禁用 role 降级
}

export function UserForm({ mode, userId, initial, isSelf }: UserFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">((initial?.role as "admin" | "user") ?? "user");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, name: name.trim() || null, role })
        });
        const j = await res.json();
        if (j.ok) {
          setMsg({ kind: "ok", text: "✅ 已创建" });
          setTimeout(() => router.push("/admin/users"), 800);
        } else {
          setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
        }
      } else {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim() || null, email, role })
        });
        const j = await res.json();
        if (j.ok) {
          setMsg({ kind: "ok", text: "✅ 已保存" });
          router.refresh();
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
      <label className="block">
        <span className="mb-1 block text-sm font-medium">邮箱 *</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          disabled={mode === "edit"}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">显示名</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={100} />
      </label>
      {mode === "create" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">初始密码 * <span className="ml-2 text-xs font-normal text-fg-muted">(≥8 字符, 用户首次登录后必须改)</span></span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} minLength={8} maxLength={200} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">角色</span>
        <div className="flex gap-2">
          {(["user", "admin"] as const).map((r) => (
            <label key={r} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border px-3 py-2 text-sm ${role === r ? "border-fg bg-fg/5 font-medium" : "border-border"}`}>
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" disabled={isSelf && r !== "admin"} />
              <span>{r === "admin" ? "🛡️ Admin (全权)" : "👤 User (只读)"}</span>
            </label>
          ))}
        </div>
        {isSelf && <div className="mt-1 text-xs text-fg-muted">⚠️ 不能降级自己</div>}
      </label>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm">{msg?.text ?? ""}</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push("/admin/users")} className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-base">取消</button>
          <button type="submit" disabled={saving} className="rounded bg-fg px-6 py-2 text-sm font-medium text-bg hover:opacity-80 disabled:opacity-50">
            {saving ? "保存中..." : mode === "create" ? "➕ 创建" : "💾 保存"}
          </button>
        </div>
      </div>
    </form>
  );
}