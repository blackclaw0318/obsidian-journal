// ============================================================
// AdminShell - 顶栏 + 侧边栏 + 移动端抽屉 (v0.28 P2-18 兑现)
//  - 桌面: 侧边栏 (≥md)
//  - 移动: 顶栏汉堡按钮 + 左滑抽屉 (<md), 关键 UX 缺失修复
//  - 顶栏 mobile 显示当前页标签 (用户上下文)
//  - body scroll lock (抽屉开时锁滚动)
//  - ESC 关抽屉 + 路由切换自动关
// ============================================================
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { User } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const NAV: NavItem[] = [
  { label: "概览", href: "/admin", icon: "📊" },
  { label: "帖子", href: "/admin/posts", icon: "📝" },
  { label: "系列", href: "/admin/series", icon: "🗂" },
  { label: "小说", href: "/admin/novels", icon: "📚" },
  { label: "视频", href: "/admin/videos", icon: "🎬" },
  { label: "页面", href: "/admin/pages", icon: "📄" },
  { label: "媒体库", href: "/admin/media", icon: "🖼" },
  { label: "友链", href: "/admin/socials", icon: "🔗" },
  { label: "用户", href: "/admin/users", icon: "👥" },
  { label: "设置", href: "/admin/settings", icon: "⚙️" }
];

type SafeUser = Omit<User, "password_hash">;

export function AdminShell({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 路由变化时自动关抽屉 (防止点完链接抽屉还挡着)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // ESC 关抽屉
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // body scroll lock (抽屉开时锁背景滚动, 移动端体验关键)
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const currentLabel = NAV.find((n) => isActive(n.href))?.label ?? "Admin";

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* ============ 桌面侧边栏 (≥md) ============ */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-bg-card md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span className="text-xl">⬛</span>
            <span>黑曜石</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
                isActive(item.href)
                  ? "bg-accent/10 text-accent"
                  : "text-fg hover:bg-bg-base"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 text-xs text-fg-muted">
          v0.27 · Phase 3.7
        </div>
      </aside>

      {/* ============ 移动端抽屉 (<md) ============ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="管理菜单">
          {/* 背景遮罩 */}
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          {/* 抽屉面板 (左侧滑入) */}
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Link href="/admin" className="flex items-center gap-2 font-bold">
                <span className="text-xl">⬛</span>
                <span>黑曜石</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 text-fg-muted hover:bg-bg-base hover:text-fg"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors active:scale-[0.98] ${
                    isActive(item.href)
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-fg hover:bg-bg-base"
                  }`}
                  style={{ minHeight: 44 /* iOS HIG */ }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-xs text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* 抽屉底部: 用户卡片 + 登出 (P2-18 iOS home indicator safe-area) */}
            <div className="drawer-safe-bottom border-t border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                  {(user.name ?? user.email)[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs text-fg-muted">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="block w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                style={{ minHeight: 44 }}
              >
                {loggingOut ? "登出中..." : "登出"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ============ 主区 ============ */}
      <div className="flex flex-1 flex-col">
        {/* 顶栏 (含移动端汉堡 + 桌面用户菜单) */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-bg-card px-4">
          <div className="flex items-center gap-3">
            {/* 移动端汉堡按钮 */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-2 text-fg-muted hover:bg-bg-base hover:text-fg md:hidden"
              aria-label="打开菜单"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* 当前页标签 (移动端优先, 桌面也显示) */}
            <span className="text-sm font-medium text-fg-muted">
              {currentLabel}
            </span>
          </div>

          {/* 桌面用户菜单 */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-bg-base"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
              <span className="text-xs">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded border border-border bg-bg-card shadow-lg">
                <div className="border-b border-border px-3 py-2 text-xs text-fg-muted">
                  <div className="font-medium text-fg">{user.name}</div>
                  <div className="truncate">{user.email}</div>
                  <div className="mt-1 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                    {user.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-bg-base disabled:opacity-50"
                >
                  {loggingOut ? "登出中..." : "登出"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 内容 (mobile padding 收紧 p-4, 桌 p-6) */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}