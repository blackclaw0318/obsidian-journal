// ============================================================
// /admin/analytics - 板块访问监控 (v0.35.2, 老板 2026-07-05 01:18 拍板)
// 4 卡 + 板块表 + 7d SVG 趋势 + Top 20 路径 + 最近 30 条实时流
// ============================================================
import {
  statsSummary,
  sectionStats,
  dailyTrend,
  topPaths,
  recentViews
} from "@/lib/analytics";
import { serializeForClient } from "@/lib/utils";
import { Sparkline } from "./_components/Sparkline";

export const dynamic = "force-dynamic";

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
    day: "numeric"
  });
}

function uaBrowser(ua: string | null | undefined): string {
  if (!ua) return "—";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  if (/curl\//.test(ua)) return "curl";
  if (/bot|crawl|spider/i.test(ua)) return "Bot";
  return "Other";
}

function sectionEmoji(section: string): string {
  if (section === "home") return "🏠";
  if (section === "posts") return "📝";
  if (section === "novels") return "📚";
  if (section === "videos") return "🎬";
  if (section === "resources") return "📦";
  if (section === "pages") return "📄";
  if (section === "admin") return "⚙️";
  if (section.startsWith("admin/")) {
    const sub = section.split("/")[1];
    if (sub === "posts") return "📝";
    if (sub === "novels") return "📚";
    if (sub === "videos") return "🎬";
    if (sub === "resources") return "📦";
    if (sub === "users") return "👤";
    if (sub === "settings") return "🛠️";
    return "⚙️";
  }
  if (section === "api" || section.startsWith("api")) return "🔌";
  return "📊";
}

export default function AnalyticsPage() {
  const summary = statsSummary();
  const sections = sectionStats(30);
  const sections7d = sectionStats(7);
  const trend = dailyTrend(7);
  const top = topPaths(30, 20);
  const recent = recentViews(30);

  // v0.35.2: 序列化防 null prototype 500 (Sparkline 是 client component)
  const safeTrend = serializeForClient(trend);
  const safeRecent = serializeForClient(recent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 访问监控</h1>
          <p className="mt-1 text-sm text-fg-muted">
            板块级 PV/UV · 365 天保留 · 24h 同 IP 去重
          </p>
        </div>
      </div>

      {/* 顶部 4 卡 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="今日" pv={summary.today.pv} uv={summary.today.uv} accent />
        <SummaryCard label="近 7 天" pv={summary.last7d.pv} uv={summary.last7d.uv} />
        <SummaryCard label="近 30 天" pv={summary.last30d.pv} uv={summary.last30d.uv} />
        <SummaryCard label="近 365 天" pv={summary.last365d.pv} uv={summary.last365d.uv} />
      </div>

      {/* 活跃板块数 */}
      <div className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm">
        <span className="text-fg-muted">今日活跃板块</span>
        <span className="ml-2 font-semibold text-fg">{summary.activeSectionsToday}</span>
        <span className="ml-4 text-fg-muted">7 天活跃板块</span>
        <span className="ml-2 font-semibold text-fg">{sections7d.length}</span>
      </div>

      {/* 7d 趋势 + 板块表 — 两列 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 7d 趋势 SVG */}
        <section className="rounded-lg border border-border bg-bg-card p-4">
          <h2 className="mb-3 text-base font-semibold">📈 近 7 天趋势 (PV + UV)</h2>
          {trend.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-fg-muted">
              暂无数据 (今天开始有人访问就有)
            </div>
          ) : (
            <Sparkline points={safeTrend} height={160} />
          )}
          <div className="mt-2 flex justify-between text-xs text-fg-muted">
            <span>
              {trend[0]?.date ?? "—"} → {trend[trend.length - 1]?.date ?? "—"}
            </span>
            <span>峰值 PV: {Math.max(0, ...trend.map((p) => p.pv))}</span>
          </div>
        </section>

        {/* 30 天板块排名 */}
        <section className="rounded-lg border border-border bg-bg-card p-4">
          <h2 className="mb-3 text-base font-semibold">🏷️ 近 30 天板块排名</h2>
          {sections.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-fg-muted">
              暂无数据
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map((s) => {
                const pct = summary.last30d.pv > 0 ? (s.pv / summary.last30d.pv) * 100 : 0;
                return (
                  <div key={s.section}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span>{sectionEmoji(s.section)}</span>
                        <code className="font-mono text-xs">{s.section}</code>
                      </span>
                      <span className="shrink-0 text-xs text-fg-muted">
                        {s.pv} PV · {s.uv} UV · {s.path_count} paths
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-muted">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                        aria-label={`占比 ${pct.toFixed(1)}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Top 20 路径 */}
      <section className="rounded-lg border border-border bg-bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">🔥 近 30 天 Top 20 路径</h2>
        {top.length === 0 ? (
          <div className="py-8 text-center text-sm text-fg-muted">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">路径</th>
                  <th className="pb-2 pr-4">板块</th>
                  <th className="pb-2 pr-4 text-right">PV</th>
                  <th className="pb-2 text-right">UV</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.path} className="border-b border-border/50 hover:bg-bg-muted/30">
                    <td className="py-2 pr-4 text-fg-muted">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <a
                        href={p.path}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-mono text-xs hover:text-accent"
                      >
                        {p.path}
                      </a>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-bg-muted px-1.5 py-0.5 text-xs">
                        {sectionEmoji(p.section)} {p.section}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{p.pv}</td>
                    <td className="py-2 text-right font-mono">{p.uv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 最近 30 条实时流 */}
      <section className="rounded-lg border border-border bg-bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">🕐 最近访问 (实时流)</h2>
        {recent.length === 0 ? (
          <div className="py-8 text-center text-sm text-fg-muted">暂无访问</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="pb-2 pr-4">时间</th>
                  <th className="pb-2 pr-4">路径</th>
                  <th className="pb-2 pr-4">板块</th>
                  <th className="pb-2 pr-4">浏览器</th>
                  <th className="pb-2 text-right">IP 哈希</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-bg-muted/30">
                    <td className="py-2 pr-4 text-xs text-fg-muted">{formatTime(r.visited_at)}</td>
                    <td className="py-2 pr-4">
                      <code className="font-mono text-xs">{r.path}</code>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs">
                        {sectionEmoji(r.section)} {r.section}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-bg-muted px-1.5 py-0.5 text-xs">
                        {uaBrowser(r.user_agent)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-fg-muted">
                      {r.ip_hash.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-fg-muted">
          * 仅显示 IP 哈希 (前 8 位), 无法反查原 IP,符合隐私最小化原则。
        </p>
      </section>

      <div className="rounded-lg border border-border bg-bg-card px-4 py-3 text-xs text-fg-muted">
        <strong className="text-fg">数据保留策略</strong>: 365 天滚动 (老板 2026-07-05 01:18 Q4 决策)。
        日聚合缓存 (page_views_daily) 用于 dashboard 加速, 原始访问流 (page_views) 用于 Top 路径查询。
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  pv,
  uv,
  accent
}: {
  label: string;
  pv: number;
  uv: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent ? "border-accent/50 bg-accent/5" : "border-border bg-bg-card"
      }`}
    >
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">{pv.toLocaleString()}</span>
        <span className="text-sm text-fg-muted">PV</span>
      </div>
      <div className="mt-0.5 text-xs text-fg-muted">
        <span className="tabular-nums">{uv.toLocaleString()}</span> 独立访客
      </div>
    </div>
  );
}
