// ============================================================
// /admin/videos/new - 新建视频 (Phase 3.4)
// ============================================================
import { videoSeriesRepo } from "@/lib/repo";
import { VideoForm } from "../_components/VideoForm";

export const dynamic = "force-dynamic";

export default function NewVideoPage() {
  const seriesList = videoSeriesRepo.list().map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎬 新建视频</h1>
        <p className="mt-1 text-sm text-fg-muted">填写标题、embed_url 与系列关联</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <VideoForm mode="create" seriesList={seriesList} />
      </div>
    </div>
  );
}
