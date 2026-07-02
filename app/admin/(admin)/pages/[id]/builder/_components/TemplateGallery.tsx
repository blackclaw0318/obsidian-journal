// ============================================================
// TemplateGallery - 模板选择 UI (v0.25, v0.6.1 §21.4)
// 6 套预设模板 + 1 个空白选项, 全屏覆盖, 选完进入编辑
// ============================================================

"use client";

import { TEMPLATES, type PageTemplate } from "@/lib/page-builder/templates";

interface TemplateGalleryProps {
  /** 当前 Page 标题, 显示在顶部 (给老板"这是哪个页") */
  pageTitle: string;
  /** 是否有现存 blocks (有则要 confirm 才能覆盖) */
  hasExistingBlocks: boolean;
  /** 选完模板的回调 (传入模板的 blocks) */
  onSelect: (template: PageTemplate) => void;
  /** 关闭 gallery (返回编辑器) */
  onClose?: () => void;
}

export function TemplateGallery({ pageTitle, hasExistingBlocks, onSelect, onClose }: TemplateGalleryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/80 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-5xl rounded-xl border border-border bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <h2 className="text-2xl font-bold">🎨 选择一个模板开始</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {hasExistingBlocks
                ? `「${pageTitle}」已有内容,选模板会覆盖现有 blocks。`
                : `「${pageTitle}」是空白页,选个模板快速起步。`}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-2 text-fg-muted hover:bg-bg-muted hover:text-fg"
              aria-label="关闭模板选择"
            >
              ✕
            </button>
          )}
        </div>

        {/* 模板卡片网格 */}
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                if (hasExistingBlocks) {
                  const ok = window.confirm(
                    `应用「${tpl.name}」模板会覆盖当前 ${tpl.blockCount} 个 blocks,确定?`
                  );
                  if (!ok) return;
                }
                onSelect(tpl);
              }}
              className="group flex flex-col items-start gap-3 rounded-lg border border-border bg-bg-base p-5 text-left transition hover:border-accent hover:shadow-md"
            >
              <div className="text-4xl" aria-hidden="true">{tpl.icon}</div>
              <div>
                <div className="text-lg font-semibold group-hover:text-accent">{tpl.name}</div>
                <p className="mt-1 text-sm text-fg-muted">{tpl.description}</p>
              </div>
              <div className="mt-auto flex w-full items-center justify-between border-t border-border pt-3 text-xs text-fg-muted">
                <span>
                  {tpl.blockCount === 0 ? "无 blocks" : `${tpl.blockCount} 个 block`}
                </span>
                <span className="font-mono opacity-0 transition group-hover:opacity-100">点击应用 →</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer 提示 */}
        <div className="border-t border-border bg-bg-muted/50 p-4 text-center text-xs text-fg-muted">
          💡 选完模板后,你仍然可以拖拽 / 编辑 / 删除任何 block
        </div>
      </div>
    </div>
  );
}