"use client";

// ============================================================
// MediaUploader (Phase 3.6 → v0.33 P0-2)
// 真上传进度条 + 逐文件状态 + 重试 + 汇总
//  - XHR (fetch 不支持 upload progress)
//  - 状态机: idle | uploading | success | error
// ============================================================
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

type Status = "uploading" | "success" | "error";

interface FileEntry {
  id: number;
  file: File;
  status: Status;
  progress: number; // 0-100
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function mimeIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf") return "📕";
  return "📄";
}

export function MediaUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const idRef = useRef(0);
  const xhrRef = useRef<Map<number, XMLHttpRequest>>(new Map());

  const okCount = files.filter((f) => f.status === "success").length;
  const errCount = files.filter((f) => f.status === "error").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const allDone = files.length > 0 && uploadingCount === 0;

  function validate(file: File): string | null {
    if (file.size === 0) return "文件为空";
    if (file.size > MAX_SIZE) return `文件过大 (${formatSize(file.size)} > 20MB)`;
    if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
      return `不支持的格式: ${file.type || "未知"}`;
    }
    return null;
  }

  function upload(entry: FileEntry) {
    const err = validate(entry.file);
    if (err) {
      setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "error", error: err } : f));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current.set(entry.id, xhr);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, progress: pct } : f));
    };

    xhr.onload = () => {
      xhrRef.current.delete(entry.id);
      let data: any = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "success", progress: 100 } : f));
      } else {
        setFiles((prev) => prev.map((f) => f.id === entry.id ? {
          ...f,
          status: "error",
          error: data.error ?? `HTTP ${xhr.status}`
        } : f));
      }
    };

    xhr.onerror = () => {
      xhrRef.current.delete(entry.id);
      setFiles((prev) => prev.map((f) => f.id === entry.id ? {
        ...f,
        status: "error",
        error: "网络错误"
      } : f));
    };

    xhr.onabort = () => {
      xhrRef.current.delete(entry.id);
      setFiles((prev) => prev.map((f) => f.id === entry.id ? {
        ...f,
        status: "error",
        error: "已取消"
      } : f));
    };

    const form = new FormData();
    form.append("file", entry.file);
    xhr.open("POST", "/api/admin/media");
    xhr.send(form);
  }

  function handleSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const newEntries: FileEntry[] = Array.from(selected).map((file) => ({
      id: ++idRef.current,
      file,
      status: "uploading",
      progress: 0
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    newEntries.forEach((entry) => upload(entry));
  }

  function retry(entry: FileEntry) {
    // abort 现有请求
    xhrRef.current.get(entry.id)?.abort();
    setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "uploading", progress: 0, error: undefined } : f));
    upload({ ...entry, status: "uploading", progress: 0 });
  }

  function remove(entry: FileEntry) {
    xhrRef.current.get(entry.id)?.abort();
    xhrRef.current.delete(entry.id);
    setFiles((prev) => prev.filter((f) => f.id !== entry.id));
  }

  function clearCompleted() {
    setFiles((prev) => prev.filter((f) => f.status === "uploading"));
  }

  function onAllDone() {
    // 任一上传成功 → refresh admin media list
    if (okCount > 0) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleSelected(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        data-testid="media-uploader-drop"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          dragging ? "border-accent bg-accent/5" : "border-border bg-bg-card hover:border-accent/50 hover:bg-bg-card/80"
        }`}
      >
        <div className="text-4xl">📤</div>
        <div className="mt-2 text-sm font-medium">点击或拖拽文件到此处上传</div>
        <div className="mt-1 text-xs text-fg-muted">支持: 图片 / 视频 / 音频 / PDF · 最大 20MB</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={(e) => handleSelected(e.target.files)}
          className="hidden"
          data-testid="media-uploader-input"
        />
      </div>

      {/* 汇总 */}
      {files.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-3 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span>共 <strong>{files.length}</strong> 个文件</span>
            {okCount > 0 && <span className="text-green-600">✓ {okCount} 成功</span>}
            {uploadingCount > 0 && <span className="text-accent">⏳ {uploadingCount} 上传中</span>}
            {errCount > 0 && <span className="text-red-600">✗ {errCount} 失败</span>}
          </div>
          <div className="flex gap-2">
            {allDone && okCount > 0 && (
              <button
                onClick={onAllDone}
                className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent/90"
              >
                刷新列表
              </button>
            )}
            <button
              onClick={clearCompleted}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
              disabled={uploadingCount > 0}
            >
              清空已完成
            </button>
          </div>
        </div>
      )}

      {/* 逐文件状态 */}
      {files.length > 0 && (
        <ul className="space-y-1.5" data-testid="media-uploader-list">
          {files.map((entry) => (
            <li
              key={entry.id}
              data-testid="media-uploader-entry"
              data-status={entry.status}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-card p-2"
            >
              <div className="text-2xl">{mimeIcon(entry.file.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium" title={entry.file.name}>{entry.file.name}</span>
                  <span className="shrink-0 text-fg-muted">{formatSize(entry.file.size)}</span>
                </div>
                {entry.status === "uploading" && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-base">
                      <div
                        className="h-full bg-accent transition-all duration-200"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-fg-muted">{entry.progress}%</span>
                  </div>
                )}
                {entry.status === "success" && (
                  <div className="mt-1 text-xs text-green-600">✓ 上传成功</div>
                )}
                {entry.status === "error" && (
                  <div className="mt-1 text-xs text-red-600">✗ {entry.error}</div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {entry.status === "error" && (
                  <button
                    onClick={() => retry(entry)}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
                    data-testid="media-uploader-retry"
                  >
                    重试
                  </button>
                )}
                <button
                  onClick={() => remove(entry)}
                  className="rounded px-2 py-1 text-xs text-fg-muted hover:bg-bg-base hover:text-fg"
                  aria-label="移除"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
