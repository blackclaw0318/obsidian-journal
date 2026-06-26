"use client";

// ============================================================
// ChapterInlineCreate - 章节内嵌创建 (Phase 3.3)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ChapterInlineCreate({
  novelId,
  volumeId
}: {
  novelId: string;
  volumeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slug) {
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
      const res = await fetch(`/api/admin/novels/${novelId}/volumes/${volumeId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content: "草稿..."
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOpen(false);
        setTitle("");
        setSlug("");
        // 跳到编辑页填写正文
        router.push(`/admin/novels/${novelId}/volumes/${volumeId}/chapters/${data.chapter.id}/edit`);
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          missing_content: "内容不能为空",
          unauthorized: "未登录",
          novel_not_found: "小说不存在",
          volume_not_found: "卷不存在",
          volume_not_in_novel: "卷不属于该小说"
        };
        setError(errMap[data.error ?? ""] ?? `失败 (${data.error ?? res.status})`);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
      >
        + 添加章节
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-bg-base p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">章节标题 *</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            autoFocus
            className="w-full rounded border border-border bg-bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            placeholder="觉醒"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">
            Slug * <span className="text-fg-muted">(全局唯一)</span>
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full rounded border border-border bg-bg-card px-3 py-1.5 font-mono text-sm outline-none focus:border-accent"
            placeholder="chapter-1-awakening"
          />
        </label>
      </div>
      <p className="text-xs text-fg-muted">
        创建后会跳转到编辑页填写正文 (Markdown)。
      </p>
      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "创建中..." : "创建章节"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-card"
        >
          取消
        </button>
      </div>
    </form>
  );
}