// ============================================================
// SmoothScroll - 全局平滑滚动 (v0.20 C 升级)
//  - Lenis 1.x: 与 framer-motion 兼容 (sync scroll 事件)
//  - 自定义平滑参数: 1.2s duration, easeOutExpo 风格
//  - 客户端组件: 在 layout 顶层包 children
//  - 桌面: smooth; 移动 (<768px): auto (避免 iOS 抖动)
// ============================================================
"use client";

import { ReactLenis } from "lenis/react";
import type { LenisOptions } from "lenis";

const options: LenisOptions = {
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  // smoothWheel 默认 true, 桌面平滑
  // touchMultiplier 控制移动端
  wheelMultiplier: 1,
  touchMultiplier: 1.4
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={options}>
      {children}
    </ReactLenis>
  );
}