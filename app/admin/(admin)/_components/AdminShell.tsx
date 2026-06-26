// ============================================================
// AdminShell - 顶栏 + 侧边栏 (client component for user menu)
// ============================================================
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  { label: "小说", href: "/admin/novels", icon: "📚" },
  { label: "视频", href: "/admin/videos", icon: "🎬" },
  { label: "页面", href: "/admin/pages", icon: "📄" },
  { label: "媒体库", href: "/admin/media", icon: "🖼" },
  { label: "工具", href: "/admin/tools", icon: "🔧" },
  { label: "设置", href: "/admin/settings", icon: "⚙️" }
];

type SafeUser = Omit<User, "password_hash">;

export function AdminShell({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* ============ 侧边栏 ============ */}
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
          v0.8 · Phase 3.1
        </div>
      </aside>

      {/* ============ 主区 ============ */}
      <div className="flex flex-1 flex-col">
        {/* 顶栏 */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-bg-card px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted">
              {NAV.find((n) => isActive(n.href))?.label ?? "Admin"}
            </span>
          </div>

          <div className="relative">
            <button
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

        {/* 内容 */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
