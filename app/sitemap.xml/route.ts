// ============================================================
// /sitemap.xml — 站点地图 (Phase 2.3 SEO, v0.6.1 schema 严守)
//  - Post (PostCategory ∈ {tech, life}) + Novel + Video + 静态页
//  - lastmod: post.updated_at / novel.updated_at
//  - 严守: 不包含 admin / next internals / drafts
// ============================================================

import { postRepo, novelRepo, videoRepo, siteConfigRepo } from "@/lib/repo";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  { path: "/",        changefreq: "daily",  priority: 1.0 },
  { path: "/posts",   changefreq: "daily",  priority: 0.9 },
  { path: "/novels",  changefreq: "weekly", priority: 0.8 },
  { path: "/videos",  changefreq: "weekly", priority: 0.7 },
  { path: "/media",   changefreq: "monthly", priority: 0.5 },
  { path: "/feed.xml", changefreq: "daily",  priority: 0.6 },
  { path: "/rss.xml",  changefreq: "daily",  priority: 0.6 }
];

export async function GET() {
  const site = siteConfigRepo.get();
  const now = new Date().toISOString();

  const posts = postRepo.list({ status: "published", limit: 500 });
  const novels = novelRepo.list();
  const videos = videoRepo.list().filter((v) => v.status === "published");

  // 静态页
  const staticEntries = STATIC_PAGES
    .map(
      (p) =>
        `  <url>
    <loc>${absoluteUrl(p.path)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");

  // Post: 严守 status=published, PostCategory ∈ {tech, life}
  const postEntries = posts
    .map((p) => {
      const lastmod = new Date((p.updated_at ?? p.published_at ?? 0) * 1000).toISOString();
      return `  <url>
    <loc>${absoluteUrl(`/posts/${p.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("\n");

  // Novel: 独立 model (Q11)
  const novelEntries = novels
    .map((n) => {
      const lastmod = new Date((n.updated_at ?? n.created_at) * 1000).toISOString();
      return `  <url>
    <loc>${absoluteUrl(`/novels/${n.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("\n");

  // Video: 独立 model
  const videoEntries = videos
    .map((v) => {
      const lastmod = new Date((v.updated_at ?? v.published_at ?? v.created_at) * 1000).toISOString();
      return `  <url>
    <loc>${absoluteUrl(`/videos/${v.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${postEntries}
${novelEntries}
${videoEntries}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600"
    }
  });
}
