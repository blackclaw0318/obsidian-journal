"use client";

// ============================================================
// SeedEditModal - 资源种子编辑 (v0.35 Phase 4)
// 老板 2026-07-04 20:37 需求: admin 可控初始百位数 (装门面)
// 改 base_value (view 种子) + seed_download_count (download 种子) + seed_enabled (开关)
// ============================================================
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaItem } from "@/lib/types";

interface Props {
  item: MediaItem;
  initialBaseValue: number;
  initialSeedDownload: number;
  initialSeedEnabled: number;
  realView: number;
  realDownload: number;
  onClose: () => void;
}

const MAX_SEED = 999;  // v0.34 schema CHECK 限定 100-999 (老板 "初始百位数" 需求对齐)

export function SeedEditModal({
  item,
  initialBaseValue,
  initialSeedDownload,
  initialSeedEnabled,
  realView,
  realDownload,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [baseValue, setBaseValue] = useState(initialBaseValue);
  const [seedDownload, setSeedDownload] = useState(initialSeedDownload);
  const [seedEnabled, setSeedEnabled] = useState(initialSeedEnabled === 1);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/resources/${item.id}/seed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_value: baseValue,
          seed_download_count: seedDownload,
          seed_enabled: seedEnabled ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.refresh();
        onClose();
      } else {
        setError(data.error ?? "保存失败");
      }
    });
  }

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const previewView = seedEnabled ? baseValue + realView : realView;
  const previewDownload = seedEnabled ? seedDownload + realDownload : realDownload;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">⚙️ 种子数编辑</h2>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 truncate text-xs text-fg-muted" title={item.filename}>
          📄 {item.filename}
        </div>

        {error && (
          <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* seed_enabled 开关 */}
        <label className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-bg-base p-3">
          <input
            type="checkbox"
            checked={seedEnabled}
            onChange={(e) => setSeedEnabled(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          <div className="flex-1">
            <div className="text-sm font-medium">启用种子数</div>
            <div className="text-xs text-fg-muted">
              关闭后只显示真实浏览/下载数 (不装门面时用)
            </div>
          </div>
        </label>

        {/* base_value */}
        <div className="mb-3 space-y-1">
          <label className="flex items-center justify-between text-sm">
            <span>👁 浏览种子 (base_value)</span>
            <span className="font-mono text-xs text-fg-muted">
              显示 = {baseValue} + {realView} = <strong className="text-accent">{previewView}</strong>
            </span>
          </label>
          <input
            type="number"
            min={0}
            max={MAX_SEED}
            value={baseValue}
            onChange={(e) => setBaseValue(Math.floor(Number(e.target.value) || 0))}
            disabled={!seedEnabled}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm font-mono outline-none focus:border-accent disabled:opacity-50"
          />
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setBaseValue(100)}
              disabled={!seedEnabled}
              className="rounded border border-border px-2 py-0.5 hover:bg-bg-base disabled:opacity-50"
            >
              100
            </button>
            <button
              type="button"
              onClick={() => setBaseValue(500)}
              disabled={!seedEnabled}
              className="rounded border border-border px-2 py-0.5 hover:bg-bg-base disabled:opacity-50"
            >
              500
            </button>
            <button
              type="button"
              onClick={() => setBaseValue(999)}
              disabled={!seedEnabled}
              className="rounded border border-border px-2 py-0.5 hover:bg-bg-base disabled:opacity-50"
            >
              999
            </button>
            <button
              type="button"
              onClick={() => setBaseValue(999)}
              disabled={!seedEnabled}
              className="rounded border border-border px-2 py-0.5 hover:bg-bg-base disabled:opacity-50"
            >
              999 (顶)
            </button>
          </div>
        </div>

        {/* seed_download_count */}
        <div className="mb-4 space-y-1">
          <label className="flex items-center justify-between text-sm">
            <span>⬇ 下载种子 (seed_download_count)</span>
            <span className="font-mono text-xs text-fg-muted">
              显示 = {seedDownload} + {realDownload} = <strong className="text-accent">{previewDownload}</strong>
            </span>
          </label>
          <input
            type="number"
            min={0}
            max={MAX_SEED}
            value={seedDownload}
            onChange={(e) => setSeedDownload(Math.floor(Number(e.target.value) || 0))}
            disabled={!seedEnabled}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm font-mono outline-none focus:border-accent disabled:opacity-50"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-border px-3 py-2 text-sm hover:bg-bg-base"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="flex-1 rounded bg-accent px-3 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {pending ? "保存中..." : "保存"}
          </button>
        </div>

        <p className="mt-3 text-xs text-fg-muted">
          💡 提示: 真实浏览/下载数不会因改种子而丢失,累加在 seed 之上。
        </p>
      </div>
    </div>
  );
}