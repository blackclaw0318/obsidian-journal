// ============================================================
// /admin/video-series/[id]/edit - 编辑系列 (Phase 3.4)
// ============================================================
import { notFound } from "next/navigation";
import { videoRepo, videoSeriesRepo } from "@/lib/repo";
import { VideoSeriesForm } from "../../_components/VideoSeriesForm";

export const dynamic = "force-dynamic";

export default function EditVideoSeriesPage({ params }: { params: { id: string } }) {
  const series = videoSeriesRepo.byId(params.id);
  if (!series) notFound();

  const videos = videoRepo.listBySeries(series.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">✏️ 编辑系列</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">id: {series.id}</p>
      </div>

      <div className="rounded-lg border border-border bg-bg-card p-6">
        <VideoSeriesForm
          mode="edit"
          initial={{
            id: series.id,
            slug: series.slug,
            title: series.title,
            description: series.description,
            cover_image: series.cover_image,
            order: series.order
          }}
        />
      </div>

      {/* 系列下的视频列表 */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">本系列视频 ({videos.length})</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-fg-muted">暂无视频,去 <a href="/admin/videos/new" className="text-accent hover:underline">新建视频</a> 时选此系列。</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                <a href={`/admin/videos/${v.id}/edit`} className="font-medium hover:text-accent">
                  {v.title}
                </a>
                <span className="text-xs text-fg-muted">
                  {v.status === "published" ? "已发布" : v.status === "draft" ? "草稿" : "已归档"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
