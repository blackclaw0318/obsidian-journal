// ============================================================
// /admin/novels/[id]/edit - 编辑小说 (Phase 3.3)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { novelRepo } from "@/lib/repo";
import { NovelForm } from "../../_components/NovelForm";

export const dynamic = "force-dynamic";

export default function EditNovelPage({ params }: { params: { id: string } }) {
  const novel = novelRepo.byId(params.id);
  if (!novel) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/novels/${params.id}`} className="text-sm text-fg-muted hover:text-accent">
          ← 返回小说详情
        </Link>
        <h1 className="mt-2 text-2xl font-bold">✏️ 编辑小说</h1>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <NovelForm
          mode="edit"
          initial={{
            id: novel.id,
            slug: novel.slug,
            title: novel.title,
            description: novel.description,
            cover_image: novel.cover_image,
            status: novel.status
          }}
        />
      </div>
    </div>
  );
}