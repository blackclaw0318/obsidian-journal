// ============================================================
// OgImageUpload - 站点 OG Image 上传组件 (v0.31, P2-21 兑现)
// 复用 AvatarUpload 模式: 拖拽/点击, 实时预览, 上传后自动刷
// 区别: OG Image 是 1200x630 大图 (社交分享卡片), 预览等比缩放
// ============================================================

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function OgImageUpload({
  currentUrl,
  avatarUrl
}: {
  currentUrl: string | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const res = await fetch("/api/admin/settings/og-image", { method: "POST", body: fd });
      const j = await res.json();
      if (j.ok) {
        setPreview(j.url);
        setMsg({ kind: "ok", text: "✅ 已上传 (自动 resize 到 1200×630 webp, 透明转白底)" });
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
    if (!confirm("清空 OG Image? 公开页将回退到 avatar 或不使用社交卡片图")) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/og-image", { method: "DELETE" });
      const j = await res.json();
      if (j.ok) {
        setPreview(null);
        setMsg({ kind: "ok", text: `✅ 已清空${avatarUrl ? ", 将 fallback 到 avatar" : ""}` });
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
      {/* 预览 - 等比缩放到 240x126 (1.91:1 比例, 1200x630 的 1/5) */}
      <div className="flex flex-shrink-0 flex-col items-center gap-2">
        <div className="flex h-[126px] w-[240px] items-center justify-center overflow-hidden rounded border border-border bg-bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="og image 1200x630" className="h-full w-full object-cover" />
          ) : avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar fallback" className="h-full w-full object-cover opacity-60" title="未设置 og_image, fallback 用 avatar" />
          ) : (
            <span className="text-2xl text-fg-muted">🖼️</span>
          )}
        </div>
        <div className="text-xs text-fg-muted">
          {preview ? "已设置 (1200×630)" : avatarUrl ? "未设置 → fallback avatar" : "未设置"}
        </div>
      </div>
      {/* 操作 */}
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onSelect}
          disabled={uploading}
          className="block w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span>支持 PNG / JPEG / WebP · ≤5MB · 自动 resize 到 1200×630 (Facebook/Twitter 推荐)</span>
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
