import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      // v0.22 (P0-暗色修复): 全部用 CSS 变量映射, 组件代码 0 改动
      // 亮色: :root 默认值; 暗色: .dark 覆盖
      // 来源: app/globals.css § :root / .dark
      colors: {
        base: "var(--color-base)",
        bg: "var(--color-bg)",
        "bg-muted": "var(--color-bg-muted)",
        "bg-card": "var(--color-bg-card)",
        fg: "var(--color-fg)",
        "fg-muted": "var(--color-fg-muted)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "sans-serif"],
        serif: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "72ch"
          }
        }
      }
    }
  },
  plugins: []
};

export default config;
