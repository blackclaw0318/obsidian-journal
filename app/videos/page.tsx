// ============================================================
// /videos - 视频列表 (v0.12, v0.6.1; v0.33 P0-3 卡片化)
//  - Series 列表 (顶部)
//  - 已发布单集 grid (card form, 含 cover + duration + link)
// ============================================================
import type { Metadata } from "next";
import { videoSeriesRepo, videoRepo, siteConfigRepo } from "@/lib/repo";
import { absoluteUrl, canonical, jsonLdVideo } from "@/lib/seo";
import { VideoCard } from "./_components/VideoCard";

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

  // series map for badge lookup
  const seriesMap = new Map(series.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">🎬 视频</h1>
        <p className="mt-2 text-fg-muted">视频系列 + 单集 (v0.6.1 独立 model)</p>
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

      {/* 系列 */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">系列 ({series.length})</h2>
        {series.length === 0 ? (
          <p className="text-fg-muted">暂无视频系列。</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-bg-card p-4"
                data-testid="video-series-card"
              >
                <h3 className="truncate text-lg font-semibold" title={s.title}>{s.title}</h3>
                {s.description && (
                  <p className="mt-1 line-clamp-3 text-sm text-fg-muted">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 单集 (已发布) */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">已发布单集 ({publishedVideos.length})</h2>
        {publishedVideos.length === 0 ? (
          <p className="text-fg-muted">暂无已发布视频。</p>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="videos-grid"
          >
            {publishedVideos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                seriesTitle={v.series_id ? seriesMap.get(v.series_id)?.title : null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
