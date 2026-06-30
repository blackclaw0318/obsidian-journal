// ============================================================
// AvatarUpload - 头像上传组件 (v0.18, 2020-06-30)
// 用法: 拖拽或点击上传, 实时预览, 上传后自动刷
// ============================================================

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const inputCls = "block w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none disabled:opacity-50";

export function AvatarUpload({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 客户端预校验 (服务端再校验一次)
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMsg({ kind: "err", text: "❌ 仅支持 PNG / JPEG / WebP" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ kind: "err", text: "❌ 文件 ≤5MB" });
      return;
    }

    // 预览 (本地 URL)
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/settings/avatar", { method: "POST", body: fd });
      const j = await res.json();
      if (j.ok) {
        setPreview(j.url);
        setMsg({ kind: "ok", text: "✅ 已上传 (自动 resize 到 512×512)" });
        router.refresh();
      } else {
        setPreview(currentUrl);
        setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
      }
    } catch (err) {
      setPreview(currentUrl);
      setMsg({ kind: "err", text: `❌ ${(err as Error).message}` });
    } finally {
      setUploading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const onClear = async () => {
    if (!confirm("清空头像? 公开页将使用默认头像")) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/avatar", { method: "DELETE" });
      const j = await res.json();
      if (j.ok) {
        setPreview(null);
        setMsg({ kind: "ok", text: "✅ 已清空, 回到默认头像" });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
      }
    } catch (err) {
      setMsg({ kind: "err", text: `❌ ${(err as Error).message}` });
    } finally {
      setUploading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="flex items-start gap-6">
      {/* 预览 */}
      <div className="flex-shrink-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="avatar"
            className="h-24 w-24 rounded-full border-2 border-border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-bg-base text-3xl text-fg-muted">
            ?
          </div>
        )}
      </div>
      {/* 操作 */}
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onSelect}
          disabled={uploading}
          className={inputCls}
        />
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span>支持 PNG / JPEG / WebP · ≤5MB · 自动 resize 到 512×512</span>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              disabled={uploading}
              className="rounded border border-red-300 px-2 py-0.5 text-red-500 hover:bg-red-50"
            >
              清空
            </button>
          )}
        </div>
        {msg && <div className="text-sm">{msg.text}</div>}
      </div>
    </div>
  );
}