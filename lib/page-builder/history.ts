// ============================================================
// Page Builder History Stack (v0.27, P2-15 撤销/重做)
// ============================================================
// 纯函数化的 history stack 操作, 便于单元测试
// 设计:
//   - past[]: 历史 blocks 状态 (从老到新, 最后一项是最近)
//   - future[]: 重做栈 (从新到老, 第一项是即将重做)
//   - MAX_HISTORY 限 50 步, 防止内存爆炸
//   - 任何"修改 blocks"的动作都 pushHistory (清空 future)
// ============================================================

import type { Block } from "@/lib/blocks";

export const MAX_HISTORY = 50;

export interface HistoryState {
  past: Block[][];
  future: Block[][];
}

export function createHistory(): HistoryState {
  return { past: [], future: [] };
}

/** 修改前调用: 把当前 blocks 推入 past 栈, 清空 future */
export function pushHistory(history: HistoryState, currentBlocks: Block[]): HistoryState {
  return {
    past: [...history.past.slice(-(MAX_HISTORY - 1)), currentBlocks],
    future: []
  };
}

/** 撤销: 从 past 取出上一个, 当前 blocks 进 future */
export function undoStep(
  history: HistoryState,
  currentBlocks: Block[]
): { history: HistoryState; blocks: Block[] | null } {
  if (history.past.length === 0) return { history, blocks: null };
  const prev = history.past[history.past.length - 1];
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [currentBlocks, ...history.future].slice(0, MAX_HISTORY)
    },
    blocks: prev
  };
}

/** 重做: 从 future 取出下一个, 当前 blocks 进 past */
export function redoStep(
  history: HistoryState,
  currentBlocks: Block[]
): { history: HistoryState; blocks: Block[] | null } {
  if (history.future.length === 0) return { history, blocks: null };
  const next = history.future[0];
  return {
    history: {
      past: [...history.past, currentBlocks].slice(-MAX_HISTORY),
      future: history.future.slice(1)
    },
    blocks: next
  };
}

/** 加载新内容: 清空历史 (例如 load from server / select template) */
export function resetHistory(): HistoryState {
  return { past: [], future: [] };
}