// /videos 路由 (v0.6.1 schema: VideoSeries + Video 独立 model)
import Link from "next/link";
import type { Metadata } from "next";
import { videoSeriesRepo, videoRepo, siteConfigRepo } from "@/lib/repo";
import { absoluteUrl, canonical, jsonLdVideo } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "视频",
    description: "黑曜石日志 视频 (v0.6.1: VideoSeries + Video 独立 model)",
    alternates: { canonical: canonical("/videos") },
    openGraph: {
      type: "website",
      title: "视频",
      description: "黑曜石日志 视频",
      url: absoluteUrl("/videos"),
      locale: "zh_CN"
    }
  };
}

export default function VideosPage() {
  const series = videoSeriesRepo.list();
  const allVideos = videoRepo.list();
  const publishedVideos = allVideos.filter((v) => v.status === "published");
  const site = siteConfigRepo.get();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">🎬 视频</h1>
        <p className="text-fg-muted mt-2">视频系列 + 单集 (v0.6.1 独立 model)</p>
      </header>

      {/* JSON-LD: ItemList of VideoObject (schema.org) */}
      {site && publishedVideos.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: publishedVideos.map((v, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: site ? jsonLdVideo(v, site) : undefined
              }))
            })
          }}
        />
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">系列 ({series.length})</h2>
        {series.length === 0 ? (
          <p className="text-fg-muted">暂无视频系列。</p>
        ) : (
          <ul className="space-y-4">
            {series.map((s) => (
              <li key={s.id} className="border-b border-border pb-4">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                {s.description && <p className="text-fg-muted mt-1">{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">已发布单集 ({publishedVideos.length})</h2>
        {publishedVideos.length === 0 ? (
          <p className="text-fg-muted">暂无已发布视频。</p>
        ) : (
          <ul className="space-y-3">
            {publishedVideos.map((v) => (
              <li key={v.id} className="border-b border-border pb-3">
                <span className="font-medium">{v.title}</span>
                {v.description && <p className="text-sm text-fg-muted mt-1">{v.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 pt-6 border-t border-border text-sm">
        <Link href="/" className="hover:underline">← 返回首页</Link>
      </footer>
    </div>
  );
}
