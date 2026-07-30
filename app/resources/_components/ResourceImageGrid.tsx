"use client";

// ============================================================
// ResourceImageGrid (公开端) - 图片分页网格 (v0.42 老板 2026-07-29 拍)
// 从原 ResourceGrid 抽出 image-only 卡片 (audio/document 走 ResourceList)
// 老板 2026-07-29 14:53 拍板: 图片分页 12/页, 沿用原 4 列断点
// ============================================================
import { useState } from "react";
import type { MediaItem } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

export function ResourceImageGrid({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<MediaItem | null>(null);

  return (
    <>
      <div
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        data-testid="resources-image-grid"
      >
        {items.map((m) => (
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.alt ?? m.filename}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
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
                <span>{formatDate(new Date(m.uploaded_at * 1000))}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <ResourcePreviewModal item={active} onClose={() => setActive(null)} />
    </>
  );
}