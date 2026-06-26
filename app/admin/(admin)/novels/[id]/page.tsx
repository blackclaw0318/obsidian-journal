// ============================================================
// /admin/novels/[id] - 小说详情 + 卷管理 (Phase 3.3)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { novelRepo, volumeRepo } from "@/lib/repo";
import { VolumeInlineCreate } from "../_components/VolumeInlineCreate";
import { VolumeListActions } from "../_components/VolumeListActions";

export const dynamic = "force-dynamic";

export default function NovelDetailPage({ params }: { params: { id: string } }) {
  const novel = novelRepo.byId(params.id);
  if (!novel) notFound();

  const volumes = volumeRepo.listByNovel(novel.id, false);  // 默认排除 deleted_at, deleted 在行内显示
  const totalChapters = volumes.reduce((sum, v) => sum + v.chapter_count, 0);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <Link href="/admin/novels" className="text-sm text-fg-muted hover:text-accent">
          ← 返回小说列表
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">📚 {novel.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-fg-muted">
              <span className="font-mono">/{novel.slug}</span>
              <span>·</span>
              <span>{volumes.length} 卷</span>
              <span>·</span>
              <span>{totalChapters} 章</span>
            </div>
            {novel.description && (
              <p className="mt-2 text-sm text-fg-muted">{novel.description}</p>
            )}
          </div>
          <Link
            href={`/admin/novels/${novel.id}/edit`}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-card"
          >
            ✏️ 编辑小说
          </Link>
        </div>
      </div>

      {/* 卷管理 */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">卷列表</h2>
          <VolumeInlineCreate novelId={novel.id} />
        </div>

        {volumes.length === 0 ? (
          <p className="text-sm text-fg-muted">还没有卷,点击右上角添加。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-fg-muted">
                <tr>
                  <th className="py-2">序</th>
                  <th className="py-2">标题</th>
                  <th className="py-2">章节数</th>
                  <th className="py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {volumes.map((v) => {
                  // 严守 v0.6.1: volume 软删走 deleted_at 字段, 不再用 description 拼接 [archived ...]
                  return (
                    <tr key={v.id} className={`border-t border-border ${v.deleted_at ? "opacity-60" : ""}`}>
                      <td className="py-3 text-fg-muted">{v.order}</td>
                      <td className="py-3">
                        <Link href={`/admin/novels/${novel.id}/volumes/${v.id}`} className="font-medium hover:text-accent">
                          {v.title}
                        </Link>
                      </td>
                      <td className="py-3 text-fg-muted">{v.live_chapter_count} / {v.chapter_count}</td>
                      <td className="py-3">
                        <VolumeListActions novelId={novel.id} volumeId={v.id} deleted={v.deleted_at !== null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}