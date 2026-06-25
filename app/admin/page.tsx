import { postRepo, novelRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">管理后台</h1>
      <p className="mb-8 text-fg-muted">v0.6 Phase 2.2 增量 - P3 完整实现</p>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">🛠 维护工具 (Phase 2.2)</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm text-fg-muted">
            <li>
              <a href="/admin/reindex" className="text-accent hover:underline" target="_blank" rel="noreferrer">
                🔧 /admin/reindex
              </a>{" "}
              — POST 重建 FTS5 全文搜索索引 (例行维护)
            </li>
            <li>📊 文章数: <strong>{postRepo.count("published")}</strong> published</li>
            <li>📚 小说数: <strong>{novelRepo.count()}</strong></li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">🚧 Phase 1 范围</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm text-fg-muted">
            <li>✅ Prisma schema (14 model)</li>
            <li>✅ Block 类型定义 (13 种)</li>
            <li>✅ 首页 + 文章列表 + 文章详情</li>
            <li>✅ Seed 数据</li>
            <li>⏳ NextAuth 登录 (P1.6 待补)</li>
            <li>⏳ Admin CRUD (Phase 3 实现)</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">📋 Phase 路线</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm text-fg-muted">
            <li><strong>P1 骨架</strong>: Next.js + Auth + Block 框架 (✅)</li>
            <li><strong>P2 展示</strong>: 5 专栏 + FTS5 + SEO + RSS (✅ 进行中)</li>
            <li><strong>P3 Admin</strong>: MD 上传 + Page Builder</li>
            <li><strong>P4 打磨</strong>: 性能 + 2c4g 压测 + 部署</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
