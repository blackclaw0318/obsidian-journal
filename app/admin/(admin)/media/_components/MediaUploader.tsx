"use client";

// ============================================================
// MediaUploader - 拖拽 / 点击上传 (Phase 3.6)
// ============================================================
import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_TYPES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export function MediaUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (file.size === 0) return "文件为空";
    if (file.size > MAX_SIZE) return `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB > 20MB)`;
    if (!ALLOWED_TYPES.some((t) => file.type.startsWith(t))) {
      return `不支持的格式: ${file.type || "未知"}, 仅支持图片/视频/音频/PDF`;
    }
    return null;
  }

  function upload(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setProgress(`上传中: ${file.name} (${(file.size / 1024).toFixed(0)}KB)...`);

    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/media", {
          method: "POST",
          body: form
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setProgress(`✓ ${file.name} 上传成功`);
          router.refresh();
        } else {
          setError(`上传失败: ${data.error ?? res.status}`);
          setProgress(null);
        }
      } catch (e) {
        setError(`网络错误: ${(e as Error).message}`);
        setProgress(null);
      }
    });
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProgress(null);
    Array.from(files).forEach(upload);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-bg-card hover:border-accent/50 hover:bg-bg-card/80"
        }`}
      >
        <div className="text-4xl">📤</div>
        <div className="mt-2 text-sm font-medium">点击或拖拽文件到此处上传</div>
        <div className="mt-1 text-xs text-fg-muted">
          支持: 图片 / 视频 / 音频 / PDF · 最大 20MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={pending}
        />
      </div>
      {pending && progress && (
        <div className="rounded border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
          {progress}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
