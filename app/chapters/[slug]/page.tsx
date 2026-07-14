// ============================================================
// /chapters/[slug] - 章节详情 (v0.12, v0.6.1 §8)
// 渲染章节内容 (Markdown) + 上下章导航
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MarkdownIt from "markdown-it";
import { chapterRepo, siteConfigRepo, volumeRepo, novelRepo, chapterRepo as chRepo } from "@/lib/repo";
import { formatCount, formatDate } from "@/lib/utils";
import { absoluteUrl, canonical } from "@/lib/seo";
import { stripFrontmatter } from "@/lib/utils";
import { MarkdownReveal } from "@/components/MarkdownReveal";


export const dynamic = "force-dynamic";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const ctx = chapterRepo.bySlugWithContext(params.slug);
  if (!ctx) return { title: "未找到" };
  const { chapter, novel, volume } = ctx;
  const html = md.render(chapter.content.slice(0, 200));
  return {
    title: `${novel.title} - 第 ${volume.order} 卷 · 第 ${chapter.order} 章 ${chapter.title}`,
    description: chapter.excerpt ?? html.replace(/<[^>]+>/g, "").slice(0, 160),
    alternates: { canonical: canonical(`/chapters/${chapter.slug}`) },
    openGraph: {
      type: "article",
      title: chapter.title,
      description: chapter.excerpt ?? undefined,
      url: absoluteUrl(`/chapters/${chapter.slug}`),
      locale: "zh_CN",
      publishedTime: chapter.published_at ? new Date(chapter.published_at * 1000).toISOString() : undefined
    }
  };
}

export default function ChapterDetailPage({ params }: Props) {
  const ctx = chapterRepo.bySlugWithContext(params.slug);
  if (!ctx) notFound();
  const { chapter, volume, novel } = ctx;
  const site = siteConfigRepo.get();
  chapterRepo.incrementView(chapter.id);

  // 上下章
  const siblings = chapterRepo.byVolume(volume.id).filter((c) => c.published);
  const idx = siblings.findIndex((c) => c.id === chapter.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const html = md.render(stripFrontmatter(chapter.content));

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <div className="mb-3 text-sm">
          <Link href="/novels" className="text-fg-muted hover:text-fg">小说</Link>
          <span className="mx-1 text-fg-muted">/</span>
          <Link href={`/novels/${novel.slug}`} className="text-fg-muted hover:text-fg">{novel.title}</Link>
          <span className="mx-1 text-fg-muted">/</span>
          <Link href={`/novels/${novel.slug}/volume-${volume.order}`} className="text-fg-muted hover:text-fg">
            第 {volume.order} 卷 · {volume.title}
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">{chapter.title}</h1>
        <div className="text-sm text-fg-muted">
          第 {chapter.order} 章 · {chapter.published_at ? formatDate(new Date(chapter.published_at * 1000)) : "未发布"} · {formatCount(chapter.view_count + 1)} 阅读
        </div>
      </header>

      {chapter.excerpt && (
        <div className="mb-6 rounded border-l-4 border-accent/40 bg-bg-muted/30 p-4 italic text-fg-muted">
          {chapter.excerpt}
        </div>
      )}

      {/* Markdown 渲染 + v0.21 P1-8 逐 block 视口渐入 (与 posts/[slug] 一致) */}
      <MarkdownReveal
        html={html}
        className="prose prose-zinc max-w-none dark:prose-invert"
      />

      <nav className="mt-12 flex items-center justify-between border-t border-border pt-6">
        {prev ? (
          <Link href={`/chapters/${prev.slug}`} className="rounded border border-border bg-bg-card px-4 py-2 text-sm transition hover:border-accent/40">
            ← 上一章 · {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/chapters/${next.slug}`} className="rounded border border-border bg-bg-card px-4 py-2 text-sm transition hover:border-accent/40">
            下一章 · {next.title} →
          </Link>
        ) : <span />}
      </nav>

      
    </article>
  );
}
