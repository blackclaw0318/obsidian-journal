import Link from "next/link";
import { postRepo } from "@/lib/repo";
import { formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PostCategory = "tech" | "life";

const CATEGORIES: Array<{ slug: PostCategory | "all"; name: string; emoji: string; tagline: string }> = [
  { slug: "all",  name: "全部", emoji: "📚", tagline: "所有发布的文章" },
  { slug: "tech", name: "技术", emoji: "⚡", tagline: "代码 / AI / 架构 / 工程化" },
  { slug: "life", name: "生活", emoji: "🌿", tagline: "日常 / 思考 / 创业 / 杂感" }
];

interface PageProps {
  searchParams: { cat?: string; q?: string };
}

export default async function PostsPage({ searchParams }: PageProps) {
  // v0.6.1 schema: PostCategory = "tech" | "life", 严格按 schema
  const requestedCat = (searchParams.cat ?? "all").toLowerCase();
  const validCat = CATEGORIES.find((c) => c.slug === requestedCat) ?? CATEGORIES[0];
  const isAll = validCat.slug === "all";

  // Phase 2.2: FTS5 搜索 (与 cat 互斥 — q 优先)
  const q = (searchParams.q ?? "").trim();
  const isSearching = q.length > 0;

  const posts = isSearching
    ? postRepo.search({ q, status: "published", limit: 50 }).items
    : isAll
      ? postRepo.list({ status: "published" })
      : postRepo.listByCategory({ category: validCat.slug, status: "published" });

  const counts = {
    all: postRepo.count("published"),
    tech: postRepo.countByCategory("tech", "published"),
    life: postRepo.countByCategory("life", "published")
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          {isSearching ? `🔍 搜索: ${q}` : `${validCat.emoji} ${validCat.name}文章`}
        </h1>
        <p className="text-fg-muted mt-2">
          {isSearching ? `FTS5 全文检索 (Phase 2.2)` : validCat.tagline}
        </p>
      </header>

      {/* Phase 2.2: 搜索框 (GET /posts?q=) */}
      <form action="/posts" method="get" className="mb-6 flex gap-2">
        {isSearching ? null : (
          <input type="hidden" name="cat" value={isAll ? "all" : validCat.slug} />
        )}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="搜索文章 (标题/内容/标签)..."
          className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm focus:border-accent focus:outline-none"
          maxLength={100}
        />
        <button
          type="submit"
          className="rounded-lg bg-fg px-4 py-2 text-sm font-semibold text-bg hover:opacity-80"
        >
          搜索
        </button>
        {isSearching && (
          <Link
            href="/posts"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-bg-muted"
          >
            清除
          </Link>
        )}
      </form>

      {/* 分类 Sidebar/Tab (v0.6.1: 只有 tech/life + all) */}
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {CATEGORIES.map((c) => {
          const isActive = c.slug === validCat.slug;
          const count = counts[c.slug as keyof typeof counts];
          return (
            <Link
              key={c.slug}
              href={c.slug === "all" ? "/posts" : `/posts?cat=${c.slug}`}
              className={
                "px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 " +
                (isActive
                  ? "bg-fg text-bg font-semibold"
                  : "border border-border hover:bg-bg-muted text-fg-muted")
              }
            >
              <span>{c.emoji}</span>
              <span>{c.name}</span>
              <span className={"text-xs " + (isActive ? "opacity-80" : "opacity-60")}>({count})</span>
            </Link>
          );
        })}
      </nav>

      <main>
        <p className="text-sm text-fg-muted mb-4">共 {posts.length} 篇</p>

        {posts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center">
            <p className="text-fg-muted">
              {isSearching ? `未找到包含 "${q}" 的文章。` : isAll ? "还没有发布的文章。" : `${validCat.name}分类下还没有文章。`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-border bg-bg-card p-5 transition hover:border-strong"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-fg-muted">
                  <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
                    {post.category}
                  </span>
                  <time>
                    {post.published_at ? formatDate(new Date(post.published_at * 1000)) : "草稿"}
                  </time>
                </div>
                <h2 className="mb-2 text-lg font-semibold">
                  <Link href={`/posts/${post.slug}`} className="hover:text-accent">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-fg-muted">{truncate(post.excerpt, 160)}</p>
                )}
                <div className="mt-3 text-xs text-fg-muted">— {post.author.name ?? post.author.email}</div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
