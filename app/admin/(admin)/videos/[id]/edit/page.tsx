// ============================================================
// /admin/videos/[id]/edit - 编辑视频 (Phase 3.4)
// ============================================================
import { notFound } from "next/navigation";
import { videoRepo, videoSeriesRepo } from "@/lib/repo";
import { VideoForm } from "../../_components/VideoForm";

export const dynamic = "force-dynamic";

export default function EditVideoPage({ params }: { params: { id: string } }) {
  const video = videoRepo.byId(params.id);
  if (!video) notFound();

  const seriesList = videoSeriesRepo.list().map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">✏️ 编辑视频</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">id: {video.id}</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <VideoForm
          mode="edit"
          seriesList={seriesList}
          initial={{
            id: video.id,
            slug: video.slug,
            title: video.title,
            description: video.description,
            series_id: video.series_id,
            embed_url: video.embed_url,
            cover_image: video.cover_image,
            duration: video.duration,
            status: video.status
          }}
        />
      </div>
    </div>
  );
}
