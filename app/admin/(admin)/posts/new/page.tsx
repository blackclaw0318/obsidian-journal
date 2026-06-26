// ============================================================
// /admin/posts/new - 新建 (Phase 3.2)
// ============================================================
import Link from "next/link";
import { PostForm } from "../_components/PostForm";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/posts" className="text-sm text-fg-muted hover:text-accent">
          ← 返回列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">📝 新建帖子</h1>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <PostForm mode="create" />
      </div>
    </div>
  );
}