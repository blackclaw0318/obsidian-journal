// ============================================================
// PageBuilder 主容器 (v0.14, v0.6.1 §21)
// 三栏: BlockPalette(左) + PageCanvas(中) + BlockInspector(右)
// ============================================================

"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Block, BlockType } from "@/lib/blocks";
import { PageBuilderProvider, usePageBuilder } from "@/lib/page-builder/store";
import { deserializePageContent, serializePageContent, cloneBlocks } from "@/lib/page-builder/serialize";
import { BLOCK_PALETTE } from "@/lib/page-builder/palette";
import { BlockPalette } from "./BlockPalette";
import { PageCanvas } from "./PageCanvas";
import { BlockInspector } from "./BlockInspector";

function genId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(type: BlockType, theme: "light" | "dark" = "light"): Block {
  const id = genId();
  switch (type) {
    case "text":        return { id, type, theme, content: "" };
    case "heading":     return { id, type, theme, level: 2, text: "" };
    case "image":       return { id, type, theme, src: "", alt: "" };
    case "video":       return { id, type, theme, src: "" };
    case "gallery":     return { id, type, theme, images: [], columns: 3 };
    case "quote":       return { id, type, theme, text: "" };
    case "callout":     return { id, type, theme, variant: "info", content: "" };
    case "code":        return { id, type, theme, language: "ts", code: "" };
    case "divider":     return { id, type, theme };
    case "list":        return { id, type, theme, ordered: false, items: [""] };
    case "table":       return { id, type, theme, headers: ["列1", "列2"], rows: [["", ""]] };
    case "custom_html": return { id, type, theme, html: "" };
    case "music":       return { id, type, theme, src: "", advanced: true };
  }
}

interface PageBuilderProps {
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  initialBlocksJson: string;
  allowCustomHtml: boolean;
}

function PageBuilderInner({ pageId, pageSlug, pageTitle, initialBlocksJson, allowCustomHtml }: PageBuilderProps) {
  const { state, load, add, reorder, markClean } = usePageBuilder();
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      load(deserializePageContent(initialBlocksJson));
    } catch (e) {
      console.error("解析 page.blocks 失败:", e);
      load([]);
    }
  }, [initialBlocksJson, load]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // 从 palette 拖来 (activeId 以 "palette:" 开头, overId 是 block id)
    if (activeId.startsWith("palette:")) {
      const type = activeId.slice("palette:".length) as BlockType;
      const item = BLOCK_PALETTE.find((b) => b.type === type);
      if (!item) return;
      if (item.locked && !allowCustomHtml) {
        setSaveMsg(`🔒 ${item.label} 需 SiteConfig.allowCustomHtml = true`);
        setTimeout(() => setSaveMsg(null), 3000);
        return;
      }
      const newBlock = createBlock(type);
      // overId 是 'canvas-drop' 或已有 block id
      if (overId === "canvas-drop") {
        add(newBlock);
      } else {
        // 插入到 overId 之前
        const idx = state.blocks.findIndex((b) => b.id === overId);
        add(newBlock, idx >= 0 ? idx : state.blocks.length);
      }
      return;
    }

    // 已有 block 排序
    if (activeId !== overId) {
      const oldIdx = state.blocks.findIndex((b) => b.id === activeId);
      const newIdx = state.blocks.findIndex((b) => b.id === overId);
      if (oldIdx >= 0 && newIdx >= 0) {
        const reordered = arrayMove(state.blocks, oldIdx, newIdx);
        // 通过 store 的 reorder 实现: 把整个数组当 from→to 一次
        // 这里简化: dispatch 一系列 reorder
        const fromId = state.blocks[oldIdx].id;
        const toId = state.blocks[newIdx].id;
        reorder(fromId, toId);
      }
    }
  };

  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: serializePageContent(state.blocks) })
      });
      const data = await res.json();
      if (data.ok) {
        markClean();
        setSaveMsg("✅ 已保存");
      } else {
        setSaveMsg(`❌ 保存失败: ${data.error ?? "未知错误"}`);
      }
    } catch (e) {
      setSaveMsg(`❌ 网络错误: ${(e as Error).message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="flex h-[calc(100vh-180px)] flex-col gap-3">
        {/* 顶栏 */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-2">
          <div>
            <h1 className="text-lg font-semibold">🎨 Page Builder</h1>
            <p className="font-mono text-xs text-fg-muted">/{pageSlug} · {pageTitle} · {state.blocks.length} blocks{state.dirty ? " · 未保存" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-sm">{saveMsg}</span>}
            <a
              href={`/admin/pages/${pageId}/edit`}
              className="rounded border border-border px-3 py-1 text-sm text-fg-muted hover:text-fg"
            >
              📝 基础版
            </a>
            <button
              onClick={onSave}
              disabled={saving || !state.dirty}
              className="rounded bg-fg px-4 py-1 text-sm font-medium text-bg hover:opacity-80 disabled:opacity-50"
            >
              {saving ? "保存中..." : "💾 保存"}
            </button>
          </div>
        </div>

        {/* 三栏 */}
        <div className="grid flex-1 grid-cols-[220px_1fr_320px] gap-3 overflow-hidden">
          <BlockPalette allowCustomHtml={allowCustomHtml} />
          <PageCanvas />
          <BlockInspector />
        </div>
      </div>
    </DndContext>
  );
}

export function PageBuilder(props: PageBuilderProps) {
  return (
    <PageBuilderProvider>
      <PageBuilderInner {...props} />
    </PageBuilderProvider>
  );
}
