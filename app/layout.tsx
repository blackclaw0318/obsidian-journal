// ============================================================
// 根布局 (v0.20 E 升级)
//  - 严守 v0.6.1: 从 SiteConfig 动态读取 site_name + description
//  - title / description / og:title / twitter:title 动态化 (跟随 SiteConfig)
//  - og:type / twitter:card / og:locale 走 metadata API 静态 (避免与子页面 og:type=article 冲突)
//  - nav/footer 拆成独立组件 (Nav client / Footer server)
//  - 主题初始化 inline script 严防 FOUC
// ============================================================
import type { Metadata } from "next";
import "./globals.css";
import { siteConfigRepo } from "../lib/repo";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { SmoothScroll } from "../components/SmoothScroll";
import { PageTransition } from "../components/PageTransition";

/**
 * Root metadata (静态部分)
 * - title / description 在 <head> 中动态覆盖
 * - og:siteName / og:locale / twitter:card 走 metadata API
 * - og:type 不在根 layout 设, 让子页面 metadata 决定 (article / website / book)
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  // title 在 head 中动态注入 (跟随 SiteConfig.site_name)
  description: "用代码与数据说话",
  keywords: ["技术博客", "AI", "全栈", "创业", "HandFoot"],
  authors: [{ name: "上坤" }],
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
  // OG 静态部分 (子页面会覆盖 type 和 title)
  openGraph: {
    siteName: "黑曜石日志",
    locale: "zh_CN"
    // 注意: 不设 type, 让子页面 metadata 提供 (article / website / book)
  },
  twitter: {
    card: "summary_large_image"
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
  // v0.6.1: 从 SiteConfig 读 site_name + description, 严守 schema
  const config = siteConfigRepo.get();
  const siteName = config?.site_name ?? "黑曜石日志";
  const siteTagline = config?.site_description ?? "用代码与数据说话";
  const defaultTheme = (config?.default_theme ?? "light") as
    | "light"
    | "dark"
    | "auto";

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* 动态 title (覆盖 metadata API 默认 title) */}
        <title>{siteName}</title>
        <meta name="description" content={siteTagline} />
        {/* og:title / twitter:title 跟随 SiteConfig (与子页面 og:type 兼容)
            注意: 不写 og:type / og:site_name, 走 metadata API (与子页面 metadata merge) */}
        {/* Phase 2.4 RSS + Phase 2.3 SEO: Atom + RSS 2.0 autodiscovery link
            由 Next.js metadata.alternates.types 生成 (metadataBase = NEXT_PUBLIC_SITE_URL) */}
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <SmoothScroll>
          <div className="flex min-h-screen flex-col">
            <Nav siteName={siteName} defaultTheme={defaultTheme} />
            <main className="flex-1"><PageTransition>{children}</PageTransition></main>
            <Footer />
          </div>
        </SmoothScroll>
      </body>
    </html>
  );
}