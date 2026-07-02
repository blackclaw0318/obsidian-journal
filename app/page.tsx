// ============================================================
// 首页 (v0.20 C 升级)
//  - Server Component 拉数据 + SEO JSON-LD
//  - Hero / 列表用 client 子组件做入场动画 (framer-motion)
//  - 卡片 hover 加强: y 轴微抬 + 阴影 + 边框高亮
//  - 严守 v0.6.1: PostCategory / NovelStatus / published+deleted_at 过滤
// ============================================================
import Link from "next/link";
import { postRepo, novelRepo, siteConfigRepo, socialRepo } from "@/lib/repo";
import { formatDate, truncate, formatCount } from "@/lib/utils";
import { jsonLdWebSite } from "@/lib/seo";
import { HomeHero } from "@/components/HomeHero";
import { RevealOnScroll } from "@/components/RevealOnScroll";

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
  const siteTagline = siteConfig?.site_description ?? "用代码与数据说话";
  const avatarUrl =
    siteConfig?.avatar_url ?? "/uploads/avatars/avatar-default.png";
  const ldWebsite = siteConfig ? jsonLdWebSite(siteConfig) : null;

  const stats = [
    { label: "篇文章", value: formatCount(publishedCount), emoji: "📝" },
    { label: "部小说", value: formatCount(novelCount), emoji: "📚" }
  ];
  if (socials.length > 0) {
    stats.push({ label: "社交链接", value: formatCount(socials.length), emoji: "🔗" });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {ldWebsite && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldWebsite }}
        />
      )}

      {/* Hero (client 入场动画) */}
      <HomeHero
        siteName={siteName}
        tagline={siteTagline}
        avatarUrl={avatarUrl}
        stats={stats}
      />

      {/* 最新文章 */}
      <RevealOnScroll as="section" amount={0.15} className="mb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">最新文章</h2>
          <Link
            href="/posts"
            className="text-sm text-fg-muted transition-colors hover:text-fg"
          >
            查看全部 →
          </Link>
        </div>

        {latestPosts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center">
            <p className="text-fg-muted">还没有发布的文章。</p>
            <Link
              href="/admin"
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              前往管理后台 →
            </Link>
          </div>
        ) : (
          <ul className="space-y-6">
            {latestPosts.map((post, i) => (
              <RevealOnScroll
                as="li"
                key={post.id}
                delay={0.05 + i * 0.06}
                y={12}
              >
                <PostCard post={post} />
              </RevealOnScroll>
            ))}
          </ul>
        )}
      </RevealOnScroll>

      {/* 最新小说 */}
      {latestNovel && (
        <RevealOnScroll as="section" amount={0.15} className="mb-16">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">最新小说</h2>
            <Link
              href={`/novels/${latestNovel.slug}`}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              进入阅读 →
            </Link>
          </div>
          <div className="group rounded-lg border border-border bg-bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-strong hover:shadow-lg active:scale-[0.99] active:transition-none">
            <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-accent">
              <Link href={`/novels/${latestNovel.slug}`}>
                {latestNovel.title}
              </Link>
            </h3>
            {latestNovel.description && (
              <p className="mb-4 text-fg-muted">{latestNovel.description}</p>
            )}
            {latestNovel.volumes.length > 0 ? (
              <div className="space-y-3">
                {latestNovel.volumes.slice(0, 2).map((vol) => (
                  <div key={vol.id}>
                    <div className="text-sm font-medium text-fg-muted">
                      第 {vol.order} 卷 · {vol.title}
                    </div>
                    {vol.chapters.length > 0 && (
                      <ul className="ml-4 mt-2 space-y-1 text-sm">
                        {vol.chapters.slice(0, 3).map((ch) => (
                          <li key={ch.id}>
                            <Link
                              href={`/chapters/${ch.slug}`}
                              className="text-fg-muted transition-colors hover:text-accent"
                            >
                              · 第{ch.order}章 {ch.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-fg-muted">暂无章节</p>
            )}
          </div>
        </RevealOnScroll>
      )}

      {/* 社交链接 */}
      {socials.length > 0 && (
        <RevealOnScroll as="section" amount={0.15}>
          <h2 className="mb-4 text-lg font-semibold">联系</h2>
          <div className="flex flex-wrap gap-3">
            {socials.map((s, i) => (
              <RevealOnScroll
                as="div"
                key={s.id}
                delay={0.05 + i * 0.05}
                y={8}
                className="inline-block"
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg border border-border bg-bg-card px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-strong hover:shadow-md active:scale-[0.97] active:transition-none"
                >
                  {s.label}
                </a>
              </RevealOnScroll>
            ))}
          </div>
        </RevealOnScroll>
      )}
    </div>
  );
}

/** 文章卡片 — Tailwind hover 已能提供微动 (transition + shadow + y -2) */
function PostCard({ post }: { post: any }) {
  return (
    <article className="group rounded-lg border border-border bg-bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-strong hover:shadow-lg active:scale-[0.99] active:transition-none">
      <div className="mb-2 flex items-center gap-2 text-xs text-fg-muted">
        <span className="rounded bg-bg-muted px-2 py-0.5 uppercase">
          {post.category}
        </span>
        <time>
          {post.published_at
            ? formatDate(new Date(post.published_at * 1000))
            : "草稿"}
        </time>
        <span>·</span>
        <span>{formatCount(post.view_count)} 阅读</span>
      </div>
      <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-accent">
        <Link href={`/posts/${post.slug}`}>{post.title}</Link>
      </h3>
      {post.excerpt && (
        <p className="text-fg-muted">{truncate(post.excerpt, 180)}</p>
      )}
      <div className="mt-3 text-xs text-fg-muted">
        作者: {post.author.name ?? post.author.email}
      </div>
    </article>
  );
}