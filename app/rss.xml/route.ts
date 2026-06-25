// ============================================================
// /rss.xml — RSS 2.0
// Phase 2.4 RSS 实施 (v0.6.1 schema 严守, 与 /feed.xml Atom 并存)
// ============================================================

import { postRepo, siteConfigRepo } from "@/lib/repo";
import { buildRssFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const site = siteConfigRepo.get();
  if (!site) {
    return new Response("SiteConfig not initialized", { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = postRepo.list({ status: "published", limit: 20 });
  const xml = buildRssFeed({ site, siteUrl, posts });
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600"
    }
  });
}
