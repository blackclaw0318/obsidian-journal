// ============================================================
// BlockPalette 左栏 (v0.14, v0.6.1 §21.2)
// 13 种 Block, 按 category 分组, 可拖到 Canvas
// ============================================================

"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BLOCK_PALETTE, groupByCategory, CATEGORY_LABELS, type BlockPaletteItem } from "@/lib/page-builder/palette";
import type { BlockType } from "@/lib/blocks";

function PaletteItem({ item, allowCustomHtml }: { item: BlockPaletteItem; allowCustomHtml: boolean }) {
  const isLocked = item.locked && !allowCustomHtml;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${item.type}`,
    disabled: isLocked,
    data: { type: item.type }
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : isLocked ? 0.4 : 1
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group flex cursor-grab items-start gap-2 rounded border border-border bg-bg-card p-2 text-sm transition-colors hover:border-fg ${isLocked ? "cursor-not-allowed" : ""} active:cursor-grabbing`}
    >
      <div className="mt-0.5 text-xs">
        {isLocked ? "🔒" : item.advanced ? "ⓘ" : "▢"}
      </div>
      <div className="flex-1">
        <div className="font-medium">{item.label}</div>
        <div className="text-xs text-fg-muted">{item.description}</div>
      </div>
    </div>
  );
}

export function BlockPalette({ allowCustomHtml }: { allowCustomHtml: boolean }) {
  const groups = groupByCategory(BLOCK_PALETTE);
  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-bg-card p-3">
      <h2 className="font-mono text-xs uppercase tracking-wider text-fg-muted">📦 Block 库</h2>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="mb-1 text-xs font-semibold text-fg-muted">{CATEGORY_LABELS[cat] ?? cat}</h3>
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <PaletteItem key={item.type} item={item} allowCustomHtml={allowCustomHtml} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
