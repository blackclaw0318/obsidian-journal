// ============================================================
// /admin/video-series - 视频系列列表 (Phase 3.4)
// ============================================================
import Link from "next/link";
import { videoSeriesRepo } from "@/lib/repo";
import { VideoSeriesListActions } from "./_components/VideoSeriesListActions";

export const dynamic = "force-dynamic";

export default function VideoSeriesListPage() {
  const items = videoSeriesRepo.listWithCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📂 视频系列</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{items.length}</strong> 个系列
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/videos"
            className="rounded border border-border bg-bg-card px-3 py-2 text-sm hover:bg-bg-base"
          >
            ← 返回视频列表
          </Link>
          <Link
            href="/admin/video-series/new"
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            + 新建系列
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-fg-muted">
          还没有系列,{" "}
          <Link href="/admin/video-series/new" className="text-accent hover:underline">
            创建第一个
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
          <table className="w-full text-sm">
            <thead className="bg-bg-base text-left text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">slug</th>
                <th className="px-4 py-3">视频数</th>
                <th className="px-4 py-3">排序</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.series.id} className="border-t border-border hover:bg-bg-base/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/video-series/${row.series.id}/edit`} className="font-medium hover:text-accent">
                      {row.series.title}
                    </Link>
                    {row.series.description && (
                      <div className="mt-0.5 truncate text-xs text-fg-muted">{row.series.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted">{row.series.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                      {row.videoCount} 个
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{row.series.order}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {new Date(row.series.created_at * 1000).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <VideoSeriesListActions id={row.series.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
