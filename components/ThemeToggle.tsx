// ============================================================
// ThemeToggle - 主题切换
// v0.20 E + v0.20 C + v0.23 (P1-9: 加载加速 + 去水合占位)
//
// v0.23 变更 (提速):
//   - 删 mounted 占位 div (老逻辑: SSR 占 2h-8 w-24, 等 hydrate 才显示 → 几百 ms 延迟)
//   - 改 SSR 实按钮: 用 defaultTheme 决定 SSR active,避免 FOUC
//   - useState 用 lazy initializer 同步读 localStorage (server 不能读, fallback defaultTheme)
//   - useEffect 在 hydrate 后再 sync localStorage 值 (避免 SSR/CSR 不一致)
//   - suppressHydrationWarning 在按钮上,接受 client active 变化的小跳动
//   - localStorage 读取安全包装 try/catch
// ============================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "obsidian-theme";

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
  // v0.23: lazy initializer 在 client 第一次 render 时同步读 localStorage
  // SSR 时 localStorage 不存在 → fallback defaultTheme (从 layout.tsx 传)
  const [mode, setMode] = useState<Theme>(defaultTheme);
  const lastModeRef = useRef<Theme>(defaultTheme);

  // v0.23: 不再用 mounted 占位。SSR 时用 defaultTheme,client mount 后同步 localStorage
  useEffect(() => {
    let saved: Theme;
    try {
      saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? defaultTheme;
    } catch {
      saved = defaultTheme;
    }
    if (saved !== defaultTheme) {
      // 仅当与 SSR 默认值不同时才 setState, 避免无谓 re-render
      setMode(saved);
      applyTheme(saved);
    } else {
      applyTheme(defaultTheme);
    }
    lastModeRef.current = saved;

    // auto 模式监听系统主题变化
    if (saved === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [defaultTheme]);

  function set(next: Theme) {
    if (next === lastModeRef.current) return;
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage 满 / 隐私模式, 静默忽略
    }
    applyTheme(next);
    flashMain();
    lastModeRef.current = next;
  }

  // v0.23: SSR 立即渲染 3 个按钮 (用 defaultTheme)
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-bg-card p-0.5 text-xs"
      role="group"
      aria-label="主题切换"
      suppressHydrationWarning
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
      suppressHydrationWarning
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
