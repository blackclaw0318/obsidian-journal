import Link from "next/link";
import type { Metadata } from "next";
import { novelRepo, siteConfigRepo } from "@/lib/repo";
import { absoluteUrl, canonical, jsonLdBook } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "小说",
    description: "黑曜石日志 小说作品集 - 科幻 / 奇幻 / 现实 (Q11 Novel + NovelVolume 双层 model)",
    alternates: { canonical: canonical("/novels") },
    openGraph: {
      type: "website",
      title: "小说",
      description: "黑曜石日志 小说作品集",
      url: absoluteUrl("/novels"),
      locale: "zh_CN"
    }
  };
}

export default function NovelsPage() {
  const novels = novelRepo.list();
  const site = siteConfigRepo.get();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">小说</h1>
      <p className="mb-8 text-fg-muted">共 {novels.length} 部作品</p>

      {novels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center">
          <p className="text-fg-muted">还没有小说作品。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {novels.map((novel) => {
            const volumeCount = novel.volumes.length;
            const chapterCount = novel.volumes.reduce((sum, v) => sum + v.chapters.length, 0);
            const ldJson = site ? jsonLdBook(novel, volumeCount, chapterCount) : null;
            return (
              <article
                key={novel.id}
                className="rounded-lg border border-border bg-bg-card p-6"
              >
                {ldJson && (
                  <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: ldJson }}
                  />
                )}
                <h2 className="mb-2 text-xl font-semibold">
                  <Link href={`/novels/${novel.slug}`} className="hover:text-accent">
                    {novel.title}
                  </Link>
                </h2>
                {novel.description && (
                  <p className="mb-3 text-sm text-fg-muted">{novel.description}</p>
                )}
                <div className="text-xs text-fg-muted">
                  {volumeCount} 卷 · 共 {chapterCount} 章
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
