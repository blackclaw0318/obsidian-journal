import Link from "next/link";
import { novelRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function NovelsPage() {
  const novels = novelRepo.list();

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
          {novels.map((novel) => (
            <article
              key={novel.id}
              className="rounded-lg border border-border bg-bg-card p-6"
            >
              <h2 className="mb-2 text-xl font-semibold">
                <Link href={`/novels/${novel.slug}`} className="hover:text-accent">
                  {novel.title}
                </Link>
              </h2>
              {novel.description && (
                <p className="mb-3 text-sm text-fg-muted">{novel.description}</p>
              )}
              <div className="text-xs text-fg-muted">
                {novel.volumes.length} 卷 · 共{" "}
                {novel.volumes.reduce((sum, v) => sum + v.chapters.length, 0)} 章
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}