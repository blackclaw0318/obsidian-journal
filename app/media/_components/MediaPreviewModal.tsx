"use client";

// ============================================================
// MediaPreviewModal - 按 mime type 渲染预览 (v0.33 P0-1)
//  - image/*   → 全屏 <img>
//  - video/*   → <video controls autoPlay>
//  - audio/*   → <audio controls>
//  - application/pdf → <iframe>
//  - text/*    → <pre>
//  - 其他      → "暂不支持预览" + 下载
//  - 背景点击 + ESC → 关闭
//  - body scroll lock
// ============================================================
import { useEffect, useCallback } from "react";
import type { MediaItem } from "@/lib/types";

interface Props {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaPreviewModal({ item, onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  // ESC 关闭 + body scroll lock
  useEffect(() => {
    if (!item) return;
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
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime === "application/pdf";
  const isText = mime.startsWith("text/");
  const downloadable = !isText && !isPdf; // iframe/直链

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${item.filename}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleClose}
      data-testid="media-preview-modal"
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
        data-testid="media-preview-content"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.alt ?? item.filename}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
          />
        ) : isVideo ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-[90vh] max-w-[90vw] rounded"
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
            {downloadable && (
              <a
                href={item.url}
                download={item.filename}
                className="rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
              >
                ⬇ 下载文件
              </a>
            )}
          </div>
        )}

        {/* 底部 info bar */}
        <div className="mt-2 flex items-center justify-between gap-4 rounded bg-black/60 px-3 py-1.5 text-xs text-white">
          <span className="truncate">{item.alt ?? item.filename}</span>
          <span className="shrink-0 opacity-70">{mime}</span>
        </div>
      </div>
    </div>
  );
}
