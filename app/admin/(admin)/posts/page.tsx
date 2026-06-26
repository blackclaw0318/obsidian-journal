// ============================================================
// /admin/posts - 列表 (Phase 3.2)
// ============================================================
import Link from "next/link";
import { postRepo } from "@/lib/repo";
import { PostListActions } from "./_components/PostListActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  category?: string;
  q?: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" }
];

const CATEGORY_OPTIONS = [
  { value: "", label: "全部分类" },
  { value: "tech", label: "tech" },
  { value: "life", label: "life" }
];

export default function PostsListPage({ searchParams }: { searchParams: SearchParams }) {
  const status = searchParams.status || undefined;
  const category = searchParams.category || undefined;
  const q = searchParams.q || undefined;

  const { items, total } = postRepo.listAll({ status, category, q, limit: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📝 帖子管理</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{total}</strong> 篇 {status && `(状态: ${status})`} {category && `(分类: ${category})`}
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          + 新建帖子
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
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">分类</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs text-fg-muted">搜索 (标题/摘要)</span>
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
          href="/admin/posts"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-base"
        >
          重置
        </Link>
      </form>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-fg-muted">
          {q || status || category ? "没有符合条件的帖子" : "还没有帖子, "}
          {!q && !status && !category && (
            <Link href="/admin/posts/new" className="text-accent hover:underline">
              创建第一篇
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
          <table className="w-full text-sm">
            <thead className="bg-bg-base text-left text-xs uppercase text-fg-muted">
              <tr>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">作者</th>
                <th className="px-4 py-3">发布时间</th>
                <th className="px-4 py-3">浏览</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-bg-base/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/posts/${p.id}/edit`} className="font-medium hover:text-accent">
                      {p.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-fg-muted">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-bg-base px-2 py-0.5 text-xs">{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{p.author.name ?? p.author.email}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {p.published_at ? new Date(p.published_at * 1000).toLocaleDateString("zh-CN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{p.view_count}</td>
                  <td className="px-4 py-3">
                    <PostListActions id={p.id} status={p.status} />
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    published: { label: "已发布", color: "bg-green-500/10 text-green-600" },
    draft: { label: "草稿", color: "bg-yellow-500/10 text-yellow-600" },
    archived: { label: "已归档", color: "bg-gray-500/10 text-gray-500" }
  };
  const s = map[status] ?? { label: status, color: "bg-bg-base" };
  return <span className={`rounded px-2 py-0.5 text-xs ${s.color}`}>{s.label}</span>;
}