// ============================================================
// Feed 生成器 (Phase 2.4, v0.6.1 schema 严守)
// Atom 1.0 + RSS 2.0 双格式
// ============================================================
//
// 数据源:
//   - postRepo.list({ status: "published", limit: 20 }) — 严守 v0.6.1 PostCategory
//   - siteConfigRepo.get() — 严守 v0.6.1 SiteConfig schema
//
// 参考:
//   - RFC 4287 (Atom 1.0)
//   - RSS 2.0 Specification (https://www.rssboard.org/rss-specification)
// ============================================================

import type { PostWithAuthor, SiteConfig } from "./types";

const ATOM_NS = "http://www.w3.org/2005/Atom";
const CONTENT_NS = "http://purl.org/rss/1.0/modules/content/";

/**
 * XML 文本转义 (5 个预定义实体)
 * https://www.w3.org/TR/xml/#sec-predefined-ent
 */
export function escapeXml(input: string | null | undefined): string {
  if (input == null) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 友好属性转义 (用于 href, src 等;不转义 ')
 */
export function escapeAttr(input: string | null | undefined): string {
  if (input == null) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * unix timestamp (秒) → ISO 8601 (Atom/RSS 标准)
 * 0 或 null → 1970-01-01T00:00:00Z (Atom 要求 updated 必填)
 */
export function toIso(timestamp: number | null | undefined): string {
  if (!timestamp || timestamp <= 0) return "1970-01-01T00:00:00.000Z";
  return new Date(timestamp * 1000).toISOString();
}

/**
 * tag URI (RFC 4151) — Atom 要求 id 是永久 URI
 * 用 siteUrl + /posts/{slug} 形式
 */
export function entryId(siteUrl: string, slug: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `tag:${base.replace(/^https?:\/\//, "")},${new Date().getFullYear()}:/posts/${slug}`;
}

/**
 * Atom 1.0 feed
 * RFC 4287: feed 必须有 id, title, updated
 */
export function buildAtomFeed(opts: {
  site: SiteConfig;
  siteUrl: string;
  posts: PostWithAuthor[];
}): string {
  const { site, siteUrl, posts } = opts;
  const updated = posts.length > 0
    ? toIso(Math.max(...posts.map((p) => p.published_at ?? p.created_at ?? 0)))
    : toIso(site.updated_at);

  const entries = posts
    .map((p) => {
      const url = `${siteUrl.replace(/\/+$/, "")}/posts/${p.slug}`;
      const eid = entryId(siteUrl, p.slug);
      const pub = toIso(p.published_at);
      const upd = toIso(p.updated_at);
      return `  <entry>
    <id>${escapeXml(eid)}</id>
    <title>${escapeXml(p.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeAttr(url)}" />
    <published>${pub}</published>
    <updated>${upd}</updated>
    <author>
      <name>${escapeXml(p.author.name ?? p.author.email)}</name>
      ${p.author.email ? `<email>${escapeXml(p.author.email)}</email>` : ""}
    </author>
    <category term="${escapeXml(p.category)}" label="${escapeXml(p.category)}" />
    ${p.excerpt ? `<summary type="text">${escapeXml(p.excerpt)}</summary>` : ""}
    <content type="text" xml:lang="zh-CN">${escapeXml(p.content)}</content>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="${ATOM_NS}" xml:lang="zh-CN">
  <id>${escapeXml(siteUrl)}/</id>
  <title>${escapeXml(site.site_name)}</title>
  <subtitle>${escapeXml(site.site_tagline)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeAttr(siteUrl)}/feed.xml" />
  <link rel="alternate" type="text/html" href="${escapeAttr(siteUrl)}/" />
  <updated>${updated}</updated>
  <generator uri="https://github.com/blackclaw0318/obsidian-journal" version="0.6.1">obsidian-journal</generator>
  <rights>© ${new Date().getFullYear()} ${escapeXml(site.site_name)}</rights>
${entries}
</feed>
`;
}

/**
 * RSS 2.0 feed
 * 必填: title, link, description
 */
export function buildRssFeed(opts: {
  site: SiteConfig;
  siteUrl: string;
  posts: PostWithAuthor[];
}): string {
  const { site, siteUrl, posts } = opts;
  const lastBuildDate = toIso(site.updated_at);

  const items = posts
    .map((p) => {
      const url = `${siteUrl.replace(/\/+$/, "")}/posts/${p.slug}`;
      const pub = toIso(p.published_at);
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeAttr(url)}</link>
      <guid isPermaLink="true">${escapeAttr(url)}</guid>
      <pubDate>${new Date(p.published_at ? p.published_at * 1000 : Date.now()).toUTCString()}</pubDate>
      <author>${escapeXml(p.author.email)} (${escapeXml(p.author.name ?? p.author.email)})</author>
      <category>${escapeXml(p.category)}</category>
      <description>${escapeXml(p.excerpt ?? p.content.slice(0, 200))}</description>
      <content:encoded><![CDATA[${(p.content ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="${CONTENT_NS}" xmlns:atom="${ATOM_NS}">
  <channel>
    <title>${escapeXml(site.site_name)}</title>
    <link>${escapeAttr(siteUrl)}/</link>
    <atom:link href="${escapeAttr(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(site.site_tagline)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>obsidian-journal 0.6.1</generator>
${items}
  </channel>
</rss>
`;
}
