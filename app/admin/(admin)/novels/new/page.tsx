// ============================================================
// /admin/novels/new - 新建小说 (Phase 3.3)
// ============================================================
import Link from "next/link";
import { NovelForm } from "../_components/NovelForm";

export default function NewNovelPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/novels" className="text-sm text-fg-muted hover:text-accent">
          ← 返回小说列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">📚 新建小说</h1>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <NovelForm mode="create" />
      </div>
    </div>
  );
}