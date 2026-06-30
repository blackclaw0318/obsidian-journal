// ============================================================
// ArchiveButton - 归档按钮 (Phase 3.9, v0.16)
// Server Component 内嵌 Client Component (避免 hydration mismatch)
// ============================================================
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onArchive = async () => {
    if (!confirm(`确认归档 ${userEmail} ? 此操作撤销该用户所有 session, 但保留数据.`)) return;
    setWorking(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) {
        setMsg("✅ 已归档");
        setTimeout(() => router.push("/admin/users"), 800);
      } else {
        setMsg(`❌ ${j.error ?? "未知错误"}`);
      }
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{msg ?? ""}</div>
      <button
        onClick={onArchive}
        disabled={working}
        className="rounded border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {working ? "归档中..." : "🗑️ 归档用户"}
      </button>
    </div>
  );
}