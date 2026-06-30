// ============================================================
// /media - 媒体库公开页 (v0.12, v0.6.1 §8)
// 真显示 media_items (按 mimeType 分类: 图片/视频/文档)
// ============================================================
import Link from "next/link";
import { mediaRepo, siteConfigRepo } from "@/lib/repo";
import { formatCount, formatDate } from "@/lib/utils";
import { canonical } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SearchParams = { type?: string; q?: string };

const CATEGORIES = [
  { value: "", label: "全部", prefix: undefined },
  { value: "image", label: "🖼️ 图片", prefix: "image/" },
  { value: "video", label: "🎬 视频", prefix: "video/" },
  { value: "doc", label: "📄 文档", prefix: "application/" },
  { value: "audio", label: "🎵 音频", prefix: "audio/" }
];

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): { title: string; alternates: { canonical: string } } {
  return {
    title: "媒体库",
    alternates: { canonical: canonical("/media") }
  };
}

export default function MediaPage({ searchParams }: { searchParams: SearchParams }) {
  const type = searchParams.type ?? "";
  const q = searchParams.q;
  const cat = CATEGORIES.find((c) => c.value === type) ?? CATEGORIES[0];
  const { items, total } = mediaRepo.listAll({ mimePrefix: cat.prefix, q, limit: 100 });
  const totalSize = mediaRepo.totalSize();
  const allCount = mediaRepo.count();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">🖼️ 媒体库</h1>
        <p className="mt-2 text-fg-muted">
          共 <strong>{allCount}</strong> 个文件 · 总大小 {formatBytes(totalSize)} · 当前 <strong>{items.length}</strong> 个{cat.label}
        </p>
      </header>

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={c.value ? `/media?type=${c.value}` : "/media"}
              className={`rounded px-3 py-1.5 text-sm ${type === c.value ? "bg-accent text-white" : "border border-border bg-bg text-fg hover:border-accent/40"}`}
            >
              {c.label}
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

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
          {q ? `未找到匹配 "${q}" 的文件` : "该分类暂无文件"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => {
            const isImage = m.mime_type.startsWith("image/");
            const isVideo = m.mime_type.startsWith("video/");
            return (
              <div key={m.id} className="overflow-hidden rounded border border-border bg-bg-card">
                <div className="flex aspect-video items-center justify-center overflow-hidden bg-bg-muted">
                  {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.url} alt={m.alt ?? m.filename} loading="lazy" className="h-full w-full object-cover" />
                  ) : isVideo ? (
                    <div className="text-4xl text-fg-muted">🎬</div>
                  ) : (
                    <div className="text-4xl text-fg-muted">📄</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium" title={m.filename}>{m.alt ?? m.filename}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-fg-muted">
                    <span>{formatBytes(m.size)}</span>
                    {m.width && m.height && <span>{m.width}×{m.height}</span>}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">{formatDate(new Date(m.uploaded_at * 1000))}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
