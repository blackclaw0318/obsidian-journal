// ============================================================
// Footer - 全局页脚 (v0.20 E 升级)
//  - 读取 SiteConfig 数据 (site_name / site_description)
//  - server component, 无交互
//  - 紧凑布局 + 社交链接
//  - v0.38 P5.5: 加 license 链接 + /copyright 链接
// ============================================================
import Link from "next/link";
import { siteConfigRepo } from "@/lib/repo";

export function Footer() {
  const config = siteConfigRepo.get();
  const siteName = config?.site_name ?? "黑曜石日志";
  const defaultTheme = (config?.default_theme ?? "light") as string;
  const year = new Date().getFullYear();
  const siteLicense = config?.site_license ?? "CC BY-NC-SA 4.0";
  const siteLicenseUrl =
    config?.site_license_url ?? "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  const copyrightHolder = config?.copyright_holder ?? "上坤";

  return (
    <footer className="border-t border-border bg-bg-muted/50">
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-fg-muted">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-fg">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              <span>{siteName}</span>
            </div>
            <p className="text-xs">
              © {year} {siteName} · Built by 黑 (Hei) · 主题: {defaultTheme}
            </p>
            <p className="text-xs">
              本站内容采用{" "}
              <a
                href={siteLicenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-fg"
              >
                {siteLicense}
              </a>{" "}
              授权 · © {year} {copyrightHolder} · 保留所有权利{" "}
              <Link href="/copyright" className="underline transition-colors hover:text-fg">
                · 版权声明
              </Link>
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="https://github.com/blackclaw0318/obsidian-journal"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-fg"
            >
              GitHub
            </Link>
            <span className="opacity-30">·</span>
            <Link href="/rss.xml" className="transition-colors hover:text-fg">
              RSS
            </Link>
            <span className="opacity-30">·</span>
            <Link href="/feed.xml" className="transition-colors hover:text-fg">
              Atom
            </Link>
            <span className="opacity-30">·</span>
            <Link href="/sitemap.xml" className="transition-colors hover:text-fg">
              Sitemap
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}