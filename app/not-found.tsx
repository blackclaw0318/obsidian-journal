// ============================================================
// /not-found - 全局 404 页 (v0.20 BCDE)
//  - "高级感" + "青春感" 视觉: 大号字 + 柔和呼吸动效 + 双 CTA
//  - client component: 用 framer-motion 给数字 4 呼吸动画
//  - 服务于所有未匹配路由 (Next.js App Router 全局兜底)
// ============================================================
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-8"
      >
        {/* 数字 4 - 背景层, 微微呼吸 */}
        <motion.div
          aria-hidden
          className="absolute inset-0 select-none text-[12rem] font-black leading-none tracking-tighter text-bg-muted sm:text-[16rem]"
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          404
        </motion.div>
        {/* 数字 4 - 前景层, 渐入 */}
        <h1 className="relative text-[12rem] font-black leading-none tracking-tighter text-fg sm:text-[16rem]">
          <span className="bg-gradient-to-br from-fg via-fg to-fg-muted bg-clip-text text-transparent">
            404
          </span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">页面去流浪了</h2>
        <p className="mb-10 max-w-md text-base text-fg-muted sm:text-lg">
          你寻找的页面不在这里 — 可能已被移动, 或者从未存在过。
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Link
          href="/"
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-85 hover:shadow-lg"
        >
          <Home className="h-4 w-4" />
          回到首页
        </Link>
        <Link
          href="/posts"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-5 py-2.5 text-sm font-semibold transition-all hover:border-strong hover:shadow-md"
        >
          <Search className="h-4 w-4" />
          翻翻文章
        </Link>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-16 text-xs text-fg-muted"
      >
        黑曜石日志 · 用代码与数据说话
      </motion.p>
    </div>
  );
}