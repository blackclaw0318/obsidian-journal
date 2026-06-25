// ============================================================
// /robots.txt (Phase 2.3 SEO)
// ============================================================

import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = `# obsidian-journal robots.txt
# 严守 v0.6.1 schema: 公开博客, 全允许爬, 仅禁 /admin

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /_next/

# 站点地图
Sitemap: ${absoluteUrl("/sitemap.xml")}

# 爬取节奏 (软规则, 多数爬虫会尊重)
Crawl-delay: 1
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
