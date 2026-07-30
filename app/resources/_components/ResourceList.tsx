"use client";

// ============================================================
// ResourceList (公开端) - 音频 + 文档列表行 (v0.42 老板 2026-07-29 拍)
// 老板 2026-07-29 14:53 拍板: 列表布局, 每行 icon + filename + alt/mime + size + date + 试听/下载
// - audio: 点行就地展开 <audio controls>, 只允许单开 (useState activeId)
// - document: 点文件名打开 ResourcePreviewModal
// - 沿用 bg-bg-card / border-border / hover:bg-bg-muted 等现有 CSS 变量
// ============================================================
import { useState, useRef, useEffect } from "react";
import type { MediaItem } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

function categoryIcon(category: string): string {
  if (category === "audio") return "🎵";
  return "📄"; // document
}

interface Props {
  items: MediaItem[];
  category: "audio" | "document";
}

export function ResourceList({ items, category }: Props) {
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 切换 active 时, 暂停其它 audio (单开约束)
  useEffect(() => {
    if (!activeAudioId) return;
    audioRefs.current.forEach((el, id) => {
      if (id !== activeAudioId && !el.paused) {
        el.pause();
      }
    });
  }, [activeAudioId]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
        该分类暂无文件
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-hidden rounded-lg border border-border bg-bg-card"
        data-testid={`resources-list-${category}`}
      >
        {items.map((m, idx) => {
          const isAudio = category === "audio";
          const isActive = activeAudioId === m.id;
          const isLast = idx === items.length - 1;
          const icon = categoryIcon(m.category);
          const mimeShort = m.mime_type.split("/")[1] ?? m.mime_type;

          return (
            <div
              key={m.id}
              data-testid="resource-list-row"
              data-mime={m.mime_type}
              data-category={m.category}
              className={
                "px-4 py-3 transition hover:bg-bg-muted " +
                (isLast ? "" : "border-b border-border")
              }
            >
              <div className="flex items-center gap-4">
                {/* icon (32px fixed) */}
                <div className="flex w-8 shrink-0 items-center justify-center text-2xl">
                  {icon}
                </div>

                {/* 主信息: filename + alt/mime */}
                <div className="min-w-0 flex-1">
                  {isAudio ? (
                    <button
                      type="button"
                      onClick={() => setActiveAudioId(isActive ? null : m.id)}
                      data-testid="resource-audio-toggle"
                      className="block w-full truncate text-left text-sm font-medium hover:text-accent"
                      title={m.filename}
                    >
                      {m.alt ?? m.filename}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(m)}
                      data-testid="resource-doc-open"
                      className="block w-full truncate text-left text-sm font-medium hover:text-accent"
                      title={m.filename}
                    >
                      {m.alt ?? m.filename}
                    </button>
                  )}
                  <div className="hidden truncate text-xs text-fg-muted sm:block">
                    {m.alt ? m.filename : mimeShort}
                  </div>
                </div>

                {/* size (md+) */}
                <div className="hidden w-20 shrink-0 text-right text-xs text-fg-muted md:block">
                  {formatBytes(m.size)}
                </div>

                {/* date (md+) */}
                <div className="hidden w-24 shrink-0 text-right text-xs text-fg-muted md:block">
                  {formatDate(new Date(m.uploaded_at * 1000))}
                </div>

                {/* mime (lg+) */}
                <div className="hidden w-20 shrink-0 text-right lg:block">
                  <span className="rounded bg-bg-muted px-2 py-0.5 font-mono text-xs text-fg-muted">
                    {mimeShort}
                  </span>
                </div>

                {/* 操作 */}
                <div className="flex shrink-0 gap-2">
                  {isAudio ? (
                    <span className="text-xs text-fg-muted">
                      {isActive ? "⏸ 收起" : "▶ 试听"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(m)}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
                      title="预览"
                    >
                      👁
                    </button>
                  )}
                  <a
                    href={`/api/resources/${m.id}/download`}
                    download
                    data-testid="resource-download"
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
                    title="下载"
                  >
                    ⬇
                  </a>
                </div>
              </div>

              {/* audio 行内展开 */}
              {isAudio && isActive && (
                <div
                  className="mt-3 pl-12"
                  data-testid="resource-audio-player"
                >
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    ref={(el) => {
                      if (el) audioRefs.current.set(m.id, el);
                      else audioRefs.current.delete(m.id);
                    }}
                    src={m.url}
                    controls
                    autoPlay
                    className="w-full"
                    data-testid="resource-audio-element"
                  >
                    您的浏览器不支持 audio 标签。
                  </audio>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ResourcePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}