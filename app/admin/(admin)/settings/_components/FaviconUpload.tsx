// ============================================================
// FaviconUpload - 站点 favicon 上传组件 (v0.31, P2-20 兑现)
// 复用 AvatarUpload 模式: 拖拽/点击, 实时预览, 上传后自动刷
// 区别: favicon 是 64x64 小图, 预览给大一点方便看 (32x32 + 64x64 双尺寸)
// ============================================================

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FaviconUpload({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setMsg({ kind: "err", text: "❌ 仅支持 PNG / JPEG / WebP / SVG" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ kind: "err", text: "❌ 文件 ≤2MB" });
      return;
    }

    // 预览 (本地 URL)
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/settings/favicon", { method: "POST", body: fd });
      const j = await res.json();
      if (j.ok) {
        setPreview(j.url);
        setMsg({ kind: "ok", text: "✅ 已上传 (自动 resize 到 64×64 webp)" });
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
    if (!confirm("清空 favicon? 浏览器将回退到 Next.js 自动生成的 icon.png")) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/favicon", { method: "DELETE" });
      const j = await res.json();
      if (j.ok) {
        setPreview(null);
        setMsg({ kind: "ok", text: "✅ 已清空, 回退到默认 icon.png" });
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
      {/* 预览 - 64x64 真实尺寸 + 16x16 浏览器 tab 实际尺寸 */}
      <div className="flex flex-shrink-0 flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded border border-border bg-bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="favicon 64x64" className="h-16 w-16" />
          ) : (
            <span className="text-2xl text-fg-muted">☆</span>
          )}
        </div>
        <div className="text-xs text-fg-muted">
          {preview ? "已设置" : "未设置"}
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="favicon 16x16" className="h-4 w-4 opacity-60" title="16×16 浏览器 tab 实际显示" />
        )}
      </div>
      {/* 操作 */}
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={onSelect}
          disabled={uploading}
          className="block w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span>支持 PNG / JPEG / WebP / SVG · ≤2MB · 自动 resize 到 64×64 webp</span>
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
