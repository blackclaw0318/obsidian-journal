// ============================================================
// Page Builder 状态管理 (v0.14 + v0.27 undo/redo)
// React Context + useReducer + history stack (无新依赖, 严守轻量化)
// ============================================================
// v0.27 P2-15: 加入撤销/重做 (Cmd+Z / Cmd+Shift+Z)
//   - past/present/future 三个栈
//   - modifying actions (add/remove/update/reorder) 入 past, 清 future
//   - non-modifying actions (load/select/markClean) 不入历史
//   - 栈上限 50 步, 防止内存爆炸
//   - canUndo/canRedo 走 state (触发 UI re-render)
// ============================================================

"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { Block } from "@/lib/blocks";
import type { PageBuilderState, PageBuilderAction } from "./types";
import { createHistory, pushHistory as push, undoStep, redoStep, resetHistory, type HistoryState } from "./history";

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
  // v0.27 P2-15: 撤销/重做
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Ctx = createContext<PageBuilderContextValue | null>(null);

export function PageBuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // 用 ref 存历史栈 (避免 dispatch history update 时触发 reducer)
  const historyRef = useRef<HistoryState>(createHistory());
  // canUndo/canRedo 用 state (触发 UI 按钮 disabled 状态)
  const [historyInfo, setHistoryInfo] = useState<{ canUndo: boolean; canRedo: boolean }>({ canUndo: false, canRedo: false });

  const refreshHistoryInfo = useCallback(() => {
    setHistoryInfo({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0
    });
  }, []);

  /** 修改 blocks 前调用: 把当前 blocks 推入 past 栈, 清空 future */
  const pushHistory = useCallback(() => {
    historyRef.current = push(historyRef.current, state.blocks);
    refreshHistoryInfo();
  }, [state.blocks, refreshHistoryInfo]);

  const load = useCallback((blocks: Block[]) => {
    // load 不入历史 (从 server 加载/选模板都不算"操作")
    historyRef.current = resetHistory();
    refreshHistoryInfo();
    dispatch({ type: "load", blocks });
  }, [refreshHistoryInfo]);

  const add = useCallback((block: Block, atIndex?: number) => {
    pushHistory();
    dispatch({ type: "add", block, atIndex });
  }, [pushHistory]);

  const remove = useCallback((id: string) => {
    pushHistory();
    dispatch({ type: "remove", id });
  }, [pushHistory]);

  const update = useCallback((id: string, patch: Partial<Block>) => {
    pushHistory();
    dispatch({ type: "update", id, patch });
  }, [pushHistory]);

  const reorder = useCallback((fromId: string, toId: string) => {
    pushHistory();
    dispatch({ type: "reorder", fromId, toId });
  }, [pushHistory]);

  const select = useCallback((id: string | null) => {
    // select 不入历史 (纯 UI 状态)
    dispatch({ type: "select", id });
  }, []);

  const markClean = useCallback(() => {
    // markClean 不入历史 (只是清 dirty 标志)
    dispatch({ type: "markClean" });
  }, []);

  const undo = useCallback(() => {
    const result = undoStep(historyRef.current, state.blocks);
    if (result.blocks === null) return;
    historyRef.current = result.history;
    // 用 load 而非直接 set, 避免触发 pushHistory
    dispatch({ type: "load", blocks: result.blocks });
    refreshHistoryInfo();
  }, [state.blocks, refreshHistoryInfo]);

  const redo = useCallback(() => {
    const result = redoStep(historyRef.current, state.blocks);
    if (result.blocks === null) return;
    historyRef.current = result.history;
    dispatch({ type: "load", blocks: result.blocks });
    refreshHistoryInfo();
  }, [state.blocks, refreshHistoryInfo]);

  const value = useMemo<PageBuilderContextValue>(
    () => ({
      state,
      load,
      add,
      remove,
      update,
      reorder,
      select,
      markClean,
      undo,
      redo,
      canUndo: historyInfo.canUndo,
      canRedo: historyInfo.canRedo
    }),
    [state, load, add, remove, update, reorder, select, markClean, undo, redo, historyInfo.canUndo, historyInfo.canRedo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageBuilder(): PageBuilderContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePageBuilder 必须在 PageBuilderProvider 内使用");
  return ctx;
}