// ============================================================
// /admin/series/new - 新建系列
// ============================================================
import { SeriesForm } from "../_components/SeriesForm";

export const dynamic = "force-dynamic";

export default function NewSeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新建系列</h1>
        <p className="mt-1 text-sm text-fg-muted">tech/life 文章系列(与视频系列区分)</p>
      </div>
      <SeriesForm mode="create" />
    </div>
  );
}
