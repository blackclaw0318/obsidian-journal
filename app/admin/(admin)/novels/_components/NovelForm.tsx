"use client";

// ============================================================
// NovelForm - 新建 / 编辑小说 (Phase 3.3)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NovelStatus } from "@/lib/types";

export interface NovelFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  status?: NovelStatus;
}

export function NovelForm({
  initial,
  mode
}: {
  initial?: NovelFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [status, setStatus] = useState<NovelStatus>(initial?.status ?? "ongoing");
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (mode === "create" && !slug) {
      setSlug(
        v
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 80)
      );
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const url = mode === "create"
        ? "/api/admin/novels"
        : `/api/admin/novels/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || null,
        cover_image: coverImage.trim() || null,
        status
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        // 编辑后跳详情页,新建跳详情页
        const id = mode === "create" ? data.novel.id : initial!.id;
        router.push(`/admin/novels/${id}`);
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          invalid_status: "状态非法",
          not_found: "小说不存在",
          unauthorized: "未登录"
        };
        setError(errMap[data.error ?? ""] ?? `保存失败 (${data.error ?? res.status})`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">标题 *</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
            placeholder="小说标题"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Slug * <span className="text-xs text-fg-muted">(URL 片段, 全局唯一)</span>
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            placeholder="meta-realm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">状态</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as NovelStatus)}
          className="rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
        >
          <option value="ongoing">ongoing (连载中)</option>
          <option value="completed">completed (已完结)</option>
          <option value="hiatus">hiatus (休刊)</option>
        </select>
      </label>
      <p className="mt-1 text-xs text-fg-muted">
        严守 v0.6.1: NovelStatus 3 值。归档走列表行"删除"按钮 (写 deleted_at)。
      </p>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">简介</span>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
          placeholder="一句话或一段话介绍小说"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">封面图 URL <span className="text-xs text-fg-muted">(可选)</span></span>
        <input
          value={coverImage ?? ""}
          onChange={(e) => setCoverImage(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          placeholder="https://... 或 /uploads/..."
        />
      </label>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "保存中..." : mode === "create" ? "创建" : "保存修改"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/novels")}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-card"
        >
          取消
        </button>
      </div>
    </form>
  );
}