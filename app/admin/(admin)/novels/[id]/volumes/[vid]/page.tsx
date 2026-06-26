// ============================================================
// /admin/novels/[id]/volumes/[vid] - 卷详情 + 章节管理 (Phase 3.3)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { novelRepo, volumeRepo, chapterRepo } from "@/lib/repo";
import { ChapterInlineCreate } from "./_components/ChapterInlineCreate";
import { ChapterListActions } from "./_components/ChapterListActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" }
];

export default function VolumeDetailPage({
  params,
  searchParams
}: {
  params: { id: string; vid: string };
  searchParams: SearchParams;
}) {
  const novel = novelRepo.byId(params.id);
  if (!novel) notFound();
  const volume = volumeRepo.byId(params.vid);
  if (!volume || volume.novel_id !== novel.id) notFound();

  const status = searchParams.status || undefined;
  const q = searchParams.q || undefined;
  const { items: chapters, total } = chapterRepo.listByVolume({ volumeId: volume.id, status, q, limit: 100 });

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <Link href={`/admin/novels/${novel.id}`} className="text-sm text-fg-muted hover:text-accent">
          ← 返回小说 {novel.title}
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-bold">📖 第 {volume.order} 卷: {volume.title}</h1>
          {volume.description && (
            <p className="mt-1 text-sm text-fg-muted">{volume.description}</p>
          )}
        </div>
      </div>

      {/* 章节管理 */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">章节列表</h2>
            <p className="mt-0.5 text-sm text-fg-muted">
              共 <strong>{total}</strong> 章
              {status && ` (状态: ${status})`}
              {q && ` (搜索: ${q})`}
            </p>
          </div>
          <ChapterInlineCreate novelId={novel.id} volumeId={volume.id} />
        </div>

        {/* 筛选 */}
        <form className="mb-4 flex flex-wrap items-end gap-3 rounded border border-border bg-bg-base p-3">
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">状态</span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded border border-border bg-bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block flex-1 min-w-[200px]">
            <span className="mb-1 block text-xs text-fg-muted">搜索</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="标题/摘要/slug..."
              className="w-full rounded border border-border bg-bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
          >
            筛选
          </button>
          <Link
            href={`/admin/novels/${novel.id}/volumes/${volume.id}`}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-card"
          >
            重置
          </Link>
        </form>

        {chapters.length === 0 ? (
          <p className="text-sm text-fg-muted">还没有章节。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-fg-muted">
                <tr>
                  <th className="py-2">序</th>
                  <th className="py-2">标题</th>
                  <th className="py-2">状态</th>
                  <th className="py-2">浏览</th>
                  <th className="py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => (
                  <tr key={c.id} className={`border-t border-border ${c.deleted_at ? "opacity-60" : ""}`}>
                    <td className="py-3 text-fg-muted">{c.order}</td>
                    <td className="py-3">
                      <Link
                        href={`/admin/novels/${novel.id}/volumes/${volume.id}/chapters/${c.id}/edit`}
                        className="font-medium hover:text-accent"
                      >
                        {c.title}
                      </Link>
                      <div className="mt-0.5 font-mono text-xs text-fg-muted">/{c.slug}</div>
                    </td>
                    <td className="py-3">
                      <ChapterStatusBadge chapter={c} />
                    </td>
                    <td className="py-3 text-xs text-fg-muted">{c.view_count}</td>
                    <td className="py-3">
                      <ChapterListActions
                        novelId={novel.id}
                        volumeId={volume.id}
                        chapterId={c.id}
                        deleted={c.deleted_at !== null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 严守 v0.6.1: Chapter 无 status 字段, 用 published boolean + deleted_at
// archived 状态 = deleted_at IS NOT NULL
function ChapterStatusBadge({ chapter }: { chapter: { published: boolean; deleted_at: number | null } }) {
  if (chapter.deleted_at) return <span className="rounded bg-gray-500/10 px-2 py-0.5 text-xs text-gray-500">已归档</span>;
  if (chapter.published) return <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-600">已发布</span>;
  return <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600">草稿</span>;
}