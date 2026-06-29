// ============================================================
// /admin/pages/new - 新建页面 (Phase 3.5)
// ============================================================
import { PageForm } from "../_components/PageForm";

export const dynamic = "force-dynamic";

export default function NewPagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📄 新建页面</h1>
        <p className="mt-1 text-sm text-fg-muted">
          页面用于静态内容(如"关于/友链/项目集"),3.7 PageBuilder 升级后可视化编辑 blocks。
        </p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <PageForm mode="create" />
      </div>
    </div>
  );
}
