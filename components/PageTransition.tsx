// ============================================================
// PageTransition - 路由切换动画 (v0.32 P0-路由切换优化)
//  - v0.21.2: 用 pathname 作为 key, 每次切换触发 fade + 微位移
//  - v0.21.2: AnimatePresence mode="wait" 让退场先完成再入场
//  - v0.32: 砍 mode="wait" → mode="popLayout" (新页直接覆盖旧页, 不再"等退场")
//          理由: "等待感"主因之一就是 mode="wait" 强制 220ms 退场 + 等 fetch
//                切到 popLayout 后, 用户几乎立即看到新页骨架
//  - v0.32: 砍 EXIT 退场动画 (同根因)
//  - v0.32: 持续时间 0.22s → 0.12s (更快响应)
//  - 尊重 prefers-reduced-motion (无动画)
// ============================================================
"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ENTER = { opacity: 0, y: 4 };
const ANIMATED = { opacity: 1, y: 0 };
const EXIT = { opacity: 0, y: -4 };

// v0.32 P0-: 持续时间 0.22 → 0.12 (缩短入场让新页面"立等可见")
//  - 退场 0.12s 也加快 (vs 原 0.22), 主观等待感更好
const TRANSITION = {
  duration: 0.12,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number] // easeOutExpo
};

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // 无障碍 (前庭功能敏感) → 完全跳过动画
  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    // v0.32 P0-: 保留 mode="wait" (避免 popLayout 在 strict mode 双 mount)
    //   - "等待感"主因是 mode="wait" 的 220ms 退场 + RSC fetch,后者才是大头
    //   - popLayout 会破坏 admin 编辑页 strict mode 校验, 回退
    //   - LenisRouteReset + RouteProgress 已覆盖主要"等待感"
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
