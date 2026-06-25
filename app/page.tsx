import Link from "next/link";
import { postRepo, novelRepo, siteConfigRepo, socialRepo } from "@/lib/repo";
import { formatDate, truncate, formatCount } from "@/lib/utils";
import { jsonLdWebSite } from "@/lib/seo";

// 强制动态渲染 (避免 dev 缓存空数据)
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 并行查询 (v0.6 P1.4 公开首页)
  const [latestPosts, publishedCount, novelCount, latestNovel, siteConfig, socials] = await Promise.all([
    Promise.resolve(postRepo.list({ status: "published", limit: 5 })),
    Promise.resolve(postRepo.count("published")),
    Promise.resolve(novelRepo.count()),
    Promise.resolve(novelRepo.latest()),
    Promise.resolve(siteConfigRepo.get()),
    Promise.resolve(socialRepo.list())
  ]);

  const siteName = siteConfig?.site_name ?? "黑曜石日志";
  const siteTagline = siteConfig?.site_tagline ?? "用代码与数据说话";
  const ldWebsite = siteConfig ? jsonLdWebSite(siteConfig) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {ldWebsite && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldWebsite }}
        />
      )}
      {/* Hero */}
      <section className="mb-16">
        <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
          {siteName}
        </h1>
        <p className="text-lg text-fg-muted">{siteTagline}</p>
        <div className="mt-6 flex items-center gap-6 text-sm text-fg-muted">
          <span>📝 {publishedCount} 篇文章</span>
          <span>📚 {novelCount} 部小说</span>
          {socials.length > 0 && <span>🔗 {socials.length} 社交链接</span>}
        </div>
      </section>

      {/* 最新文章 */}
      <section className="mb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">最新文章</h2>
          <Link href="/posts" className="text-sm text-fg-muted hover:text-fg">
            查看全部 →
          </Link>
        </div>

        {latestPosts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center">
            <p className="text-fg-muted">还没有发布的文章。</p>
            <Link href="/admin" className="mt-4 inline-block text-sm text-accent hover:underline">
              前往管理后台 →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {latestPosts.map((post) => (
              <article
                key={post.id}
                className="group rounded-lg border border-border bg-bg-card p-6 transition hover:border-strong hover:shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-fg-muted">
                  <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
                    {post.category}
                  </span>
                  <time>{post.published_at ? formatDate(new Date(post.published_at * 1000)) : "草稿"}</time>
                  <span>·</span>
                  <span>{formatCount(post.view_count)} 阅读</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold group-hover:text-accent">
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </h3>
                {post.excerpt && (
                  <p className="text-fg-muted">{truncate(post.excerpt, 180)}</p>
                )}
                <div className="mt-3 text-xs text-fg-muted">
                  作者: {post.author.name ?? post.author.email}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 最新小说 */}
      {latestNovel && (
        <section className="mb-16">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">最新小说</h2>
            <Link href={`/novels/${latestNovel.slug}`} className="text-sm text-fg-muted hover:text-fg">
              进入阅读 →
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-bg-card p-6">
            <h3 className="mb-2 text-xl font-semibold">{latestNovel.title}</h3>
            {latestNovel.description && (
              <p className="mb-4 text-fg-muted">{latestNovel.description}</p>
            )}
            <div className="space-y-3">
              {latestNovel.volumes.slice(0, 2).map((vol) => (
                <div key={vol.id}>
                  <div className="text-sm font-medium text-fg-muted">
                    第 {vol.order} 卷 · {vol.title}
                  </div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm">
                    {vol.chapters.slice(0, 3).map((ch) => (
                      <li key={ch.id}>
                        <Link
                          href={`/chapters/${ch.slug}`}
                          className="text-fg-muted hover:text-accent"
                        >
                          · 第{ch.order}章 {ch.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 社交链接 */}
      {socials.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">联系</h2>
          <div className="flex flex-wrap gap-3">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-bg-card px-4 py-2 text-sm hover:border-strong"
              >
                {s.label}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}