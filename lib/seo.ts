// ============================================================
// SEO 工具 (Phase 2.3, v0.6.1 schema 严守)
//  - canonical / og:url 计算
//  - JSON-LD: Article / Book / VideoObject (schema.org)
//  - 严守 v0.6.1: PostCategory ∈ {tech, life}; Novel/Video 独立 model
// ============================================================

import type { PostWithAuthor, Novel, Video, SiteConfig } from "./types";

/** 站点 base URL, 严守 env 优先 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** 拼绝对 URL, 严防 // 双斜杠 */
export function absoluteUrl(path: string): string {
  const base = siteUrl().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** canonical link */
export function canonical(path: string): string {
  return absoluteUrl(path);
}

/**
 * OG Image fallback 链 (v0.31 P2-21 兑现)
 * 优先: 本页面的 cover_image (article/video/novel 各自有)
 * 次选: SiteConfig.og_image (管理员上传的站点默认 OG 图)
 * 末选: SiteConfig.avatar_url (P2-21 默认行为, 头像当 OG 图用)
 * 返回: undefined 表示不设 og:image (交由 Next.js 平台默认值)
 */
export function getOgImage(
  cover: string | null | undefined,
  site: SiteConfig | null
): string[] | undefined {
  const fallback = site?.og_image ?? site?.avatar_url ?? null;
  const url = cover || fallback;
  return url ? [absoluteUrl(url)] : undefined;
}

/**
 * JSON-LD: Article (schema.org)
 * 严守: PostCategory ∈ {tech, life}, 不写 novel/video/media
 */
export function jsonLdArticle(opts: {
  post: PostWithAuthor;
  site: SiteConfig;
}): string {
  const { post, site } = opts;
  const url = absoluteUrl(`/posts/${post.slug}`);
  const author = post.author;
  const tags = post.tags
    ? post.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: getOgImage(post.cover_image, site),
    datePublished: post.published_at ? new Date(post.published_at * 1000).toISOString() : undefined,
    dateModified: post.updated_at ? new Date(post.updated_at * 1000).toISOString() : undefined,
    inLanguage: "zh-CN",
    articleSection: post.category, // 'tech' | 'life', 严守 v0.6.1
    keywords: tags.length > 0 ? tags.join(", ") : undefined,
    wordCount: post.content.length,
    url,
    isPartOf: {
      "@type": "Blog",
      "@id": absoluteUrl("/"),
      name: site.site_name
    },
    author: {
      "@type": "Person",
      name: author.name ?? author.email,
      email: author.email
    },
    publisher: {
      "@type": "Organization",
      name: site.site_name,
      url: absoluteUrl("/")
    }
  });
}

/**
 * JSON-LD: Book (schema.org) — Novel 独立 model (Q11 双层)
 */
export function jsonLdBook(novel: Novel, volumeCount: number, chapterCount: number): string {
  const url = absoluteUrl(`/novels/${novel.slug}`);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": url,
    name: novel.title,
    description: novel.description ?? undefined,
    image: getOgImage(novel.cover_image, null),
    inLanguage: "zh-CN",
    url,
    bookFormat: "EBook",
    numberOfPages: chapterCount,
    isPartOf: {
      "@type": "BookSeries",
      name: novel.title,
      numberOfBooks: volumeCount
    }
  });
}

/**
 * JSON-LD: VideoObject (schema.org) — Video 独立 model
 */
export function jsonLdVideo(video: Video, site: SiteConfig): string {
  const url = absoluteUrl(`/videos/${video.slug}`);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": url,
    name: video.title,
    description: video.description ?? undefined,
    thumbnailUrl: getOgImage(video.cover_image, site),
    uploadDate: video.published_at ? new Date(video.published_at * 1000).toISOString() : undefined,
    duration: video.duration ? `PT${video.duration}S` : undefined,
    embedUrl: video.embed_url,
    inLanguage: "zh-CN",
    url,
    isPartOf: {
      "@type": "Blog",
      "@id": absoluteUrl("/"),
      name: site.site_name
    }
  });
}

/**
 * JSON-LD: WebSite (首页 + 站点级搜索)
 */
export function jsonLdWebSite(site: SiteConfig): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/"),
    name: site.site_name,
    description: site.site_tagline,
    inLanguage: "zh-CN",
    url: absoluteUrl("/"),
    publisher: {
      "@type": "Organization",
      name: site.site_name,
      url: absoluteUrl("/")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/posts")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  });
}
