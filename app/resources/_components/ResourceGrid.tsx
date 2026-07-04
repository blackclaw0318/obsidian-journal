"use client";

// ============================================================
// ResourceGrid (公开端) - 资源卡片网格 + 点击预览 (v0.35 砍计数版)
// 老板 2026-07-05 00:59 决策: 删所有计数功能
// 还原到最简版: 卡片只显示文件名/大小/类型, 点击开 modal
// ============================================================
import { useState } from "react";
import type { MediaItem } from "@/lib/types";
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

export function ResourceGrid({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<MediaItem | null>(null);

  return (
    <>
      <div
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        data-testid="resources-grid"
      >
        {items.map((m) => {
          const isImage = m.mime_type.startsWith("image/");
          const { icon, hint } = categoryThumb(m.category);
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setActive(m)}
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
                <div className="mt-1 flex items-center justify-end text-xs text-fg-muted">
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
