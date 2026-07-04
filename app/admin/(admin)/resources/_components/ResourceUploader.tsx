"use client";

// ============================================================
// ResourceUploader (Phase 3.6 → v0.33 P0-2, v0.33.1 P0-修)
// 真上传进度 + 服务器处理状态 + 串行 + 自动刷新
//  - XHR (fetch 不支持 upload progress)
//  - 3 阶段状态: uploading → processing → success/error
//  - 串行上传 (一个完成再下一个), 避免 server 被打爆导致 Cloudflare 524
//  - 任一成功 → 自动 router.refresh()
//  - 大文件 (>50MB) 警告提示 (避免 CF 100s timeout)
// ============================================================
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB (API 硬限制)
const WARN_SIZE = 50 * 1024 * 1024; // 50MB 警告

type Status = "uploading" | "processing" | "success" | "error";

interface FileEntry {
  id: number;
  file: File;
  status: Status;
  progress: number; // 0-100 (含 processing 占位 95)
  error?: string;
  xhr?: XMLHttpRequest | null;
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

export function ResourceUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const idRef = useRef(0);
  const nextUploadRef = useRef<Promise<void>>(Promise.resolve()); // 串行 chain

  const okCount = files.filter((f) => f.status === "success").length;
  const errCount = files.filter((f) => f.status === "error").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const processingCount = files.filter((f) => f.status === "processing").length;

  function updateEntry(id: number, patch: Partial<FileEntry>) {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  function validate(file: File): string | null {
    if (file.size === 0) return "文件为空";
    if (file.size > MAX_SIZE) return `文件过大 (${formatSize(file.size)} > 20MB)`;
    if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
      return `不支持的格式: ${file.type || "未知"}`;
    }
    return null;
  }

  function uploadOne(entry: FileEntry): Promise<void> {
    return new Promise((resolve) => {
      const err = validate(entry.file);
      if (err) {
        updateEntry(entry.id, { status: "error", error: err });
        resolve();
        return;
      }

      const xhr = new XMLHttpRequest();
      updateEntry(entry.id, { xhr });

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.min(92, Math.round((e.loaded / e.total) * 100));
        updateEntry(entry.id, { progress: pct });
      };

      // byte 上传完成 → server 处理阶段 (524 通常发生在这一段)
      xhr.upload.onload = () => {
        updateEntry(entry.id, { status: "processing", progress: 95 });
      };

      xhr.onload = () => {
        let data: any = {};
        try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          updateEntry(entry.id, { status: "success", progress: 100 });
          // 任一文件成功 → 自动刷新列表
          queueMicrotask(() => router.refresh());
        } else {
          const errMsg = xhr.status === 524
            ? "524 超时 (视频过大/网络慢, 建议 < 10MB 视频)"
            : (data.error ?? `HTTP ${xhr.status}`);
          updateEntry(entry.id, { status: "error", error: errMsg });
        }
        resolve();
      };

      xhr.onerror = () => {
        updateEntry(entry.id, { status: "error", error: "网络错误" });
        resolve();
      };

      xhr.onabort = () => {
        updateEntry(entry.id, { status: "error", error: "已取消" });
        resolve();
      };

      const form = new FormData();
      form.append("file", entry.file);
      xhr.open("POST", "/api/admin/resources");
      xhr.send(form);
    });
  }

  // 串行 chain: 每次 enqueue 都拼接到 nextUploadRef, 旧的等新的一起完成
  function enqueue(entry: FileEntry) {
    nextUploadRef.current = nextUploadRef.current.then(() => uploadOne(entry));
    // catch 防止 chain 中断 (但每个 uploadOne 自己 resolve 不 reject)
    nextUploadRef.current = nextUploadRef.current.catch(() => undefined);
  }

  function handleSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const newEntries: FileEntry[] = Array.from(selected).map((file) => ({
      id: ++idRef.current,
      file,
      status: "uploading",
      progress: 0,
      xhr: null
    }));
    setFiles((prev) => [...prev, ...newEntries]);

    // 大文件警告
    const big = newEntries.filter((e) => e.file.size > WARN_SIZE);
    if (big.length > 0) {
      console.warn(`[ResourceUploader] ${big.length} 个文件超过 50MB, 可能超时`);
    }

    // 串行上传 (concurrency=1)
    newEntries.forEach(enqueue);
  }

  function retry(entry: FileEntry) {
    entry.xhr?.abort();
    updateEntry(entry.id, { status: "uploading", progress: 0, error: undefined });
    // 复用 entry 但 state 重置
    enqueue({ ...entry, status: "uploading", progress: 0, error: undefined, xhr: null });
  }

  function remove(entry: FileEntry) {
    entry.xhr?.abort();
    setFiles((prev) => prev.filter((f) => f.id !== entry.id));
  }

  function clearCompleted() {
    setFiles((prev) => prev.filter((f) => f.status === "uploading" || f.status === "processing"));
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleSelected(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        data-testid="resource-uploader-drop"
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
          data-testid="resource-uploader-input"
        />
      </div>

      {/* 汇总 */}
      {files.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-3 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span>共 <strong>{files.length}</strong> 个文件</span>
            {okCount > 0 && <span className="text-green-600">✓ {okCount} 成功</span>}
            {processingCount > 0 && <span className="text-accent">⏳ {processingCount} 处理中</span>}
            {uploadingCount > 0 && <span className="text-accent">⬆ {uploadingCount} 上传中</span>}
            {errCount > 0 && <span className="text-red-600">✗ {errCount} 失败</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCompleted}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-base"
              disabled={uploadingCount + processingCount > 0}
            >
              清空已完成
            </button>
          </div>
        </div>
      )}

      {/* 逐文件状态 */}
      {files.length > 0 && (
        <ul className="space-y-1.5" data-testid="resource-uploader-list">
          {files.map((entry) => {
            const isLarge = entry.file.size > WARN_SIZE;
            return (
              <li
                key={entry.id}
                data-testid="resource-uploader-entry"
                data-status={entry.status}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-card p-2"
              >
                <div className="text-2xl">{mimeIcon(entry.file.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium" title={entry.file.name}>{entry.file.name}</span>
                    <span className="shrink-0 text-fg-muted">
                      {formatSize(entry.file.size)}
                      {isLarge && <span className="ml-1 rounded bg-yellow-500/20 px-1 text-yellow-700 dark:text-yellow-400">大</span>}
                    </span>
                  </div>
                  {(entry.status === "uploading" || entry.status === "processing") && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-base">
                        {entry.status === "processing" ? (
                          <div className="h-full w-full animate-pulse bg-accent/70" />
                        ) : (
                          <div
                            className="h-full bg-accent transition-all duration-200"
                            style={{ width: `${entry.progress}%` }}
                          />
                        )}
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-fg-muted">
                        {entry.status === "processing" ? "⏳ 处理中" : `${entry.progress}%`}
                      </span>
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
                      data-testid="resource-uploader-retry"
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
