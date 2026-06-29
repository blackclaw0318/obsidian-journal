// ============================================================
// SeriesForm - 共享表单 (新建/编辑)
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Series, PostCategory } from "@/lib/types";

interface Props {
  initial?: Series;
  mode: "create" | "edit";
}

export function SeriesForm({ initial, mode }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [category, setCategory] = useState<PostCategory>(initial?.category ?? "tech");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // slug 自动生成 (从 name): 仅英文/数字/连字符
  function handleNameChange(v: string) {
    setName(v);
    if (mode === "create" && !slug) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 200));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/admin/series" : `/api/admin/series/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, description, cover_image: coverImage || null, category, order })
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "submit_failed"); return; }
      router.push("/admin/series");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initial || mode !== "edit") return;
    if (!confirm(`确定删除系列「${initial.name}」?关联文章的 series_id 会被置 NULL(不删文章)。`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/series/${initial.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "delete_failed"); return; }
      router.push("/admin/series");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">名称 *</label>
        <input value={name} onChange={(e) => handleNameChange(e.target.value)} required maxLength={200} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Slug * <span className="text-fg-muted">(英文/数字/连字符)</span></label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required maxLength={200} pattern="[a-z0-9-]+" className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-mono" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">分类 *</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as PostCategory)} className="rounded border border-border bg-bg px-3 py-2 text-sm">
          <option value="tech">tech</option>
          <option value="life">life</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">描述</label>
        <textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">封面图 URL</label>
        <input value={coverImage ?? ""} onChange={(e) => setCoverImage(e.target.value)} placeholder="/media/images/cover.jpg" className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-mono" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">排序 <span className="text-fg-muted">(数字越小越靠前)</span></label>
        <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} className="w-32 rounded border border-border bg-bg px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button type="submit" disabled={submitting} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50">
          {submitting ? "提交中..." : mode === "create" ? "创建" : "保存"}
        </button>
        <button type="button" onClick={() => router.push("/admin/series")} className="rounded border border-border bg-bg px-4 py-2 text-sm">取消</button>
        {mode === "edit" && (
          <button type="button" onClick={handleDelete} disabled={submitting} className="ml-auto rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            删除
          </button>
        )}
      </div>
    </form>
  );
}
