"use client";

// ============================================================
// VideoSeriesListActions - 系列删除按钮 (Phase 3.4)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VideoSeriesListActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("确定要删除此系列吗?\n\n⚠️ 该系列下的视频不会被删除,但 series_id 会被置为 NULL。")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/video-series/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setError(data.error ?? "删除失败");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <a
        href={`/admin/video-series/${id}/edit`}
        className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
      >
        编辑
      </a>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 hover:bg-red-500/20 disabled:opacity-50"
      >
        {pending ? "..." : "删除"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
