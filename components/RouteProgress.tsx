// ============================================================
// RouteProgress - 顶进度条 (v0.32 P0-路由切换优化)
//  - nprogress 风格: 点击链接立即显示细条, 路由变化时前进, 完成后 fade out
//  - 用 next/navigation 的 usePathname 监听, start/stop 由 useEffect 控制
//  - 不用第三方依赖, 纯 CSS 动画 (零运行时开销)
//  - 颜色走 design token: accent + 90% 透明度
// ============================================================
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef<string>(pathname);

  // 监听 pathname 变化: 重置进度条 (新页面已就绪)
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      // 完成 → 100% → 短暂停留 → fade out
      setProgress(100);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  // 监听链接 hover/mousedown (提前显示, 让点击立即有反馈)
  useEffect(() => {
    const startProgress = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(true);
      setProgress(15);
      // 假推进 (真实 fetch 完成由 pathname 变化触发 100%)
      let p = 15;
      const tick = () => {
        p = Math.min(p + Math.random() * 12 + 3, 88);
        setProgress(p);
        if (p < 88) {
          timerRef.current = setTimeout(tick, 220);
        }
      };
      tick();
    };

    // 全局拦截: 检测 next 链接点击 / 普通链接点击
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      // 外部链接 / 同页 hash / 修改器键 → 不显示
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      startProgress();
    };

    document.addEventListener("click", onClick, true);
    const removeListener = () =>
      document.removeEventListener("click", onClick, true);
    return removeListener;
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className="h-full bg-accent transition-all duration-200 ease-out"
        style={{
          width: visible ? `${progress}%` : "0%",
          opacity: visible ? 0.9 : 0
        }}
      />
    </div>
  );
}
