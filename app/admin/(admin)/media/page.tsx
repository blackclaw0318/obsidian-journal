// ============================================================
// /admin/media - 媒体库 (Phase 3.6)
// Grid 视图 + 上传 + alt 编辑 + 引用追踪 (3.7 接 Post/Chapter/Page/Video)
// ============================================================
import { mediaRepo } from "@/lib/repo";
import { MediaUploader } from "./_components/MediaUploader";
import { MediaGrid } from "./_components/MediaGrid";

export const dynamic = "force-dynamic";

type SearchParams = {
  type?: string; // 'image' | 'video' | 'audio' | 'pdf'
  q?: string;
};

const TYPE_OPTIONS = [
  { value: "", label: "全部", prefix: undefined },
  { value: "image", label: "图片", prefix: "image/" },
  { value: "video", label: "视频", prefix: "video/" },
  { value: "audio", label: "音频", prefix: "audio/" },
  { value: "pdf", label: "PDF", prefix: "application/pdf" }
];

export default function MediaListPage({ searchParams }: { searchParams: SearchParams }) {
  const type = searchParams.type || "";
  const q = searchParams.q || undefined;

  const opt = TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[0];
  const { items, total } = mediaRepo.listAll({ mimePrefix: opt.prefix, q, limit: 200 });
  const totalSize = mediaRepo.totalSize();

  // 序列化: better-sqlite3 行有 null prototype, 不能直接传给 Client Component
  const safeItems = JSON.parse(JSON.stringify(items));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🖼 媒体库</h1>
          <p className="mt-1 text-sm text-fg-muted">
            共 <strong>{total}</strong> 个文件 · 总大小 <strong>{(totalSize / 1024 / 1024).toFixed(1)}MB</strong>
            {q && ` · 搜索: "${q}"`}
          </p>
        </div>
      </div>

      <MediaUploader />

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
              <option key={o.value} value={o.value}>{o.label}</option>
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
          href="/admin/media"
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-base"
        >
          重置
        </a>
      </form>

      <MediaGrid items={safeItems} />
    </div>
  );
}
