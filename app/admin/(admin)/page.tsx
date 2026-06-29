// ============================================================
// /admin - 仪表盘 (v0.11, v0.6.1 §7.2)
// 统计: 帖子/系列/小说/视频/页面/媒体 各数量 + 最近 7 天 daily_stat
// ============================================================
import Link from "next/link";
import {
  postRepo,
  seriesRepo,
  novelRepo,
  videoRepo,
  videoSeriesRepo,
  pageRepo,
  mediaRepo,
  dailyStatsRepo,
  socialRepo
} from "@/lib/repo";
import { formatDate, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // 数量统计
  const postCount = postRepo.count("published");
  const postDraft = postRepo.count("draft");
  const postArchived = postRepo.count("archived");
  const seriesCount = seriesRepo.count();
  const novelCount = novelRepo.count();
  const videoCount = videoRepo.listAll({ status: "published" }).total;
  const videoSeriesCount = videoSeriesRepo.list().length;
  const pageCount = pageRepo.listAll({ status: "published" }).items.length;
  const mediaCount = mediaRepo.count();
  const socialCount = socialRepo.count();

  // 最近 7 天流量
  const stats = dailyStatsRepo.recent(7);
  const totalPv7d = stats.reduce((s, d) => s + d.pv, 0);
  const totalPostViews7d = stats.reduce((s, d) => s + d.post_views, 0);

  // 最近发布的 5 篇帖子
  const recentPosts = postRepo.listAll({ status: "published", limit: 5 }).items;
  // 最近小说
  const latestNovel = novelRepo.latest();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">📊 概览</h1>
        <p className="mt-1 text-sm text-fg-muted">v0.11 · 实时数据 (dev.db)</p>
      </div>

      {/* 统计卡片 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg-muted">内容统计</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard label="已发布帖子" value={postCount} sub={`${postDraft} 草稿 / ${postArchived} 归档`} href="/admin/posts" />
          <StatCard label="系列" value={seriesCount} href="/admin/series" />
          <StatCard label="小说" value={novelCount} href="/admin/novels" />
          <StatCard label="视频" value={videoCount} sub={`${videoSeriesCount} 系列`} href="/admin/videos" />
          <StatCard label="静态页" value={pageCount} href="/admin/pages" />
          <StatCard label="媒体" value={mediaCount} sub={`${formatCount(mediaRepo.totalSize())} bytes`} href="/admin/media" />
          <StatCard label="友链" value={socialCount} href="/admin/socials" />
          <StatCard label="最近 7d PV" value={formatCount(totalPv7d)} sub={`${formatCount(totalPostViews7d)} 文章浏览`} />
        </div>
      </section>

      {/* 最近 7 天流量 */}
      {stats.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg-muted">最近 7 天流量 (DailyStat)</h2>
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">日期</th>
                  <th className="px-3 py-2 w-20">PV</th>
                  <th className="px-3 py-2 w-20">UV</th>
                  <th className="px-3 py-2 w-28">文章浏览</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono text-xs">{d.date}</td>
                    <td className="px-3 py-1.5">{d.pv}</td>
                    <td className="px-3 py-1.5">{d.uv}</td>
                    <td className="px-3 py-1.5">{d.post_views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 最近发布 */}
      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-muted">最近发布</h2>
            <Link href="/admin/posts" className="text-xs text-accent hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {recentPosts.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-center text-sm text-fg-muted">暂无</div>
            ) : recentPosts.map((p) => (
              <Link key={p.id} href={`/admin/posts/${p.id}/edit`} className="block rounded border border-border bg-bg p-3 transition hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{p.title}</span>
                  <span className="ml-2 shrink-0 rounded bg-bg-muted px-2 py-0.5 text-xs">{p.category}</span>
                </div>
                <div className="mt-1 text-xs text-fg-muted">
                  {p.published_at ? formatDate(new Date(p.published_at * 1000)) : "未发布"} · {p.view_count} 浏览
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-muted">最新小说</h2>
            <Link href="/admin/novels" className="text-xs text-accent hover:underline">查看全部 →</Link>
          </div>
          {latestNovel ? (
            <Link href={`/admin/novels/${latestNovel.id}`} className="block rounded border border-border bg-bg p-3 transition hover:border-accent/40">
              <div className="flex items-center justify-between">
                <span className="font-medium">{latestNovel.title}</span>
                <span className="rounded bg-bg-muted px-2 py-0.5 text-xs">{latestNovel.status}</span>
              </div>
              <div className="mt-1 text-xs text-fg-muted">{latestNovel.volumes.length} 卷</div>
            </Link>
          ) : (
            <div className="rounded border border-dashed border-border p-4 text-center text-sm text-fg-muted">暂无小说</div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: number | string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded border border-border bg-bg p-4 transition hover:border-accent/40">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-fg-muted">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
