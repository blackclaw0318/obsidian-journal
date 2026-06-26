"use client";

// ============================================================
// VolumeInlineCreate - 卷内嵌创建 (Phase 3.3)
// 在小说详情页 inline 创建新卷, 完成后刷新
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VolumeInlineCreate({ novelId }: { novelId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/novels/${novelId}/volumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOpen(false);
        setTitle("");
        setDescription("");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          missing_title: "标题不能为空",
          unauthorized: "未登录",
          novel_not_found: "小说不存在",
          order_exists: "序号已存在"
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
        + 添加卷
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-bg-base p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">卷标题 *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded border border-border bg-bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            placeholder="第一卷: 星海之始"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">简介</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-border bg-bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            placeholder="可选"
          />
        </label>
      </div>
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
          {pending ? "创建中..." : "创建卷"}
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