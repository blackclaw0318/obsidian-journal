"use client";

// ============================================================
// ResourcePreviewModal - 按 category/mime 渲染预览 (v0.34 Phase 4)
//  - 砍 video (老板 15:14 决策)
//  - image/* / audio/* / application/pdf / text/* / 其他
//  - 背景点击 + ESC → 关闭
//  - body scroll lock
// ============================================================
import { useEffect, useCallback } from "react";
import type { MediaItem } from "@/lib/types";

interface Props {
  item: MediaItem | null;
  onClose: () => void;
}

export function ResourcePreviewModal({ item, onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  // ESC 关闭 + body scroll lock + 浏览 +1 (24h 去重, 服务器端 in dedupe)
  useEffect(() => {
    if (!item) return;
    // 浏览 +1 (POST /api/resources/[id]/view, 24h 同 ip 去重)
    fetch(`/api/resources/${item.id}/view`, { method: "POST", keepalive: true }).catch(() => {
      // 静默吞错 (浏览计数非关键路径)
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, handleClose]);

  if (!item) return null;

  const mime = item.mime_type;
  const isImage = mime.startsWith("image/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime === "application/pdf";
  const isText = mime.startsWith("text/");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${item.filename}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleClose}
      data-testid="resource-preview-modal"
    >
      <button
        onClick={handleClose}
        aria-label="关闭预览"
        className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white text-xl leading-none hover:bg-black/80"
      >
        ✕
      </button>

      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="resource-preview-content"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.alt ?? item.filename}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
          />
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-bg-card p-8">
            <div className="text-6xl">🎵</div>
            <div className="max-w-xs text-center font-medium">{item.alt ?? item.filename}</div>
            <audio key={item.id} src={item.url} controls autoPlay className="w-80 max-w-full" />
          </div>
        ) : isPdf ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.filename}
            className="h-[90vh] w-[90vw] rounded bg-white"
          />
        ) : isText ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.filename}
            className="h-[80vh] w-[80vw] rounded bg-bg-card p-4"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-bg-card p-8 text-fg">
            <div className="text-6xl">📄</div>
            <div className="font-medium">{item.filename}</div>
            <div className="text-sm text-fg-muted">该类型暂不支持预览</div>
            <a
              href={`/api/resources/${item.id}/download`}
              download={item.filename}
              className="rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
            >
              ⬇ 下载文件
            </a>
          </div>
        )}

        {/* 底部 info bar + 下载按钮 (老板 Q3: 真实 download +1) */}
        <div className="mt-2 flex items-center justify-between gap-4 rounded bg-black/60 px-3 py-1.5 text-xs text-white">
          <span className="truncate">{item.alt ?? item.filename}</span>
          <div className="flex shrink-0 items-center gap-3">
            <span className="opacity-70">{mime}</span>
            <a
              href={`/api/resources/${item.id}/download`}
              download={item.filename}
              className="rounded bg-white/20 px-2 py-1 hover:bg-white/30"
            >
              ⬇ 下载
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}