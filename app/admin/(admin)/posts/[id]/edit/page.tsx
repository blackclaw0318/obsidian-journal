// ============================================================
// /admin/posts/[id]/edit - 编辑 (Phase 3.2)
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { postRepo } from "@/lib/repo";
import { PostForm } from "../../_components/PostForm";

export const dynamic = "force-dynamic";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const post = postRepo.byId(params.id);
  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/posts" className="text-sm text-fg-muted hover:text-accent">
          ← 返回列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">✏️ 编辑帖子</h1>
        <p className="mt-1 text-sm text-fg-muted">
          ID: <code className="font-mono text-xs">{post.id}</code> · slug: <code className="font-mono text-xs">{post.slug}</code>
        </p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <PostForm
          mode="edit"
          initial={{
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt ?? "",
            content: post.content,
            cover_image: post.cover_image,
            status: post.status,
            category: post.category,
            tags: post.tags ?? ""
          }}
        />
      </div>
    </div>
  );
}