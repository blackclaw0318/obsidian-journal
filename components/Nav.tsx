// ============================================================
// Nav - 客户端导航 (v0.20 E 升级)
//  - 桌面 (md+): 横排链接 + ThemeToggle
//  - 移动 (<md): 汉堡按钮 + 顶部抽屉 + 背景遮罩
//  - 路由感知 active state (usePathname)
//  - lucide-react 图标统一设计语言
// ============================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface NavProps {
  siteName: string;
  defaultTheme: "light" | "dark" | "auto";
}

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/novels", label: "小说" },
  { href: "/videos", label: "视频" },
  { href: "/media", label: "媒体" },
  { href: "/admin", label: "⚙ 管理" }
];

/** 判断链接是否 active (支持 /posts 同时高亮 /posts/[slug]) */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ siteName, defaultTheme }: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 路由变化自动关闭抽屉
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 抽屉打开时锁滚动 + ESC 关闭
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80"
          aria-label={`${siteName} 首页`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent transition-transform group-hover:scale-125" />
          <span>{siteName}</span>
        </Link>

        {/* 桌面导航 (md+) */}
        <ul className="hidden items-center gap-6 text-sm md:flex">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative transition-colors hover:text-fg",
                  isActive(pathname, item.href)
                    ? "font-semibold text-fg"
                    : "text-fg-muted"
                )}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
                {isActive(pathname, item.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/admin"
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors hover:bg-bg-muted",
                isActive(pathname, "/admin")
                  ? "bg-bg-muted font-semibold text-fg"
                  : "text-fg-muted"
              )}
            >
              ⚙ 管理
            </Link>
          </li>
        </ul>

        <div className="hidden md:block">
          <ThemeToggle defaultTheme={defaultTheme} />
        </div>

        {/* 移动端汉堡按钮 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg md:hidden"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* 移动端抽屉 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              aria-hidden
            />
            {/* 抽屉面板 */}
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="导航菜单"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                  <span>{siteName}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-2 text-fg-muted hover:bg-bg-muted hover:text-fg"
                  aria-label="关闭菜单"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="flex flex-col px-4 pb-6">
                {NAV_ITEMS.map((item, idx) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 + idx * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center rounded-lg px-4 py-3 text-base transition-colors",
                        isActive(pathname, item.href)
                          ? "bg-bg-muted font-semibold text-fg"
                          : "text-fg-muted hover:bg-bg-muted hover:text-fg"
                      )}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
                <li className="mt-4 flex items-center justify-between border-t border-border px-4 pt-4">
                  <span className="text-sm text-fg-muted">主题</span>
                  <ThemeToggle defaultTheme={defaultTheme} />
                </li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}