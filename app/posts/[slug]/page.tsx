// ============================================================
// /posts/[slug] - 文章详情 (v0.20 D 升级)
//  - 严守 v0.6.1: PostCategory ∈ {tech, life}, articleSection 跟随
//  - Markdown 渲染: markdown-it + DOMPurify (与 chapters 风格对齐)
//    (v0.12 之前用 P1 简陋行解析, 现统一升级)
//  - view_count 防刷: 同 IP + slug + 24h 仅 +1 (cookie 标记)
// ============================================================
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";
import { postRepo, siteConfigRepo } from "@/lib/repo";
import { formatDate } from "@/lib/utils";
import { absoluteUrl, canonical, jsonLdArticle, getOgImage } from "@/lib/seo";
import { ViewCounter } from "@/components/ViewCounter";
import { MarkdownReveal } from "@/components/MarkdownReveal";


export const dynamic = "force-dynamic";

// Markdown 渲染器 (实例化一次, 全局复用; 与 chapters/[slug] 同实例配置)
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

/** 生成阅读时长 (分钟, 向上取整) */
function readingTimeMin(text: string): number {
  // 中文按字计, 英文按词计, 平均每分钟 300 字
  const cnChars = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const enWords = (text.replace(/[\u4e00-\u9fa5]/g, " ").match(/[a-zA-Z]+/g) ?? []).length;
  return Math.max(1, Math.ceil((cnChars + enWords) / 300));
}

/**
 * generateMetadata (Next.js App Router)
 * 严守 v0.6.1: PostCategory ∈ {tech, life}, articleSection 跟随
 */
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = postRepo.bySlug(params.slug);
  if (!post || post.status !== "published") {
    return { title: "未找到文章" };
  }
  const site = siteConfigRepo.get();
  const url = absoluteUrl(`/posts/${post.slug}`);
  const ogImage = getOgImage(post.cover_image, site);
  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    keywords: tags,
    alternates: { canonical: canonical(`/posts/${post.slug}`) },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      url,
      siteName: site?.site_name ?? "黑曜石日志",
      locale: "zh_CN",
      publishedTime: post.published_at ? new Date(post.published_at * 1000).toISOString() : undefined,
      modifiedTime: post.updated_at ? new Date(post.updated_at * 1000).toISOString() : undefined,
      authors: [post.author.name ?? post.author.email],
      tags,
      images: ogImage
    },
    twitter: {
      card: post.cover_image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: ogImage
    }
  };
}

export default function PostDetailPage({ params }: { params: { slug: string } }) {
  const post = postRepo.bySlug(params.slug);
  const site = siteConfigRepo.get();

  if (!post || post.status !== "published") {
    notFound();
  }

  // view_count: 已迁到 <ViewCounter /> 客户端组件 + POST /api/posts/[slug]/view 防刷
  // (v0.21.1 P1-13 — RSC 里 setCookie 不方便, 改 client 调用)

  const ldJson = site ? jsonLdArticle({ post, site }) : null;

  // Markdown 渲染 + DOMPurify 清洗 (防御 XSS, 即便 allowCustomHtml 关)
  const rawHtml = md.render(post.content);
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true }
  });

  const readMin = readingTimeMin(post.content);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      {ldJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson }}
        />
      )}
      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
            {post.category}
          </span>
          {post.published_at && (
            <time dateTime={new Date(post.published_at * 1000).toISOString()}>
              {formatDate(new Date(post.published_at * 1000))}
            </time>
          )}
          <span aria-hidden>·</span>
          <ViewCounter type="posts" slug={post.slug} initialCount={post.view_count} />
          <span aria-hidden>·</span>
          <span>约 {readMin} 分钟</span>
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
        {post.excerpt && (
          <p className="text-base text-fg-muted sm:text-lg">{post.excerpt}</p>
        )}
        <div className="mt-4 text-sm text-fg-muted">
          作者: {post.author.name ?? post.author.email}
        </div>
      </header>

      {/* Markdown 渲染: v0.20 D 升级, 与 chapters 风格一致
          严守 globals.css 的 .prose 样式 (无 typography 插件, 自定义)
          v0.21 P1-8: MarkdownReveal 包裹, 逐 block 视口渐入 + stagger */}
      <MarkdownReveal
        html={safeHtml}
        className="prose prose-zinc max-w-none dark:prose-invert"
      />

      
    </article>
  );
}