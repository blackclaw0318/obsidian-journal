// ============================================================
// ThemeToggle - 主题切换 (v0.20 E 升级 + v0.20 C 动效)
//  - lucide-react 图标 (统一设计语言, 替换原 emoji)
//  - v0.20: 切换时给 main 加 200ms 透明度交叉淡入 (crossfade)
//  - 三态: light / dark / auto
// ============================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "***";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = mode === "auto" ? getSystemTheme() : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.themeMode = mode;
}

/** 主题切换 crossfade — 给 <main> 加 200ms 透明度过渡 */
function flashMain(): void {
  const main = document.querySelector("main");
  if (!main) return;
  main.animate(
    [{ opacity: 0.6 }, { opacity: 1 }],
    { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
  );
}

export function ThemeToggle({
  defaultTheme = "light" as Theme
}: {
  defaultTheme?: Theme;
}) {
  const [mode, setMode] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  const lastModeRef = useRef<Theme>(defaultTheme);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = saved ?? defaultTheme;
    setMode(initial);
    applyTheme(initial);
    lastModeRef.current = initial;
    setMounted(true);

    if (initial === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [defaultTheme]);

  function set(next: Theme) {
    if (next === lastModeRef.current) return;
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    flashMain();
    lastModeRef.current = next;
  }

  if (!mounted) {
    return <div className="h-8 w-24" aria-hidden="true" />;
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-bg-card p-0.5 text-xs"
      role="group"
      aria-label="主题切换"
    >
      <ThemeButton
        icon={<Sun className="h-3.5 w-3.5" />}
        label="亮色"
        active={mode === "light"}
        onClick={() => set("light")}
      />
      <ThemeButton
        icon={<Moon className="h-3.5 w-3.5" />}
        label="暗色"
        active={mode === "dark"}
        onClick={() => set("dark")}
      />
      <ThemeButton
        icon={<Monitor className="h-3.5 w-3.5" />}
        label="跟随系统"
        active={mode === "auto"}
        onClick={() => set("auto")}
      />
    </div>
  );
}

function ThemeButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={
        "inline-flex items-center justify-center rounded-md p-1.5 transition-all duration-200 " +
        (active
          ? "bg-fg text-bg shadow-sm"
          : "text-fg-muted hover:text-fg")
      }
    >
      {icon}
    </button>
  );
}