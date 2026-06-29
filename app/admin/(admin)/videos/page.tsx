// ============================================================
// /admin/videos - 视频列表 (Phase 3.4)
// ============================================================
import Link from "next/link";
import { videoRepo, videoSeriesRepo } from "@/lib/repo";
import { VideoListActions } from "./_components/VideoListActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  series_id?: string;
  q?: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" }
];

export default function VideosListPage({ searchParams }: { searchParams: SearchParams }) {
  const status = searchParams.status || undefined;
  const seriesId = searchParams.series_id || undefined;
  const q = searchParams.q || undefined;

  const { items, total } = videoRepo.listAll({ status, seriesId, q, limit: 100 });
  const seriesList = videoSeriesRepo.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎬 视频管理</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{total}</strong> 个视频
            {status && ` (状态: ${status})`}
            {q && ` (搜索: "${q}")`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/video-series"
            className="rounded border border-border bg-bg-card px-3 py-2 text-sm hover:bg-bg-base"
          >
            📂 管理系列 ({seriesList.length})
          </Link>
          <Link
            href="/admin/videos/new"
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            + 新建视频
          </Link>
        </div>
      </div>

      {/* 筛选 */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">状态</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">系列</span>
          <select
            name="series_id"
            defaultValue={seriesId ?? ""}
            className="rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="">全部系列</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs text-fg-muted">搜索 (标题/描述/slug)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="输入关键词..."
            className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
        >
          筛选
        </button>
        <Link
          href="/admin/videos"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-base"
        >
          重置
        </Link>
      </form>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-fg-muted">
          {q || status || seriesId ? "没有符合条件的视频" : "还没有视频, "}
          {!q && !status && !seriesId && (
            <Link href="/admin/videos/new" className="text-accent hover:underline">
              创建第一个
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
          <table className="w-full text-sm">
            <thead className="bg-bg-base text-left text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">系列</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">时长</th>
                <th className="px-4 py-3">发布时间</th>
                <th className="px-4 py-3">浏览</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const series = seriesList.find((s) => s.id === v.series_id);
                return (
                  <tr key={v.id} className="border-t border-border hover:bg-bg-base/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/videos/${v.id}/edit`} className="font-medium hover:text-accent">
                        {v.title}
                      </Link>
                      <div className="mt-0.5 truncate font-mono text-xs text-fg-muted" title={v.embed_url}>
                        {v.embed_url}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {series ? <span className="rounded bg-bg-base px-2 py-0.5">{series.title}</span> : <span className="text-fg-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">
                      {v.duration ? `${v.duration}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">
                      {v.published_at ? new Date(v.published_at * 1000).toLocaleDateString("zh-CN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">{v.view_count}</td>
                    <td className="px-4 py-3">
                      <VideoListActions id={v.id} status={v.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    published: { label: "已发布", color: "bg-green-500/10 text-green-600" },
    draft: { label: "草稿", color: "bg-yellow-500/10 text-yellow-600" },
    archived: { label: "已归档", color: "bg-gray-500/10 text-gray-500" }
  };
  const s = map[status] ?? { label: status, color: "bg-bg-base" };
  return <span className={`rounded px-2 py-0.5 text-xs ${s.color}`}>{s.label}</span>;
}
