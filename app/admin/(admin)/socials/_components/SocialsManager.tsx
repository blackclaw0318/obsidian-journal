// ============================================================
// SocialsManager - 友链/社交 管理 (含创建/编辑/删除 inline)
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Social } from "@/lib/types";

interface Props {
  items: Social[];
  platforms: string[];
}

export function SocialsManager({ items, platforms }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("github");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [order, setOrder] = useState(0);
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPlatform("github"); setLabel(""); setUrl(""); setIcon("");
    setOrder(0); setVisible(true); setEditingId(null); setError(null);
  }

  function startEdit(s: Social) {
    setEditingId(s.id);
    setPlatform(s.platform);
    setLabel(s.label);
    setUrl(s.url);
    setIcon(s.icon ?? "");
    setOrder(s.order);
    setVisible(s.visible === 1);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url_ = editingId ? `/api/admin/socials/${editingId}` : "/api/admin/socials";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url_, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, label, url, icon: icon || null, order, visible })
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "submit_failed"); return; }
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string, label_: string) {
    if (!confirm(`确定删除「${label_}」?`)) return;
    const res = await fetch(`/api/admin/socials/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function toggleVisible(s: Social) {
    const res = await fetch(`/api/admin/socials/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: s.visible !== 1 })
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { reset(); setShowForm(!showForm); }} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90">
          {showForm ? "取消" : "+ 新建友链"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded border border-border bg-bg-muted/20 p-4 space-y-3">
          {error && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">平台 *</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm">
                {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">显示名 *</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={100} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">URL *</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} required maxLength={500} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon URL</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-mono" />
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} className="w-24 rounded border border-border bg-bg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                可见
              </label>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "提交中..." : editingId ? "保存" : "创建"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-bg-muted/30 p-8 text-center text-sm text-fg-muted">
          暂无友链。点击「+ 新建友链」添加。
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">平台</th>
                <th className="px-3 py-2">显示名</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2 w-16">顺序</th>
                <th className="px-3 py-2 w-20">可见</th>
                <th className="px-3 py-2 w-32 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2"><span className="rounded bg-bg-muted px-2 py-0.5 text-xs">{s.platform}</span></td>
                  <td className="px-3 py-2 font-medium">{s.label}</td>
                  <td className="px-3 py-2 font-mono text-xs text-fg-muted truncate max-w-xs">{s.url}</td>
                  <td className="px-3 py-2 text-fg-muted">{s.order}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => toggleVisible(s)} className={`rounded px-2 py-0.5 text-xs ${s.visible === 1 ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-bg-muted text-fg-muted"}`}>
                      {s.visible === 1 ? "显示" : "隐藏"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => startEdit(s)} className="text-accent hover:underline mr-3">编辑</button>
                    <button onClick={() => handleDelete(s.id, s.label)} className="text-red-600 dark:text-red-400 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
