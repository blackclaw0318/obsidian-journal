// ============================================================
// RevealOnScroll - 视口入场动画包装器 (v0.20 C 升级)
//  - framer-motion whileInView: 元素进入视口时淡入 + 微上移
//  - 一次触发 (once: true), 避免回滚重复
//  - 服务于列表卡片 / 章节 / 段落的"青春感"入场
// ============================================================
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** 延迟秒 (用于 stagger) */
  delay?: number;
  /** Y 轴位移幅度 px */
  y?: number;
  /** 入场时长秒 */
  duration?: number;
  className?: string;
  /** 视口触发阈值, 0-1 */
  amount?: number;
  as?: "div" | "section" | "article" | "li" | "ul";
}

export function RevealOnScroll({
  children,
  delay = 0,
  y = 16,
  duration = 0.5,
  className,
  amount = 0.2,
  as = "div"
}: RevealProps) {
  const reduced = useReducedMotion();

  // 尊重 prefers-reduced-motion: 无动画
  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1] // easeOutExpo 风格
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}