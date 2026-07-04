"use client";

// ============================================================
// ResourceGrid (公开端) - 资源卡片网格 + 点击预览 (v0.34 Phase 4)
//  - 老板 Q3: 显示真实浏览/下载数 (base_value 100-999 + 累计)
//  - 砍 video (v0.34 老板 15:14 决策)
//  - 老板 20:20 反馈: 点击预览后, 数字不刷新
//    → 修复: 用 useState 维护 live counters, 点卡片时先 POST /view
//      再开 modal, server 返 display 后乐观更新本地
// ============================================================
import { useState, useCallback } from "react";
import type { MediaItem, MediaCounter } from "@/lib/types";
import { displayView, displayDownload } from "@/lib/counter";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("zh-CN");
}

function categoryThumb(category: string): { icon: string; hint: string } {
  if (category === "image") return { icon: "🖼", hint: "图片" };
  if (category === "audio") return { icon: "🎵", hint: "音频" };
  return { icon: "📄", hint: "文档" };
}

export function ResourceGrid({
  items,
  counters
}: {
  items: MediaItem[];
  counters: Record<string, MediaCounter>;
}) {
  const [active, setActive] = useState<MediaItem | null>(null);

  // 老板 20:20: 用 local state 跟踪最新 counter (server 触发的 +1 反映到 UI)
  const [liveCounters, setLiveCounters] = useState<Record<string, MediaCounter>>({});

  // 点击卡片 → fire POST /view (24h 同 ip 去重) → 收到 display 后乐观更新本地
  const handleCardClick = useCallback(async (item: MediaItem) => {
    // 立即打开 modal (UX 不阻塞)
    setActive(item);

    // 触发 view +1 (fire-and-forget, 失败也不影响 UX)
    try {
      const res = await fetch(`/api/resources/${item.id}/view`, {
        method: "POST",
        keepalive: true
      });
      const data = await res.json();
      if (data?.ok) {
        // 24h 内同 ip 重复请求 → data.deduplicated=true, 但 display 仍是当前真实数
        // 把 display 反算回 base_value + view_count
        const existing = counters[item.id];
        if (existing) {
          const delta = data.display - displayView(existing);
          if (delta > 0) {
            setLiveCounters((prev) => ({
              ...prev,
              [item.id]: {
                ...existing,
                view_count: existing.view_count + delta
              }
            }));
          }
        }
      }
    } catch {
      // 静默吞错 (浏览计数非关键路径)
    }
  }, [counters]);

  return (
    <>
      <div
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        data-testid="resources-grid"
      >
        {items.map((m) => {
          const isImage = m.mime_type.startsWith("image/");
          const { icon, hint } = categoryThumb(m.category);
          // 优先用 live counter (用户已交互过), 否则用 server-render 的初始值
          const counter = liveCounters[m.id] ?? counters[m.id];
          // 老板 Q3 决策: 真实数 (无区间, 无上限)
          const viewNum = counter ? displayView(counter) : 0;
          const downloadNum = counter ? displayDownload(counter) : 0;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => handleCardClick(m)}
              data-testid="resource-card"
              data-mime={m.mime_type}
              data-category={m.category}
              className="group overflow-hidden rounded-lg border border-border bg-bg-card text-left transition hover:border-accent/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-bg-muted">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.alt ?? m.filename}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div className="text-5xl transition group-hover:scale-110">{icon}</div>
                    <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {hint}
                    </div>
                  </>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-medium" title={m.filename}>
                  {m.alt ?? m.filename}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-fg-muted">
                  <span>{formatBytes(m.size)}</span>
                  {m.width && m.height && <span>{m.width}×{m.height}</span>}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-fg-muted">
                  <span title={`浏览 ${counter?.view_count ?? 0} + 种子 ${counter?.base_value ?? 0}${counter?.seed_enabled === 0 ? ' (装饰已关)' : ''}`}>👁 {viewNum}</span>
                  <span title={`下载 ${counter?.download_count ?? 0} + 种子 ${counter?.seed_download_count ?? counter?.base_value ?? 0}${counter?.seed_enabled === 0 ? ' (装饰已关)' : ''}`}>⬇ {downloadNum}</span>
                  <span>{formatDate(m.uploaded_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <ResourcePreviewModal item={active} onClose={() => setActive(null)} />
    </>
  );
}