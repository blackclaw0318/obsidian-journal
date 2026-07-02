// ============================================================
// HomeHero - 首页 Hero 入场动画 (v0.20 C 升级)
//  - 服务端传 props (siteName / tagline / avatarUrl / 统计)
//  - 客户端用 framer-motion 做入场动画
//    - 头像: scale + 渐入 (delay 0)
//    - 标题: Y 上移 + 渐入 (delay 0.1)
//    - tagline: 渐入 (delay 0.2)
//    - 统计: stagger 渐入 (delay 0.3-0.5)
//  - 头像 hover: 缓慢旋转 + 缩放
// ============================================================
"use client";

import { motion } from "framer-motion";

interface HomeHeroProps {
  siteName: string;
  tagline: string;
  avatarUrl: string;
  stats: { label: string; value: string; emoji: string }[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function HomeHero({
  siteName,
  tagline,
  avatarUrl,
  stats
}: HomeHeroProps) {
  return (
    <section className="mb-12 flex items-start gap-4 sm:mb-16 sm:gap-6">
      {/* 头像: 旋转光晕 + hover 微交互 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        whileHover={{ scale: 1.04, rotate: 3 }}
        className="relative flex-shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={`${siteName} 头像`}
          width={96}
          height={96}
          className="relative h-16 w-16 rounded-full border-2 border-border object-cover shadow-lg sm:h-24 sm:w-24"
        />
        {/* 光晕 */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-accent/30 to-transparent blur-2xl"
        />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="mb-2 text-3xl font-bold tracking-tight sm:text-5xl"
        >
          {siteName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
          className="text-base text-fg-muted sm:text-lg"
        >
          {tagline}
        </motion.p>
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } }
          }}
          className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted"
        >
          {stats.map((s) => (
            <motion.span
              key={s.label}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }
              }}
            >
              {s.emoji} {s.value} {s.label}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}