// ============================================================
// PageTransition - 路由切换动画 (v0.21.2 P1-7)
//  - 用 pathname 作为 key, 每次切换触发 fade + 微位移
//  - AnimatePresence mode="wait" 让退场先完成再入场
//  - 尊重 prefers-reduced-motion (无动画)
//  - duration 0.22s (更快更有响应感, 与 v0.20 Lenis 1.2s 区分)
// ============================================================
"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ENTER = { opacity: 0, y: 8 };
const ANIMATED = { opacity: 1, y: 0 };
const EXIT = { opacity: 0, y: -8 };

const TRANSITION = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number] // 全局 easeOutExpo
};

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // 无障碍 (前庭功能敏感) → 完全跳过动画
  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={ENTER}
        animate={ANIMATED}
        exit={EXIT}
        transition={TRANSITION}
        className="contents" // 不破坏父布局 (让 motion.div 像 ghost)
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
