import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
                  <a href="/admin" className="hover:text-fg">管理</a>
                </li>
              </ul>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-bg-muted">
            <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-fg-muted">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  © 2026 黑曜石日志 · Built by 黑 (Hei)
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