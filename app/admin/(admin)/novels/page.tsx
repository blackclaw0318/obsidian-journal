// ============================================================
// /admin/novels - 小说列表 (Phase 3.3)
// 严守 v0.6.1: NovelStatus 3 值 (ongoing|completed|hiatus), archived 走 deleted_at
// ============================================================
import Link from "next/link";
import { novelRepo } from "@/lib/repo";
import { NovelListActions } from "./_components/NovelListActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
};

// 严守 v0.6.1: 业务状态 3 值, 'archived' 仅作为 UI 过滤别名 (查 deleted_at IS NOT NULL)
const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "ongoing", label: "连载中" },
  { value: "completed", label: "已完结" },
  { value: "hiatus", label: "休刊" },
  { value: "archived", label: "已归档" }
];

export default function NovelsListPage({ searchParams }: { searchParams: SearchParams }) {
  const status = searchParams.status || undefined;
  const q = searchParams.q || undefined;

  // 当 filter 是 'archived' 时, 强制 includeDeleted=true (默认排除 deleted)
  const { items, total } = novelRepo.listAll({
    status,
    q,
    includeDeleted: status === "archived",
    limit: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📚 小说管理</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{total}</strong> 部 {status && `(状态: ${status})`} {q && `(搜索: ${q})`}
          </p>
        </div>
        <Link
          href="/admin/novels/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          + 新建小说
        </Link>
      </div>

      {/* 筛选 + 搜索 */}
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
        <label className="block flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs text-fg-muted">搜索 (标题/简介)</span>
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
          href="/admin/novels"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-base"
        >
          重置
        </Link>
      </form>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-fg-muted">
          {q || status ? "没有符合条件的小说" : "还没有小说, "}
          {!q && !status && (
            <Link href="/admin/novels/new" className="text-accent hover:underline">
              创建第一部
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
          <table className="w-full text-sm">
            <thead className="bg-bg-base text-left text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">卷</th>
                <th className="px-4 py-3">章节</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-t border-border hover:bg-bg-base/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/novels/${n.id}`} className="font-medium hover:text-accent">
                      {n.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-fg-muted">/{n.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <NovelStatusBadge status={n.status} deleted={n.deleted_at !== null} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{n.volume_count}</td>
                  <td className="px-4 py-3 text-fg-muted">{n.chapter_count}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {new Date(n.updated_at * 1000).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <NovelListActions id={n.id} deleted={n.deleted_at !== null} />
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

// 严守 v0.6.1: NovelStatus 业务 3 值, archived 由 deleted 字段 (deleted_at 派生) 表达
function NovelStatusBadge({ status, deleted }: { status: string; deleted: boolean }) {
  if (deleted) {
    return <span className="rounded bg-gray-500/10 px-2 py-0.5 text-xs text-gray-500">已归档</span>;
  }
  const map: Record<string, { label: string; color: string }> = {
    ongoing: { label: "连载中", color: "bg-green-500/10 text-green-600" },
    completed: { label: "已完结", color: "bg-blue-500/10 text-blue-600" },
    hiatus: { label: "休刊", color: "bg-yellow-500/10 text-yellow-600" }
  };
  const s = map[status] ?? { label: status, color: "bg-bg-base" };
  return <span className={`rounded px-2 py-0.5 text-xs ${s.color}`}>{s.label}</span>;
}