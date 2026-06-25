import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { postRepo, siteConfigRepo } from "@/lib/repo";
import { formatDate, formatCount } from "@/lib/utils";
import { absoluteUrl, canonical, jsonLdArticle } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  const ogImage = post.cover_image ? [absoluteUrl(post.cover_image)] : undefined;
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

  // 累加 view (v0.3 §23: 防刷逻辑 Phase 4 加)
  postRepo.incrementView(post.id);

  const ldJson = site ? jsonLdArticle({ post, site }) : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      {ldJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson }}
        />
      )}
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-xs text-fg-muted">
          <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
            {post.category}
          </span>
          {post.published_at && <time dateTime={new Date(post.published_at * 1000).toISOString()}>{formatDate(new Date(post.published_at * 1000))}</time>}
          <span>·</span>
          <span>{formatCount(post.view_count + 1)} 阅读</span>
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">{post.title}</h1>
        {post.excerpt && (
          <p className="text-lg text-fg-muted">{post.excerpt}</p>
        )}
        <div className="mt-4 text-sm text-fg-muted">
          作者: {post.author.name ?? post.author.email}
        </div>
      </header>

      {/* Markdown 渲染: P2 换 react-markdown + remark-gfm, P1 简单按行渲染 */}
      <div className="prose">
        {post.content.split("\n").map((line, idx) => {
          if (line.startsWith("# ")) return null; // 标题已在 header
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx}>{line.replace(/^## /, "")}</h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx}>{line.replace(/^### /, "")}</h3>
            );
          }
          if (line.trim().startsWith("- ")) {
            return (
              <ul key={idx}>
                <li>{line.replace(/^- /, "")}</li>
              </ul>
            );
          }
          if (line.trim() === "") return null;
          return <p key={idx}>{line}</p>;
        })}
      </div>
    </article>
  );
}
