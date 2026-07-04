"use client";

// ============================================================
// ResourceAdminGrid - 资源管理网格 (v0.34 Phase 4, 旧 MediaGrid 升级)
// 显示真实浏览/下载数 (老板 Q3 决策)
// 砍 video 渲染分支
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaItem } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function categoryIcon(category: string): string {
  if (category === "image") return "🖼";
  if (category === "audio") return "🎵";
  return "📄";
}

interface SimpleCounter { view: number; download: number }

export function ResourceAdminGrid({
  items,
  counters
}: {
  items: MediaItem[];
  counters: Record<string, SimpleCounter>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState<string>("");

  function handleDelete(item: MediaItem) {
    if (!confirm(`确定要删除此资源吗?\n\n${item.filename}\n${formatSize(item.size)}\n\n⚠️ 文件物理删除, 引用追踪也会清空。`)) return;
    setBusyId(item.id);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/resources/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.refresh();
      } else {
        setError(data.error ?? "删除失败");
      }
      setBusyId(null);
    });
  }

  function startEditAlt(item: MediaItem) {
    setEditingId(item.id);
    setEditAlt(item.alt ?? "");
  }

  function saveAlt(item: MediaItem) {
    setBusyId(item.id);
    startTransition(async () => {
      const res = await fetch(`/api/admin/resources/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: editAlt.trim() || null })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(data.error ?? "保存失败");
      }
      setBusyId(null);
    });
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-fg-muted">
        还没有上传任何资源
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const c = counters[item.id];
          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-lg border border-border bg-bg-card transition hover:border-accent/50"
            >
              {/* 预览 */}
              <div className="relative aspect-square bg-bg-base">
                {item.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.alt ?? item.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">
                    {categoryIcon(item.category)}
                  </div>
                )}
              </div>

              {/* 元信息 */}
              <div className="space-y-1 p-2 text-xs">
                <div className="truncate font-mono text-fg-muted" title={item.filename}>
                  {item.filename}
                </div>
                <div className="flex items-center justify-between text-fg-muted">
                  <span>{formatSize(item.size)}</span>
                  <span className="rounded bg-bg-base px-1.5 py-0.5">{item.mime_type.split("/")[1]}</span>
                </div>
                {/* 老板 Q3: 真实浏览/下载数 (含 base_value 种子) */}
                {c && (
                  <div className="flex items-center justify-between text-fg-muted">
                    <span title="浏览数">👁 {c.view}</span>
                    <span title="下载数">⬇ {c.download}</span>
                  </div>
                )}

                {/* alt 编辑 */}
                {editingId === item.id ? (
                  <div className="space-y-1 pt-1">
                    <input
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="alt 文本..."
                      className="w-full rounded border border-border bg-bg-base px-2 py-1 text-xs"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveAlt(item)}
                        disabled={busyId === item.id}
                        className="flex-1 rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="truncate pt-1 text-fg-muted" title={item.alt ?? "(无 alt)"}>
                    {item.alt ? `📝 ${item.alt}` : <span className="opacity-50">(无 alt)</span>}
                  </div>
                )}

                {/* 操作 */}
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="flex-1 rounded border border-border px-1 py-1 text-xs hover:bg-bg-base"
                    title="复制 URL"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => startEditAlt(item)}
                    className="flex-1 rounded border border-border px-1 py-1 text-xs hover:bg-bg-base"
                    title="编辑 alt"
                  >
                    ✏️
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded border border-border px-1 py-1 text-center text-xs hover:bg-bg-base"
                    title="新窗口打开"
                  >
                    👁
                  </a>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    className="flex-1 rounded bg-red-500/10 px-1 py-1 text-xs text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                    title="删除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}