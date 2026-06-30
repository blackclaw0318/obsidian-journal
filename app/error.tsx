// ============================================================
// /error - 全局错误边界 (v0.20 BCDE)
//  - "use client": 必须是 client component 才能 reset
//  - 风格与 404 一致: 大字 + 呼吸 + 双 CTA
//  - dev 环境显示 error.message (生产环境由 Next.js 自动隐藏)
// ============================================================
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报到控制台 (P1: 接入 Sentry/Umami error tracking)
    console.error("[obsidian-journal] 页面错误:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-8"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 select-none text-[10rem] font-black leading-none tracking-tighter text-bg-muted sm:text-[14rem]"
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          ⚠
        </motion.div>
        <h1 className="relative text-[10rem] font-black leading-none tracking-tighter text-fg sm:text-[14rem]">
          <AlertTriangle className="mx-auto h-32 w-32 text-amber-500 dark:text-amber-400 sm:h-44 sm:w-44" strokeWidth={1.5} />
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">出错了</h2>
        <p className="mb-2 max-w-md text-base text-fg-muted sm:text-lg">
          页面渲染时遇到意外 — 大部分时候刷新就好。
        </p>
        {process.env.NODE_ENV !== "production" && error.message && (
          <p className="mb-6 max-w-md rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-400">
            {error.message}
            {error.digest && <span className="ml-2 opacity-60">#{error.digest}</span>}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <button
          type="button"
          onClick={() => reset()}
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-85 hover:shadow-lg"
        >
          <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180" />
          重试一次
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-5 py-2.5 text-sm font-semibold transition-all hover:border-strong hover:shadow-md"
        >
          <Home className="h-4 w-4" />
          回到首页
        </Link>
      </motion.div>
    </div>
  );
}