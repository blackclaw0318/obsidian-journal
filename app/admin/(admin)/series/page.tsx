// ============================================================
// /admin/series - 系列列表 (v0.11, v0.6.1 §6 Series 还原)
// ============================================================
import Link from "next/link";
import { seriesRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

type SearchParams = { category?: string };

const CATEGORY_OPTIONS = [
  { value: "", label: "全部分类" },
  { value: "tech", label: "tech" },
  { value: "life", label: "life" }
];

export default function SeriesListPage({ searchParams }: { searchParams: SearchParams }) {
  const category = searchParams.category || undefined;
  const items = seriesRepo.listAll(category);
  const total = seriesRepo.count();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📚 系列管理</h1>
          <p className="mt-1 text-sm text-fg-muted">共 <strong>{total}</strong> 个系列 {category && `(分类: ${category})`}</p>
        </div>
        <Link href="/admin/series/new" className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90">
          + 新建系列
        </Link>
      </div>

      <form className="flex items-center gap-2">
        <select name="category" defaultValue={category ?? ""} className="rounded border border-border bg-bg px-3 py-1.5 text-sm">
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="submit" className="rounded border border-border bg-bg px-3 py-1.5 text-sm">筛选</button>
        {category && <Link href="/admin/series" className="text-sm text-fg-muted hover:underline">清除</Link>}
      </form>

      {items.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-bg-muted/30 p-8 text-center text-sm text-fg-muted">
          暂无系列。点击右上角「+ 新建系列」开始。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/admin/series/${s.id}/edit`}
              className="block rounded border border-border bg-bg p-4 transition hover:border-accent/40 hover:shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{s.name}</h3>
                <span className="rounded bg-bg-muted px-2 py-0.5 text-xs">{s.category}</span>
              </div>
              {s.description && <p className="mt-2 text-sm text-fg-muted line-clamp-2">{s.description}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
                <span>slug: <code className="font-mono">{s.slug}</code></span>
                <span>{s.post_count} 篇文章</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
