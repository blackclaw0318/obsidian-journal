// ============================================================
// SmoothScroll - 全局平滑滚动
// v0.20 C: Lenis 1.x + framer-motion 兼容
// v0.22 (P0-滑动阻尼): 改 lerp 配置 (Q2=B 拍板)
//   - duration 1.2 → 1.0 (略短, 减少"飘")
//   - easeOutExpo → lerp 0.1 (Lenis 1.x 最佳实践, 跟手)
//   - touchMultiplier 1.4 → 2 (移动端更跟手)
//   - syncTouch: false (macOS/iOS 顺滑感, 避免与 native 滚动冲突)
//   - wheelMultiplier 1 (保持桌面细腻)
// ============================================================
"use client";

import { ReactLenis } from "lenis/react";
import type { LenisOptions } from "lenis";

const options: LenisOptions = {
  duration: 1.0,
  // v0.22: 改 lerp 0.1 (替代 easeOutExpo, Lenis 1.x 推荐)
  // lerp 越接近 0 越跟手, 0.1 是"丝滑不飘"的甜点
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  syncTouch: false
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={options}>
      {children}
    </ReactLenis>
  );
}
