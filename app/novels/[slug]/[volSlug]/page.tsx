// ============================================================
// /novels/[slug]/[volSlug] - 卷详情 (v0.12)
// 展示卷 metadata + 该卷所有已发布章节
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { novelRepo, volumeRepo, siteConfigRepo } from "@/lib/repo";
import { formatCount } from "@/lib/utils";
import { absoluteUrl, canonical } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string; volSlug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const n = novelRepo.bySlugWithVolumes(params.slug);
  if (!n) return { title: "未找到" };
  // volSlug 可能是 "volume-N" 或真 slug
  const orderMatch = params.volSlug.match(/^volume-(\d+)$/);
  const v = orderMatch ? n.volumes.find((x) => x.order === parseInt(orderMatch[1])) : null;
  if (!v) return { title: "未找到" };
  return {
    title: `${n.title} - 第 ${v.order} 卷 · ${v.title}`,
    description: v.description ?? `${n.title} 第 ${v.order} 卷 ${v.title}`,
    alternates: { canonical: canonical(`/novels/${n.slug}/${params.volSlug}`) },
    openGraph: {
      type: "book",
      title: `${n.title} - ${v.title}`,
      description: v.description ?? undefined,
      url: absoluteUrl(`/novels/${n.slug}/${params.volSlug}`),
      locale: "zh_CN"
    }
  };
}

export default function VolumeDetailPage({ params }: Props) {
  const novel = novelRepo.bySlugWithVolumes(params.slug);
  if (!novel) notFound();
  // 解析 volSlug → volume
  const orderMatch2 = params.volSlug.match(/^volume-(\d+)$/);
  const volume = orderMatch2 ? novel.volumes.find((v) => v.order === parseInt(orderMatch2[1])) : null;
  if (!volume) notFound();
  const site = siteConfigRepo.get();
  const liveChapters = volume.chapters.filter((c) => c.published);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <div className="mb-3 text-sm">
          <Link href="/novels" className="text-fg-muted hover:text-fg">小说</Link>
          <span className="mx-1 text-fg-muted">/</span>
          <Link href={`/novels/${novel.slug}`} className="text-fg-muted hover:text-fg">{novel.title}</Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">第 {volume.order} 卷 · {volume.title}</h1>
        {volume.description && <p className="text-fg-muted">{volume.description}</p>}
        <div className="mt-3 text-sm text-fg-muted">{liveChapters.length} 章已发布</div>
      </header>

      {liveChapters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-8 text-center text-fg-muted">
          本卷暂无已发布章节。
        </div>
      ) : (
        <ol className="space-y-2">
          {liveChapters.map((ch) => (
            <li key={ch.id} className="rounded border border-border bg-bg-card p-4 transition hover:border-accent/40">
              <Link href={`/chapters/${ch.slug}`} className="block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">第 {ch.order} 章 · {ch.title}</div>
                  </div>
                  <div className="text-xs text-fg-muted">{formatCount(ch.view_count)} 阅读</div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
