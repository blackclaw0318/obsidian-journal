// ============================================================
// /copyright - 独立版权声明页 (v0.38 P5.5)
//  - 整站版权 + 内容版权 + AIGC + 免责 + 联系 (5 段)
//  - 内容从 SiteConfig.copyright_page_md 读 (admin 可编辑)
//  - 空时用 DEFAULT_COPYRIGHT_MD 兜底
//  - v0.38 P7: 上面显示 License / Holder / AIGC 开关 (3 卡)
// ============================================================
import Link from "next/link";
import MarkdownIt from "markdown-it";
import { siteConfigRepo } from "@/lib/repo";

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

const DEFAULT_COPYRIGHT_MD = `# 版权声明

最后更新: 2026-07-08

## 1. 整站版权

本站 (\`黑曜石日志\`) 的源代码、UI 设计、原创 logo、原创插图由 © 2026 上坤 创作,
采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 授权。

## 2. 文章/章节内容版权

本站发布的所有文章、小说章节、翻译内容同样采用 CC BY-NC-SA 4.0 授权:

- **允许**: 转载、引用、改编 (注明出处即可)
- **不允许**: 商业使用、署名删除
- **强制**: 转载需保留原作者 (上坤) + 永久链接 + 同样协议

## 3. AI 辅助生成声明 (AIGC Disclosure)

本站小说 (《元界》《玻璃海》等) 由 AI (minimax M3 + image-01) 辅助生成,经人工审核后发布。

- 故事设定 / 人物 / 大纲: 人工设计
- 章节正文: AI 写作 + 人工润色
- 封面图: AI 生成 + 人工挑选

⚠️ 内容不代表 100% 事实,仅供参考。

## 4. 免责声明

- 本站内容不构成任何投资 / 法律 / 医疗建议
- AI 生成内容可能存在事实错误,老板会在评论区更正
- 引用第三方内容已尽量注明出处,如有侵权请联系删除 (见下方联系)

## 5. 联系

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
  const aigcEnabled = (config?.aigc_disclosure ?? 1) === 1;
  const contactEmail = config?.contact_email ?? "";
  const customMd = config?.copyright_page_md ?? "";

  const mdSource = customMd.trim() ? customMd : DEFAULT_COPYRIGHT_MD;
  const rendered = md.render(mdSource);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">版权声明</h1>
        <p className="text-sm text-fg-muted">
          Copyright · License · AI Disclosure · Disclaimer
        </p>
      </header>

      {/* 3 卡概览 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-fg-muted">
            AI Disclosure
          </div>
          <div className="text-sm font-medium">
            {aigcEnabled ? "✅ 标识" : "❌ 不标识"}
          </div>
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