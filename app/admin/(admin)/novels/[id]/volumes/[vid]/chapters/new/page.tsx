// ============================================================
// /admin/novels/[id]/volumes/[vid]/chapters/new - 新建章节 (Phase 3.3)
// 备用入口 (推荐走 inline 创建 → 自动跳编辑页)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { novelRepo, volumeRepo } from "@/lib/repo";
import { ChapterForm } from "../../_components/ChapterForm";

export const dynamic = "force-dynamic";

export default function NewChapterPage({ params }: { params: { id: string; vid: string } }) {
  const novel = novelRepo.byId(params.id);
  if (!novel) notFound();
  const volume = volumeRepo.byId(params.vid);
  if (!volume || volume.novel_id !== novel.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/novels/${novel.id}/volumes/${volume.id}`} className="text-sm text-fg-muted hover:text-accent">
          ← 返回卷详情
        </Link>
        <h1 className="mt-2 text-2xl font-bold">📝 新建章节</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {novel.title} · {volume.title}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <ChapterForm novelId={novel.id} volumeId={volume.id} mode="create" />
      </div>
    </div>
  );
}