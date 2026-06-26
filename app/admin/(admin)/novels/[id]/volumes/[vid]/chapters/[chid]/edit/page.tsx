// ============================================================
// /admin/novels/[id]/volumes/[vid]/chapters/[chid]/edit - 编辑章节 (Phase 3.3)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { novelRepo, volumeRepo, chapterRepo } from "@/lib/repo";
import { ChapterForm } from "../../../_components/ChapterForm";

export const dynamic = "force-dynamic";

export default function EditChapterPage({
  params
}: {
  params: { id: string; vid: string; chid: string };
}) {
  const novel = novelRepo.byId(params.id);
  if (!novel) notFound();
  const volume = volumeRepo.byId(params.vid);
  if (!volume || volume.novel_id !== novel.id) notFound();
  const chapter = chapterRepo.byId(params.chid);
  if (!chapter || chapter.volume_id !== volume.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/novels/${novel.id}/volumes/${volume.id}`} className="text-sm text-fg-muted hover:text-accent">
          ← 返回卷详情
        </Link>
        <h1 className="mt-2 text-2xl font-bold">✏️ 编辑章节</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {novel.title} · {volume.title} · 第 {chapter.order} 章
        </p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <ChapterForm
          novelId={novel.id}
          volumeId={volume.id}
          mode="edit"
          initial={{
            id: chapter.id,
            slug: chapter.slug,
            title: chapter.title,
            content: chapter.content,
            excerpt: chapter.excerpt,
            published: chapter.published,
            published_at: chapter.published_at
          }}
        />
      </div>
    </div>
  );
}