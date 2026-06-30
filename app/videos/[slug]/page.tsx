// ============================================================
// /videos/[slug] - 视频详情 (v0.12, v0.6.1 §8)
// 渲染 video embed (iframe for B站/YouTube) + metadata
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { videoRepo, videoSeriesRepo, siteConfigRepo } from "@/lib/repo";
import { formatDate, formatCount } from "@/lib/utils";
import { absoluteUrl, canonical, jsonLdVideo } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const v = videoRepo.bySlug(params.slug);
  if (!v || v.status !== "published") return { title: "未找到" };
  return {
    title: v.title,
    description: v.description ?? undefined,
    alternates: { canonical: canonical(`/videos/${v.slug}`) },
    openGraph: {
      type: "video.other",
      title: v.title,
      description: v.description ?? undefined,
      url: absoluteUrl(`/videos/${v.slug}`),
      locale: "zh_CN"
    }
  };
}

// 简单判断 embed URL 类型 (B 站 / YouTube / 其他)
function detectEmbed(url: string): { type: "bilibili" | "youtube" | "iframe"; src: string } {
  // B 站 BV 号 / av 号
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch) return { type: "bilibili", src: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0` };
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return { type: "youtube", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  // 其他 → iframe 原 URL
  return { type: "iframe", src: url };
}

export default function VideoDetailPage({ params }: Props) {
  const video = videoRepo.bySlug(params.slug);
  if (!video || video.status !== "published") notFound();
  const site = siteConfigRepo.get();
  const series = video.series_id ? videoSeriesRepo.byId(video.series_id) : null;
  videoRepo.incrementView(video.id);

  const ldJson = site ? jsonLdVideo(video, site) : null;
  const embed = detectEmbed(video.embed_url);

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      {ldJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />}

      <header className="mb-6">
        <div className="mb-2 text-sm">
          <Link href="/videos" className="text-fg-muted hover:text-fg">← 视频列表</Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">{video.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          {series && (
            <span className="rounded bg-bg-muted px-2 py-0.5">{series.title}</span>
          )}
          {video.published_at && <span>{formatDate(new Date(video.published_at * 1000))}</span>}
          <span>·</span>
          <span>{formatCount(video.view_count + 1)} 播放</span>
        </div>
      </header>

      {/* embed 区域: 16:9 响应式 iframe */}
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded border border-border bg-black">
        <iframe
          src={embed.src}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={video.title}
        />
      </div>

      {video.description && (
        <div className="prose prose-zinc max-w-none dark:prose-invert">
          <p>{video.description}</p>
        </div>
      )}
    </article>
  );
}
