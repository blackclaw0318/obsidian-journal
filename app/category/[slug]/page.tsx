// ============================================================
// 5 专栏动态路由 (Phase 2.1)
// - tech/life: Post 列表 (postRepo.listByCategory)
// - novel: Novel 列表 (novelRepo.list)
// - video: VideoSeries 列表 (videoSeriesRepo.list)
// - media: Media 列表 (mediaRepo.list)
// ============================================================
import { notFound } from "next/navigation";
import Link from "next/link";
import type { VideoSeries } from "../../../lib/types";
import { postRepo, novelRepo, videoSeriesRepo } from "../../../lib/repo";

export const dynamic = "force-dynamic";

const CATEGORY_META: Record<string, { name: string; tagline: string; emoji: string }> = {
  tech:   { name: "技术",   tagline: "代码 / AI / 架构 / 工程化", emoji: "⚡" },
  life:   { name: "生活",   tagline: "日常 / 思考 / 创业 / 杂感", emoji: "🌿" },
  novel:  { name: "小说",   tagline: "多卷长篇 (Novel + Volume 双层)", emoji: "📖" },
  video:  { name: "视频",   tagline: "视频系列 + 单集", emoji: "🎬" },
  media:  { name: "媒体",   tagline: "图片 / 音频 / 文件库 (Phase 3 完整实现)", emoji: "🖼️" }
};

interface PageProps {
  params: { slug: string };
}

export default function CategoryPage({ params }: PageProps) {
  const meta = CATEGORY_META[params.slug];
  if (!meta) {
    notFound();
  }

  const sections = renderCategory(params.slug);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span aria-hidden="true">{meta.emoji}</span>
          <span>{meta.name}</span>
        </h1>
        <p className="text-fg/70 mt-2">{meta.tagline}</p>
        <div className="mt-4 text-sm text-fg/50">
          5 专栏之 <code className="px-1.5 py-0.5 rounded bg-bg/50 border border-border">/category/{params.slug}</code>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {Object.keys(CATEGORY_META).map((slug) => (
          <Link
            key={slug}
            href={`/category/${slug}`}
            className={
              "px-3 py-1.5 rounded border transition-colors " +
              (slug === params.slug
                ? "border-fg bg-fg/10 font-semibold"
                : "border-border hover:bg-bg/50")
            }
          >
            {CATEGORY_META[slug].emoji} {CATEGORY_META[slug].name}
          </Link>
        ))}
      </nav>

      <main>{sections}</main>

      <footer className="mt-12 pt-6 border-t border-border text-sm text-fg/50">
        <Link href="/" className="hover:underline">← 返回首页</Link>
      </footer>
    </div>
  );
}

function renderCategory(slug: string) {
  if (slug === "tech" || slug === "life") {
    const posts = postRepo.listByCategory({ category: slug, limit: 50 });
    if (posts.length === 0) {
      return <p className="text-fg/60">暂无{slug === "tech" ? "技术" : "生活"}文章。</p>;
    }
    return (
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id} className="border-b border-border pb-4">
            <Link href={`/posts/${post.slug}`} className="block hover:underline">
              <h2 className="text-xl font-semibold">{post.title}</h2>
            </Link>
            {post.excerpt && <p className="text-fg/70 mt-1">{post.excerpt}</p>}
            <div className="text-xs text-fg/50 mt-2">
              <time>{formatDate(post.published_at ?? post.created_at)}</time>
              {" · "}
              <span>{post.author.name ?? post.author.email}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (slug === "novel") {
    const novels = novelRepo.list();
    if (novels.length === 0) {
      return <p className="text-fg/60">暂无小说作品。</p>;
    }
    return (
      <ul className="space-y-4">
        {novels.map((novel) => (
          <li key={novel.id} className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold">{novel.title}</h2>
            {novel.description && <p className="text-fg/70 mt-1">{novel.description}</p>}
            <div className="text-xs text-fg/50 mt-2">status: {novel.status}</div>
          </li>
        ))}
      </ul>
    );
  }

  if (slug === "video") {
    const series = videoSeriesRepo.list();
    if (series.length === 0) {
      return <p className="text-fg/60">暂无视频系列。</p>;
    }
    return (
      <ul className="space-y-4">
        {series.map((s: VideoSeries) => (
          <li key={s.id} className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {s.description && <p className="text-fg/70 mt-1">{s.description}</p>}
          </li>
        ))}
      </ul>
    );
  }

  if (slug === "media") {
    // Phase 3 (Admin 后台) 实现 MediaItem 上传 + repo, Phase 2.1 占位
    return (
      <div className="border border-dashed border-border rounded p-6 text-fg/60">
        <p className="mb-2"><strong>媒体库</strong>将在 Phase 3 (Admin 后台) 完整实现。</p>
        <p className="text-sm">当前已规划 MediaItem 模型 (image/audio/video/file 4 类), 等 Phase 3 上传 UI + mediaRepo。</p>
      </div>
    );
  }

  return <p className="text-fg/60">未知专栏。</p>;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  // SQLite unixepoch 是秒
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
