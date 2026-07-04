// ============================================================
// /resources - 资源库公开页 (v0.34 Phase 4, v0.33 媒体页升级)
// 老板 17:26 Q3 决策: 三类 tabs (image/document/audio) + 真实计数显示
// 砍 video (老板 15:14 决策)
// 卡片点击 → ResourcePreviewModal
// ============================================================
import Link from "next/link";
import { mediaRepo, mediaCounterRepo, siteConfigRepo } from "@/lib/repo";
import { canonical } from "@/lib/seo";
import { displayView, displayDownload } from "@/lib/counter";
import { ResourceGrid } from "./_components/ResourceGrid";
import type { MediaCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { type?: string; q?: string };

const CATEGORIES: Array<{ value: MediaCategory | ""; label: string; emoji: string }> = [
  { value: "", label: "全部", emoji: "📦" },
  { value: "image", label: "图片", emoji: "🖼️" },
  { value: "document", label: "文档", emoji: "📄" },
  { value: "audio", label: "音频", emoji: "🎵" }
];

export function generateMetadata(): { title: string; alternates: { canonical: string } } {
  return {
    title: "资源库",
    alternates: { canonical: canonical("/resources") }
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const type = (searchParams.type ?? "") as MediaCategory | "";
  const q = searchParams.q;
  const cat = CATEGORIES.find((c) => c.value === type) ?? CATEGORIES[0];

  // 按 category 查 (取代旧 mimePrefix)
  const { items, total } = type
    ? mediaRepo.listByCategory({ category: type as MediaCategory, limit: 100 })
    : mediaRepo.listAll({ q, limit: 100 });
  const totalSize = mediaRepo.totalSize();
  const allCount = mediaRepo.count();

  // 批量取 counter (老板 Q3: 显示真实浏览/下载数)
  const counters = mediaCounterRepo.listByMediaIds(items.map((m) => m.id));

  // 序列化 (better-sqlite3 行不能直接传 client component)
  const safeItems = JSON.parse(JSON.stringify(items));
  const safeCounters = Object.fromEntries(counters);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">📦 资源库</h1>
        <p className="mt-2 text-fg-muted">
          共 <strong>{allCount}</strong> 个文件 · 总大小 {formatBytes(totalSize)} · 当前 <strong>{total ?? items.length}</strong> 个{cat.label}
        </p>
      </header>

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value || "all"}
              href={c.value ? `/resources?type=${c.value}` : "/resources"}
              className={`rounded px-3 py-1.5 text-sm ${type === c.value ? "bg-accent text-white" : "border border-border bg-bg text-fg hover:border-accent/40"}`}
            >
              {c.emoji} {c.label}
            </Link>
          ))}
        </div>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="搜索 filename / alt..."
          className="ml-auto rounded border border-border bg-bg px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded border border-border bg-bg px-3 py-1.5 text-sm">搜索</button>
      </form>

      {safeItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
          {q ? `未找到匹配 "${q}" 的文件` : "该分类暂无文件"}
        </div>
      ) : (
        <ResourceGrid items={safeItems} counters={safeCounters} />
      )}
    </div>
  );
}