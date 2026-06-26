"use client";

// ============================================================
// ChapterForm - 新建 / 编辑章节 (Phase 3.3)
// 严守 v0.6.1: Chapter 无 status 字段, 用 published boolean
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface ChapterFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string | null;
  published?: boolean;
  published_at?: number | null;
}

export function ChapterForm({
  novelId,
  volumeId,
  initial,
  mode
}: {
  novelId: string;
  volumeId: string;
  initial?: ChapterFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
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
        ? `/api/admin/novels/${novelId}/volumes/${volumeId}/chapters`
        : `/api/admin/novels/${novelId}/volumes/${volumeId}/chapters/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        content,
        excerpt: excerpt.trim() || null,
        published
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        if (mode === "create") {
          router.push(`/admin/novels/${novelId}/volumes/${volumeId}`);
        } else {
          router.push(`/admin/novels/${novelId}/volumes/${volumeId}/chapters/${initial!.id}/edit`);
          router.refresh();
        }
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个 (注意全局唯一)",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          missing_content: "内容不能为空",
          invalid_order: "order 非法 (必须是 ≥1 的整数)",
          not_found: "章节不存在",
          unauthorized: "未登录",
          novel_not_found: "小说不存在",
          volume_not_found: "卷不存在"
        };
        setError(errMap[data.error ?? ""] ?? `保存失败 (${data.error ?? res.status})`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">章节标题 *</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
            placeholder="觉醒"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Slug * <span className="text-xs text-fg-muted">(全局唯一, 不能跨卷重名)</span>
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            placeholder="chapter-1-awakening"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">发布状态</span>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm">已发布 (勾选 = published, 否则 = draft)</span>
        </label>
        <p className="mt-1 text-xs text-fg-muted">
          严守 v0.6.1: Chapter 用 published Boolean, 无 status 字段。软删走 deleted_at (独立操作)。
        </p>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">摘要 <span className="text-xs text-fg-muted">(可选)</span></span>
        <textarea
          value={excerpt ?? ""}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
          placeholder="一句话介绍本章节"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">正文 * <span className="text-xs text-fg-muted">(Markdown)</span></span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={20}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          placeholder={`# 章节标题\n\n段落...\n\n## 场景二\n\n- 对话\n- 动作描写`}
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
          {pending ? "保存中..." : mode === "create" ? "创建章节" : "保存修改"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/novels/${novelId}/volumes/${volumeId}`)}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-card"
        >
          取消
        </button>
      </div>
    </form>
  );
}