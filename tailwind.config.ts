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
      colors: {
        // obsidian-journal 主题色 (v0.3 §12 默认亮色)
        bg: {
          DEFAULT: "#ffffff",
          muted: "#f6f6f7",
          card: "#fafafa"
        },
        fg: {
          DEFAULT: "#0a0a0a",
          muted: "#6b7280"
        },
        accent: {
          DEFAULT: "#0f172a",
          hover: "#1e293b"
        },
        border: {
          DEFAULT: "#e5e7eb",
          strong: "#d1d5db"
        }
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