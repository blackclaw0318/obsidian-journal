// ============================================================
// /loading - 全局加载状态 (v0.20 BCDE)
//  - server component (无交互)
//  - 用于 app router 路由切换 + server component fetch 期间的兜底
//  - 风格: 简约骨架屏 + 中心脉冲点 (避免白屏"卡顿感")
// ============================================================
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* 中心加载指示器 */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <span className="absolute inset-0 animate-ping rounded-full bg-fg/20" />
          <span className="absolute inset-2 rounded-full bg-fg/60" />
        </div>
        <p className="text-sm text-fg-muted">加载中…</p>
      </div>

      {/* Hero 骨架 */}
      <div className="mb-16 flex animate-pulse items-start gap-6">
        <div className="h-24 w-24 flex-shrink-0 rounded-full bg-bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-9 w-2/3 rounded bg-bg-muted" />
          <div className="h-5 w-1/2 rounded bg-bg-muted" />
          <div className="flex gap-6 pt-2">
            <div className="h-3 w-20 rounded bg-bg-muted" />
            <div className="h-3 w-20 rounded bg-bg-muted" />
          </div>
        </div>
      </div>

      {/* 卡片骨架 (3 条) */}
      <div className="mb-12">
        <div className="mb-6 h-7 w-32 rounded bg-bg-muted" />
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-bg-card p-6"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="mb-3 flex animate-pulse gap-2">
                <div className="h-3 w-12 rounded bg-bg-muted" />
                <div className="h-3 w-20 rounded bg-bg-muted" />
              </div>
              <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-bg-muted" />
              <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}