// ============================================================
// /novels/[slug] - 小说详情 (v0.12, v0.6.1 §8)
// 展示小说 metadata + 卷列表 + 章节列表 (聚合)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { novelRepo, siteConfigRepo } from "@/lib/repo";
import { formatDate, formatCount } from "@/lib/utils";
import { absoluteUrl, canonical, jsonLdBook } from "@/lib/seo";
import { ArticleCopyright } from "@/components/ArticleCopyright";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const n = novelRepo.bySlugWithVolumes(params.slug);
  if (!n) return { title: "未找到" };
  const totalChapters = n.volumes.reduce((s, v) => s + v.chapters.filter((c) => c.published).length, 0);
  return {
    title: n.title,
    description: n.description ?? `${n.title} — 共 ${n.volumes.length} 卷 ${totalChapters} 章`,
    alternates: { canonical: canonical(`/novels/${n.slug}`) },
    openGraph: {
      type: "book",
      title: n.title,
      description: n.description ?? undefined,
      url: absoluteUrl(`/novels/${n.slug}`),
      locale: "zh_CN"
    }
  };
}

const STATUS_LABEL: Record<string, string> = {
  ongoing: "连载中",
  completed: "已完结",
  hiatus: "暂停"
};

const STATUS_COLOR: Record<string, string> = {
  ongoing: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  completed: "bg-green-500/20 text-green-700 dark:text-green-300",
  hiatus: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
};

export default function NovelDetailPage({ params }: Props) {
  const novel = novelRepo.bySlugWithVolumes(params.slug);
  if (!novel) notFound();
  const totalChapters = novel.volumes.reduce((s, v) => s + v.chapters.filter((c) => c.published).length, 0);
  const site = siteConfigRepo.get();
  const ldJson = site ? jsonLdBook(novel, novel.volumes.length, totalChapters) : null;
  const totalViews = novel.volumes.reduce((s, v) => s + v.chapters.reduce((cs, c) => cs + c.view_count, 0), 0);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      {ldJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} />}

      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Link href="/novels" className="text-fg-muted hover:text-fg">← 小说列表</Link>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs">
          <span className={`rounded px-2 py-0.5 ${STATUS_COLOR[novel.status]}`}>{STATUS_LABEL[novel.status]}</span>
          <span className="text-fg-muted">{novel.volumes.length} 卷 · {totalChapters} 章 · {formatCount(totalViews)} 阅读</span>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight">{novel.title}</h1>
        {novel.description && <p className="text-lg text-fg-muted">{novel.description}</p>}
      </header>

      {novel.volumes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-8 text-center text-fg-muted">
          暂无卷。
        </div>
      ) : (
        <div className="space-y-6">
          {novel.volumes.map((vol) => {
            const liveChapters = vol.chapters.filter((c) => c.published);
            return (
              <section key={vol.id} className="rounded-lg border border-border bg-bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      <Link href={`/novels/${novel.slug}/volume-${vol.order}`} className="hover:text-accent">
                        第 {vol.order} 卷 · {vol.title}
                      </Link>
                    </h2>
                    {vol.description && <p className="mt-1 text-sm text-fg-muted">{vol.description}</p>}
                  </div>
                  <span className="text-xs text-fg-muted">{liveChapters.length} 章</span>
                </div>

                {liveChapters.length > 0 && (
                  <ol className="space-y-1 pl-1">
                    {liveChapters.map((ch) => (
                      <li key={ch.id} className="flex items-center justify-between text-sm">
                        <Link href={`/chapters/${ch.slug}`} className="hover:text-accent">
                          第 {ch.order} 章 · {ch.title}
                        </Link>
                        <span className="text-xs text-fg-muted">{formatCount(ch.view_count)} 阅读</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* v0.38 P5.5: 小说详情末尾版权声明 */}
      <ArticleCopyright type="novel" slug={novel.slug} />
    </article>
  );
}
