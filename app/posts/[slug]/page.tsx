import { notFound } from "next/navigation";
import { postRepo } from "@/lib/repo";
import { formatDate, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function PostDetailPage({ params }: { params: { slug: string } }) {
  const post = postRepo.bySlug(params.slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  // 累加 view (v0.3 §23: 防刷逻辑 Phase 4 加)
  postRepo.incrementView(post.id);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-xs text-fg-muted">
          <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
            {post.category}
          </span>
          {post.published_at && <time>{formatDate(new Date(post.published_at * 1000))}</time>}
          <span>·</span>
          <span>{formatCount(post.view_count + 1)} 阅读</span>
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">{post.title}</h1>
        {post.excerpt && (
          <p className="text-lg text-fg-muted">{post.excerpt}</p>
        )}
        <div className="mt-4 text-sm text-fg-muted">
          作者: {post.author.name ?? post.author.email}
        </div>
      </header>

      {/* Markdown 渲染: P2 换 react-markdown + remark-gfm, P1 简单按行渲染 */}
      <div className="prose">
        {post.content.split("\n").map((line, idx) => {
          if (line.startsWith("# ")) return null; // 标题已在 header
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx}>{line.replace(/^## /, "")}</h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx}>{line.replace(/^### /, "")}</h3>
            );
          }
          if (line.trim().startsWith("- ")) {
            return (
              <ul key={idx}>
                <li>{line.replace(/^- /, "")}</li>
              </ul>
            );
          }
          if (line.trim() === "") return null;
          return <p key={idx}>{line}</p>;
        })}
      </div>
    </article>
  );
}