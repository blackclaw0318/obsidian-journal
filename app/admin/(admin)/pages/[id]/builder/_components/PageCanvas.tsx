// ============================================================
// PageCanvas 中栏 (v0.14, v0.6.1 §21.1)
// dnd-kit sortable 排序 + 选中 + 删除
// ============================================================

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePageBuilder } from "@/lib/page-builder/store";
import { BlockRenderer } from "@/lib/blocks/render";
import type { Block } from "@/lib/blocks";

function SortableBlock({ block, selected, onSelect, onRemove }: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative rounded border-2 p-3 transition-colors ${
        selected ? "border-fg bg-bg-card" : "border-transparent hover:border-border"
      }`}
    >
      <div className="absolute -left-8 top-2 hidden gap-1 group-hover:flex">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border border-border bg-bg-card px-1 text-xs active:cursor-grabbing"
          title="拖拽排序"
        >
          ⋮⋮
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded border border-red-300 bg-bg-card px-1 text-xs text-red-500"
          title="删除"
        >
          ✕
        </button>
      </div>
      <div className="pointer-events-none">
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

function EmptyDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop" });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-32 items-center justify-center rounded border-2 border-dashed text-sm text-fg-muted ${
        isOver ? "border-fg bg-bg-card" : "border-border"
      }`}
    >
      从左侧拖拽 Block 到这里开始编辑
    </div>
  );
}

export function PageCanvas() {
  const { state, remove, select } = usePageBuilder();
  return (
    <div className="overflow-y-auto rounded-lg border border-border bg-bg p-4 pl-10">
      {state.blocks.length === 0 ? (
        <EmptyDropZone />
      ) : (
        <SortableContext items={state.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {state.blocks.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                selected={state.selectedId === b.id}
                onSelect={() => select(b.id)}
                onRemove={() => remove(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
