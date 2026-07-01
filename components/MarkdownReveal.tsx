// ============================================================
// MarkdownReveal (client) - markdown-it 输出的逐 block 视口渐入 (P1-8)
//  - 接 SSR 渲染好的 HTML 字符串,客户端 hydrate 后接管
//  - 用 IntersectionObserver 给每个 block element (p/h2/h3/h4/ul/ol/blockquote/pre/img)
//    加 opacity 0 → 1 + translateY 12px → 0 渐入
//  - 一次触发 (once), 进入视口后不再回退
//  - stagger: 每个 block 进入视口时,按其在文档中顺序延迟 (最多 80ms 间隔, 避免视觉冲击)
//  - 尊重 prefers-reduced-motion: 直接 return 原 HTML, 不挂 Observer
//  - 不依赖修改 markdown-it 输出, 不影响 SEO (HTML 仍然 SSR 完整渲染)
// ============================================================
"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/** markdown-it 默认产出的 block 标签选择器 */
const BLOCK_SELECTOR = [
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "blockquote",
  "pre",
  "img",
  "figure",
  "table",
  "hr"
].join(",");

interface Props {
  /** SSR 渲染的 markdown HTML (已过 DOMPurify) */
  html: string;
  /** Y 轴起始位移 px */
  y?: number;
  /** 单个 block 入场时长 (秒) */
  duration?: number;
  /** 相邻 block 最大延迟 (秒), 0 关闭 stagger */
  staggerStep?: number;
  /** className 透传到外层容器 */
  className?: string;
}

export function MarkdownReveal({
  html,
  y = 12,
  duration = 0.5,
  staggerStep = 0.04,
  className
}: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 减弱动画偏好: 直接显示, 不挂 Observer
    if (reduced || !ref.current) return;

    const root = ref.current;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
    if (blocks.length === 0) return;

    // 初始状态: 不可见, 微下移
    blocks.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = `translateY(${y}px)`;
      el.style.willChange = "opacity, transform";
    });

    // IntersectionObserver 触发后: 渐入 (带 stagger)
    const revealed = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (revealed.has(el)) continue;
          revealed.add(el);

          // stagger: 按 revealed 顺序计算延迟, 最多 staggerStep * 5 = 200ms 累计
          const idx = revealed.size - 1;
          const delay = Math.min(idx * staggerStep, staggerStep * 5);

          el.style.transition = `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";

          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
    );

    blocks.forEach((el) => observer.observe(el));

    // 兜底: 3s 后强制全部显示, 避免 Observer 漏触
    const fallback = setTimeout(() => {
      blocks.forEach((el) => {
        if (!revealed.has(el)) {
          el.style.transition = `opacity ${duration}s ease-out`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        }
      });
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
      // 清理 inline style, 避免 SSR hydration mismatch 影响下次
      blocks.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transition = "";
        el.style.willChange = "";
      });
    };
  }, [html, y, duration, staggerStep, reduced]);

  return (
    <div
      ref={ref}
      className={className}
      // SSR 完整 HTML 输出, 客户端 hydrate 后 Observer 接管
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}