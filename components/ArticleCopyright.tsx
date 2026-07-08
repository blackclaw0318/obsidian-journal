// ============================================================
// ArticleCopyright - 文章/章节/小说末尾版权块 (v0.38 P5.5)
//  - type: post / chapter / novel (决定永久链接路径)
//  - 读 SiteConfig.aigc_disclosure / site_license / copyright_holder
//  - server component (无交互)
// ============================================================

import Link from "next/link";
import { siteConfigRepo } from "@/lib/repo";

export type ArticleCopyrightType = "post" | "chapter" | "novel";

export function ArticleCopyright({
  type,
  slug,
}: {
  type: ArticleCopyrightType;
  slug: string;
}) {
  const config = siteConfigRepo.get();
  const year = new Date().getFullYear();
  const siteLicense = config?.site_license ?? "CC BY-NC-SA 4.0";
  const siteLicenseUrl =
    config?.site_license_url ?? "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  const copyrightHolder = config?.copyright_holder ?? "上坤";
  const aigcEnabled = (config?.aigc_disclosure ?? 1) === 1;

  const permalinkPrefix = type === "chapter" ? "/chapters/" : type === "novel" ? "/novels/" : "/posts/";
  const permalink = `${permalinkPrefix}${slug}`;

  return (
    <div className="mt-12 space-y-2 border-t border-border pt-6 text-xs text-fg-muted">
      {aigcEnabled && (
        <p>
          ⚠️ <strong>AI 辅助生成声明</strong>:本站小说 / 配图由 AI (minimax M3 + image-01)
          辅助生成,经人工审核后发布。内容仅供参考,不构成投资 / 法律 / 医疗建议。
        </p>
      )}
      <p>
        版权: © {year} {copyrightHolder} · 采用{" "}
        <a
          href={siteLicenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-fg"
        >
          {siteLicense}
        </a>{" "}
        授权 · 转载需注明出处
      </p>
      <p>
        永久链接:{" "}
        <Link href={permalink} className="underline transition-colors hover:text-fg">
          {permalink}
        </Link>
        {" · "}
        <Link href="/copyright" className="underline transition-colors hover:text-fg">
          完整版权声明
        </Link>
      </p>
    </div>
  );
}