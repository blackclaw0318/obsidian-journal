import Link from "next/link";
import { postRepo } from "@/lib/repo";
import { formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const posts = postRepo.list({ status: "published" });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">所有文章</h1>
      <p className="mb-8 text-fg-muted">共 {posts.length} 篇</p>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center">
          <p className="text-fg-muted">还没有发布的文章。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-border bg-bg-card p-5 transition hover:border-strong"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-fg-muted">
                <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
                  {post.category}
                </span>
                <time>{post.published_at ? formatDate(new Date(post.published_at * 1000)) : "草稿"}</time>
              </div>
              <h2 className="mb-2 text-lg font-semibold">
                <Link href={`/posts/${post.slug}`} className="hover:text-accent">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && (
                <p className="text-sm text-fg-muted">{truncate(post.excerpt, 160)}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}