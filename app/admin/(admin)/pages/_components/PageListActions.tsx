"use client";

// ============================================================
// PageListActions - 页面软删/恢复 (Phase 3.5)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PageListActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    if (!confirm("确定要归档此页面吗?")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setError(data.error ?? "操作失败");
      }
    });
  }

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setError(data.error ?? "恢复失败");
      }
    });
  }

  if (status === "archived") {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleRestore}
          disabled={pending}
          className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 hover:bg-green-500/20 disabled:opacity-50"
        >
          {pending ? "..." : "恢复"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <a
        href={`/admin/pages/${id}/edit`}
        className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
      >
        编辑
      </a>
      <button
        onClick={handleArchive}
        disabled={pending}
        className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 hover:bg-red-500/20 disabled:opacity-50"
      >
        {pending ? "..." : "归档"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
