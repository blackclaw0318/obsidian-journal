// ============================================================
// /admin/series/[id]/edit - 编辑系列
// ============================================================
import { notFound } from "next/navigation";
import { seriesRepo } from "@/lib/repo";
import { SeriesForm } from "../../_components/SeriesForm";

export const dynamic = "force-dynamic";

export default function EditSeriesPage({ params }: { params: { id: string } }) {
  const series = seriesRepo.byId(params.id);
  if (!series) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">编辑系列</h1>
        <p className="mt-1 text-sm text-fg-muted">{series.name}</p>
      </div>
      <SeriesForm initial={series} mode="edit" />
    </div>
  );
}
