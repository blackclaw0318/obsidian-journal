// ============================================================
// Page Builder 状态管理 (v0.14, v0.6.1 §21.3)
// React Context + useReducer (无新依赖, 严守轻量化)
// ============================================================

"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import type { Block } from "@/lib/blocks";
import type { PageBuilderState, PageBuilderAction } from "./types";

const initialState: PageBuilderState = {
  blocks: [],
  selectedId: null,
  dirty: false
};

function reducer(state: PageBuilderState, action: PageBuilderAction): PageBuilderState {
  switch (action.type) {
    case "load":
      return { blocks: action.blocks, selectedId: null, dirty: false };
    case "add": {
      const blocks = [...state.blocks];
      const at = action.atIndex ?? blocks.length;
      blocks.splice(at, 0, action.block);
      return { blocks, selectedId: action.block.id, dirty: true };
    }
    case "remove": {
      const blocks = state.blocks.filter((b) => b.id !== action.id);
      return { ...state, blocks, selectedId: state.selectedId === action.id ? null : state.selectedId };
    }
    case "update": {
      const blocks = state.blocks.map((b) =>
        b.id === action.id ? ({ ...b, ...action.patch } as Block) : b
      );
      return { ...state, blocks };
    }
    case "reorder": {
      const fromIdx = state.blocks.findIndex((b) => b.id === action.fromId);
      const toIdx = state.blocks.findIndex((b) => b.id === action.toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return state;
      const blocks = [...state.blocks];
      const [moved] = blocks.splice(fromIdx, 1);
      blocks.splice(toIdx, 0, moved);
      return { ...state, blocks };
    }
    case "select":
      return { ...state, selectedId: action.id };
    case "markClean":
      return { ...state, dirty: false };
    default:
      return state;
  }
}

interface PageBuilderContextValue {
  state: PageBuilderState;
  load: (blocks: Block[]) => void;
  add: (block: Block, atIndex?: number) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Block>) => void;
  reorder: (fromId: string, toId: string) => void;
  select: (id: string | null) => void;
  markClean: () => void;
}

const Ctx = createContext<PageBuilderContextValue | null>(null);

export function PageBuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback((blocks: Block[]) => dispatch({ type: "load", blocks }), []);
  const add = useCallback((block: Block, atIndex?: number) => dispatch({ type: "add", block, atIndex }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const update = useCallback((id: string, patch: Partial<Block>) => dispatch({ type: "update", id, patch }), []);
  const reorder = useCallback((fromId: string, toId: string) => dispatch({ type: "reorder", fromId, toId }), []);
  const select = useCallback((id: string | null) => dispatch({ type: "select", id }), []);
  const markClean = useCallback(() => dispatch({ type: "markClean" }), []);

  const value = useMemo<PageBuilderContextValue>(
    () => ({ state, load, add, remove, update, reorder, select, markClean }),
    [state, load, add, remove, update, reorder, select, markClean]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageBuilder(): PageBuilderContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePageBuilder 必须在 PageBuilderProvider 内使用");
  return ctx;
}
