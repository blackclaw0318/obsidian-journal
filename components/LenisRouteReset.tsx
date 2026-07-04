// ============================================================
// LenisRouteReset - 路由切换时 instant scroll to top (v0.32 P0-)
//  - 必须在 <ReactLenis> 内 (即 SmoothScroll 内部), 才能 useLenis() 拿到实例
//  - 监听 pathname 变化 → lenis.scrollTo(0, { immediate: true })
//  - immediate: true → 0ms 跳到顶, 没有 lerp, 解决"页面慢慢飘到顶"的"等待感"
//  - 不影响用户页面内主动滚动 (只在路由变化触发)
// ============================================================
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

export function LenisRouteReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      // 新路由 → 立即到顶 (无 lerp)
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        // Lenis 还没就绪 (罕见) → 兜底用原生
        window.scrollTo(0, 0);
      }
    }
  }, [pathname, lenis]);

  return null;
}
