// ============================================================
// /admin/video-series/new - 新建系列 (Phase 3.4)
// ============================================================
import { VideoSeriesForm } from "../_components/VideoSeriesForm";

export const dynamic = "force-dynamic";

export default function NewVideoSeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📂 新建视频系列</h1>
        <p className="mt-1 text-sm text-fg-muted">用系列管理一组相关视频(教程/合集/节目)</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <VideoSeriesForm mode="create" />
      </div>
    </div>
  );
}
