"use client";

// ============================================================
// ChapterListActions - 章节行操作 (Phase 3.3)
// 软删除 / 恢复 / 编辑
// ============================================================
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// 严守 v0.6.1: Chapter 无 status 字段, 软删走 deleted_at, 用 deleted prop 表达
export function ChapterListActions({
  novelId,
  volumeId,
  chapterId,
  deleted
}: {
  novelId: string;
  volumeId: string;
  chapterId: string;
  deleted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  async function softDelete() {
    const res = await fetch(`/api/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapterId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setShowConfirm(false);
      router.refresh();
    } else {
      alert("删除失败");
    }
  }

  async function restore() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      });
      if (res.ok) router.refresh();
      else alert("恢复失败");
    });
  }

  return (
    <div className="flex items-center justify-end gap-2 text-xs">
      <Link
        href={`/admin/novels/${novelId}/volumes/${volumeId}/chapters/${chapterId}/edit`}
        className="rounded border border-border px-2 py-1 hover:bg-bg-base"
      >
        编辑
      </Link>

      {deleted ? (
        <button
          onClick={restore}
          disabled={pending}
          className="rounded border border-green-500/30 px-2 py-1 text-green-600 hover:bg-green-500/10 disabled:opacity-50"
        >
          {pending ? "..." : "恢复"}
        </button>
      ) : (
        <>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded border border-red-500/30 px-2 py-1 text-red-600 hover:bg-red-500/10"
            >
              删除
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <button
                onClick={softDelete}
                className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
              >
                确认删除
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded border border-border px-2 py-1 hover:bg-bg-base"
              >
                取消
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
}