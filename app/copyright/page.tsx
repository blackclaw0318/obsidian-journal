// ============================================================
// /copyright - 独立版权声明页 (v0.40 精简)
//  - 整站版权 + 内容版权 + 免责 + 联系 (4 段, 去 AIGC)
//  - 内容从 SiteConfig.copyright_page_md 读 (admin 可编辑)
//  - 空时用 DEFAULT_COPYRIGHT_MD 兜底
//  - v0.38 P7: 上面显示 License / Holder (2 卡, 去 AIGC 卡)
//  - v0.40 老板拍: 移除 AIGC 披露 (Footer 已有 License 一行)
// ============================================================
import Link from "next/link";
import MarkdownIt from "markdown-it";
import { siteConfigRepo } from "@/lib/repo";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

const DEFAULT_COPYRIGHT_MD = `# 版权声明

最后更新: 2026-07-10

## 1. 整站版权

本站 (\`黑曜石日志\`) 的源代码、UI 设计、原创 logo、原创插图由 © 2026 上坤 创作,
采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 授权。

## 2. 文章/章节内容版权

本站发布的所有文章、小说章节、翻译内容同样采用 CC BY-NC-SA 4.0 授权:

- **允许**: 转载、引用、改编 (注明出处即可)
- **不允许**: 商业使用、署名删除
- **强制**: 转载需保留原作者 (上坤) + 永久链接 + 同样协议

## 3. 免责声明

- 本站内容不构成任何投资 / 法律 / 医疗建议
- 引用第三方内容已尽量注明出处,如有侵权请联系删除 (见下方联系)

## 4. 联系

- GitHub: <https://github.com/blackclaw0318>
- 邮箱: (请在 admin 后台"站点设置 → 版权设置"中填入)
`;

export const dynamic = "force-dynamic";

export default function CopyrightPage() {
  const config = siteConfigRepo.get();
  const siteLicense = config?.site_license ?? "CC BY-NC-SA 4.0";
  const siteLicenseUrl =
    config?.site_license_url ?? "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  const copyrightHolder = config?.copyright_holder ?? "上坤";
  const contactEmail = config?.contact_email ?? "";
  const customMd = config?.copyright_page_md ?? "";

  const mdSource = customMd.trim() ? customMd : DEFAULT_COPYRIGHT_MD;
  const rendered = md.render(mdSource);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">版权声明</h1>
        <p className="text-sm text-fg-muted">
          Copyright · License · Disclaimer
        </p>
      </header>

      {/* 2 卡概览 (v0.40 去 AIGC 卡) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-fg-muted">
            License
          </div>
          <a
            href={siteLicenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline transition-colors hover:text-accent"
          >
            {siteLicense}
          </a>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-fg-muted">
            Copyright Holder
          </div>
          <div className="text-sm font-medium">{copyrightHolder}</div>
        </div>
        
      </div>

      {/* Markdown 渲染 */}
      <div
        className="prose prose-zinc max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />

      {/* 联系信息补全 */}
      {contactEmail && (
        <div className="mt-8 rounded border-l-4 border-accent/40 bg-bg-muted/30 p-4 text-sm">
          联系邮箱:{" "}
          <a href={`mailto:${contactEmail}`} className="underline">
            {contactEmail}
          </a>
        </div>
      )}

      <div className="mt-12 border-t border-border pt-6 text-sm text-fg-muted">
        <Link href="/" className="underline transition-colors hover:text-fg">
          ← 返回首页
        </Link>
      </div>
    </article>
  );
}