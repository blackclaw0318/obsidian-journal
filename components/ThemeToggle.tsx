"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "obsidian-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = mode === "auto" ? getSystemTheme() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.themeMode = mode;
}

export function ThemeToggle({ defaultTheme = "light" as Theme }: { defaultTheme?: Theme }) {
  const [mode, setMode] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 优先从 localStorage 恢复用户偏好
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null);
    const initial = saved ?? defaultTheme;
    setMode(initial);
    applyTheme(initial);
    setMounted(true);

    // 跟随系统变化 (auto 模式)
    if (initial === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [defaultTheme]);

  function set(next: Theme) {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  if (!mounted) {
    // 避免 hydration mismatch
    return <div className="w-20 h-8" aria-hidden="true" />;
  }

  return (
    <div className="flex items-center gap-1 text-xs" role="group" aria-label="主题切换">
      <button
        type="button"
        onClick={() => set("light")}
        aria-label="亮色"
        aria-pressed={mode === "light"}
        className={
          "px-2 py-1 rounded transition-colors " +
          (mode === "light" ? "bg-fg text-bg font-semibold" : "text-fg-muted hover:text-fg")
        }
        title="亮色"
      >
        ☀️
      </button>
      <button
        type="button"
        onClick={() => set("dark")}
        aria-label="暗色"
        aria-pressed={mode === "dark"}
        className={
          "px-2 py-1 rounded transition-colors " +
          (mode === "dark" ? "bg-fg text-bg font-semibold" : "text-fg-muted hover:text-fg")
        }
        title="暗色"
      >
        🌙
      </button>
      <button
        type="button"
        onClick={() => set("auto")}
        aria-label="跟随系统"
        aria-pressed={mode === "auto"}
        className={
          "px-2 py-1 rounded transition-colors " +
          (mode === "auto" ? "bg-fg text-bg font-semibold" : "text-fg-muted hover:text-fg")
        }
        title="跟随系统"
      >
        🖥️
      </button>
    </div>
  );
}
