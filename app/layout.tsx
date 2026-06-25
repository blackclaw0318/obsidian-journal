import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "../components/ThemeToggle";
import { siteConfigRepo } from "../lib/repo";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "黑曜石日志",
    template: "%s | 黑曜石日志"
  },
  description: "用代码与数据说话",
  keywords: ["技术博客", "AI", "全栈", "创业", "HandFoot"],
  authors: [{ name: "上坤" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "黑曜石日志"
  },
  twitter: {
    card: "summary_large_image",
    title: "黑曜石日志",
    description: "用代码与数据说话"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  alternates: {
    canonical: "/",
    types: {
      "application/atom+xml": [
        { url: "/feed.xml", title: "黑曜石日志 — Atom" }
      ],
      "application/rss+xml": [
        { url: "/rss.xml", title: "黑曜石日志 — RSS 2.0" }
      ]
    }
  }
};

// Q5 主题切换 (v0.6.1): 初始主题从 SiteConfig 读, 避免 FOUC 用 inline script
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('obsidian-theme');
    var mode = saved || '${process.env.NEXT_PUBLIC_DEFAULT_THEME || "light"}';
    var resolved = mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    }
    document.documentElement.dataset.themeMode = mode;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // v0.6.1: 从 SiteConfig 读 default_theme, 严守 schema
  const config = siteConfigRepo.get();
  const defaultTheme = (config?.default_theme ?? "light") as "light" | "dark" | "auto";

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Phase 2.4 RSS + Phase 2.3 SEO: Atom + RSS 2.0 autodiscovery link
            由 Next.js metadata.alternates.types 生成 (metadataBase = NEXT_PUBLIC_SITE_URL) */}
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0 z-10">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <a href="/" className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                <span>黑曜石日志</span>
              </a>
              <ul className="flex items-center gap-6 text-sm text-fg-muted">
                <li>
                  <a href="/" className="hover:text-fg">首页</a>
                </li>
                <li>
                  <a href="/posts" className="hover:text-fg">文章</a>
                </li>
                <li>
                  <a href="/novels" className="hover:text-fg">小说</a>
                </li>
                <li>
                  <a href="/videos" className="hover:text-fg">视频</a>
                </li>
                <li>
                  <a href="/media" className="hover:text-fg">媒体</a>
                </li>
                <li>
                  <a href="/admin" className="hover:text-fg">管理</a>
                </li>
              </ul>
              <ThemeToggle defaultTheme={defaultTheme} />
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-bg-muted">
            <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-fg-muted">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  © 2026 黑曜石日志 · Built by 黑 (Hei) · 主题: {defaultTheme}
                </div>
                <div className="flex items-center gap-4">
                  <a href="https://github.com/blackclaw0318/obsidian-journal" className="hover:text-fg">
                    GitHub
                  </a>
                  <a href="/rss.xml" className="hover:text-fg">RSS</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}