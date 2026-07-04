// ============================================================
// /admin/resources - 资源库管理 (v0.35 砍计数版)
// 老板 2026-07-05 00:59 决策: 删所有计数功能
// 还原最简版: Grid 视图 + 上传 + alt 编辑 + 复制 + 删除
// ============================================================
import { mediaRepo } from "@/lib/repo";
import { ResourceUploader } from "./_components/ResourceUploader";
import { ResourceAdminGrid } from "./_components/ResourceAdminGrid";
import { formatBytes } from "@/lib/utils";
import type { MediaCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = {
  type?: string; // 'image' | 'document' | 'audio'
  q?: string;
};

const TYPE_OPTIONS: Array<{ value: MediaCategory | ""; label: string }> = [
  { value: "", label: "全部" },
  { value: "image", label: "图片" },
  { value: "document", label: "文档" },
  { value: "audio", label: "音频" }
];

export default function ResourcesListPage({ searchParams }: { searchParams: SearchParams }) {
  const type = (searchParams.type || "") as MediaCategory | "";
  const q = searchParams.q || undefined;

  const { items, total } = type
    ? mediaRepo.listByCategory({ category: type as MediaCategory, limit: 200 })
    : mediaRepo.listAll({ q, limit: 200 });
  const totalSize = mediaRepo.totalSize();

  // 序列化: better-sqlite3 行有 null prototype, 不能直接传给 Client Component
  // ⚠️ "Only plain objects can be passed to Client Components" #428396957
  const safeItems = JSON.parse(JSON.stringify(items));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📦 资源库</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{total}</strong> 个文件 · 总大小 <strong>{formatBytes(totalSize)}</strong>
            {q && ` · 搜索: "${q}"`}
          </p>
        </div>
      </div>

      <ResourceUploader />

      {/* 筛选 + 搜索 */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">类型</span>
          <select
            name="type"
            defaultValue={type}
            className="rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs text-fg-muted">搜索 (文件名/alt)</span>
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
        <a
          href="/admin/resources"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-base"
        >
          重置
        </a>
      </form>

      <ResourceAdminGrid items={safeItems} />
    </div>
  );
}