// ============================================================
// 13 种 Block 渲染器 + Page Renderer (v0.12, v0.6.1 §6.1)
// 公开端 + Admin 预览共用
// ============================================================
"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";
import { Info, AlertTriangle, CheckCircle2, XCircle, Quote, Code2, Music, ArrowRight, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type {
  Block,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  GalleryBlock,
  QuoteBlock,
  CalloutBlock,
  CodeBlock,
  DividerBlock,
  ListBlock,
  TableBlock,
  CustomHtmlBlock,
  MusicBlock,
  HeroBlock,
  StatsBlock,
  SkillsBlock,
  TimelineBlock,
  LinksBlock,
  PostsBlock,
  VideosBlock,
  LinkItem
} from "./index";

// markdown-it 实例 (无 options 干扰, 输出纯净 HTML)
const md = new MarkdownIt({
  html: false,       // 文本块不允许 raw html (避免 XSS)
  linkify: true,
  breaks: false,
  typographer: true
});

// ============================================================
// 13 个 Block 渲染器
// ============================================================

function TextBlockView({ block }: { block: TextBlock }) {
  const html = useMemo(() => md.render(block.content), [block.content]);
  return <div className="prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const anchor = block.anchor ?? block.text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  const className = "scroll-mt-20";
  const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
  const cls = clsx(className, {
    "text-3xl font-bold mt-8 mb-4": block.level === 1,
    "text-2xl font-bold mt-6 mb-3": block.level === 2,
    "text-xl font-semibold mt-5 mb-2": block.level === 3,
    "text-lg font-semibold mt-4 mb-2": block.level === 4,
    "text-base font-semibold mt-3 mb-1": block.level === 5,
    "text-sm font-semibold mt-2 mb-1": block.level === 6
  });
  return <Tag id={anchor} className={cls}>{block.text}</Tag>;
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  const { src, alt, caption, width, height, lazy = true } = block;
  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        width={width}
        height={height}
        loading={lazy ? "lazy" : "eager"}
        className="rounded border border-border bg-bg-muted"
      />
      {caption && <figcaption className="mt-2 text-center text-sm text-fg-muted">{caption}</figcaption>}
    </figure>
  );
}

function VideoBlockView({ block }: { block: VideoBlock }) {
  const { src, poster, caption } = block;
  return (
    <figure className="my-6">
      <video src={src} poster={poster} controls className="w-full rounded border border-border bg-bg-muted" />
      {caption && <figcaption className="mt-2 text-center text-sm text-fg-muted">{caption}</figcaption>}
    </figure>
  );
}

function GalleryBlockView({ block }: { block: GalleryBlock }) {
  const cols = block.columns ?? 3;
  return (
    <div className={clsx("my-6 grid gap-3", {
      "grid-cols-2": cols === 2,
      "grid-cols-3": cols === 3,
      "grid-cols-4": cols === 4
    })}>
      {block.images.map((img, i) => (
        <figure key={i} className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt={img.alt ?? ""} loading="lazy" className="w-full rounded border border-border bg-bg-muted" />
          {img.caption && <figcaption className="text-center text-xs text-fg-muted">{img.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function QuoteBlockView({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className="my-4 flex gap-2 border-l-4 border-accent/40 bg-bg-muted/30 py-2 pl-4 pr-3 italic">
      <Quote className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
      <div>
        <div className="text-fg">{block.text}</div>
        {block.cite && <cite className="mt-1 block text-sm text-fg-muted not-italic">— {block.cite}</cite>}
      </div>
    </blockquote>
  );
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const styles: Record<CalloutBlock["variant"], { icon: any; border: string; bg: string; text: string }> = {
    info: { icon: Info, border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
    warning: { icon: AlertTriangle, border: "border-yellow-500/30", bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-300" },
    success: { icon: CheckCircle2, border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-700 dark:text-green-300" },
    danger: { icon: XCircle, border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300" }
  };
  const s = styles[block.variant];
  const Icon = s.icon;
  const html = useMemo(() => md.render(block.content), [block.content]);
  return (
    <div className={clsx("my-4 flex gap-3 rounded border p-3", s.border, s.bg)}>
      <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", s.text)} />
      <div className="flex-1 min-w-0">
        {block.title && <div className={clsx("mb-1 font-semibold", s.text)}>{block.title}</div>}
        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <div className="my-4 overflow-hidden rounded border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-bg-muted/50 px-3 py-1.5 text-xs text-fg-muted">
        <Code2 className="h-3.5 w-3.5" />
        <span className="font-mono">{block.language}</span>
        {block.filename && <span className="ml-2 font-mono">— {block.filename}</span>}
      </div>
      <pre className="overflow-x-auto bg-bg-muted/20 p-3 text-sm">
        <code className={`language-${block.language}`}>{block.code}</code>
      </pre>
    </div>
  );
}

function DividerBlockView() {
  return <hr className="my-8 border-border" />;
}

function ListBlockView({ block }: { block: ListBlock }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className={clsx("my-4 ml-6 space-y-1", {
      "list-decimal": block.ordered,
      "list-disc": !block.ordered
    })}>
      {block.items.map((item, i) => (
        <li key={i} className="prose prose-zinc dark:prose-invert">{item}</li>
      ))}
    </Tag>
  );
}

function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border border-border text-sm">
        <thead>
          <tr className="bg-bg-muted/50">
            {block.headers.map((h, i) => (
              <th key={i} className="border border-border px-3 py-1.5 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="border border-border px-3 py-1.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomHtmlBlockView({ block, allowCustomHtml }: { block: CustomHtmlBlock; allowCustomHtml: boolean }) {
  if (!allowCustomHtml) {
    return (
      <div className="my-4 rounded border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
        ⚠ CustomHtmlBlock 已禁用(在 SiteConfig.allowCustomHtml 关闭)。内容不渲染。
      </div>
    );
  }
  // 即使开启, 仍走 DOMPurify 二次清洗
  const clean = DOMPurify.sanitize(block.html, { USE_PROFILES: { html: true } });
  return <div className="my-4" dangerouslySetInnerHTML={{ __html: clean }} />;
}

function MusicBlockView({ block }: { block: MusicBlock }) {
  return (
    <div className="my-4 flex items-center gap-3 rounded border border-border bg-bg-muted/30 p-3">
      <Music className="h-5 w-5 text-fg-muted" />
      <div className="flex-1 min-w-0">
        <audio src={block.src} controls className="w-full" />
        {block.title && <div className="mt-1 text-sm">{block.title}{block.artist && <span className="text-fg-muted"> — {block.artist}</span>}</div>}
      </div>
    </div>
  );
}

// ============================================================
// 7 个复合 Block 渲染器 (v0.26, v0.6.1 §21.2)
// ============================================================

function HeroBlockView({ block }: { block: HeroBlock }) {
  return (
    <section
      className="relative my-8 overflow-hidden rounded-xl border border-border bg-bg-muted/40 px-8 py-16 text-center"
      style={block.bgImage ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${block.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <h1 className={clsx("text-4xl font-bold tracking-tight md:text-5xl", block.bgImage && "text-white")}>
        {block.title}
      </h1>
      {block.subtitle && (
        <p className={clsx("mx-auto mt-4 max-w-2xl text-lg", block.bgImage ? "text-white/90" : "text-fg-muted")}>
          {block.subtitle}
        </p>
      )}
      {block.ctaText && block.ctaUrl && (
        <a
          href={block.ctaUrl}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
        >
          {block.ctaText} <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}

function StatsBlockView({ block }: { block: StatsBlock }) {
  const cols = block.columns ?? 4;
  if (block.items.length === 0) {
    return <div className="my-4 text-sm text-fg-muted">[Stats] 空 — 编辑器里添加 items</div>;
  }
  return (
    <section className="my-8">
      <div className={clsx("grid gap-6", {
        "grid-cols-2": cols === 2,
        "grid-cols-3": cols === 3,
        "grid-cols-4": cols === 4
      })}>
        {block.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-bg-card p-6 text-center">
            <div className="text-3xl font-bold text-accent md:text-4xl">
              {item.value}
              {item.suffix && <span className="text-xl">{item.suffix}</span>}
            </div>
            <div className="mt-2 text-sm text-fg-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillsBlockView({ block }: { block: SkillsBlock }) {
  if (block.items.length === 0) {
    return <div className="my-4 text-sm text-fg-muted">[Skills] 空 — 编辑器里添加 items</div>;
  }
  return (
    <section className="my-6 space-y-3">
      {block.items.map((item, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium">{item.name}</span>
            <span className="font-mono text-xs text-fg-muted">{item.level}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(0, Math.min(100, item.level))}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

function TimelineBlockView({ block }: { block: TimelineBlock }) {
  if (block.items.length === 0) {
    return <div className="my-4 text-sm text-fg-muted">[Timeline] 空 — 编辑器里添加 items</div>;
  }
  return (
    <section className="my-6 space-y-4">
      {block.items.map((item, i) => (
        <div key={i} className="flex gap-4 border-l-2 border-accent/40 pl-4">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <time className="font-mono text-xs text-fg-muted">{item.date}</time>
              <h3 className="font-semibold">{item.title}</h3>
            </div>
            {item.content && <p className="mt-1 text-sm text-fg-muted">{item.content}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

function LinksBlockView({ block }: { block: LinksBlock }) {
  const cols = block.columns ?? 2;
  if (block.links.length === 0) {
    return <div className="my-4 text-sm text-fg-muted">[Links] 空 — 编辑器里添加 links</div>;
  }
  return (
    <section className={clsx("my-6 grid gap-3", {
      "grid-cols-2": cols === 2,
      "grid-cols-3": cols === 3
    })}>
      {block.links.map((link: LinkItem, i: number) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-lg border border-border bg-bg-card p-4 transition hover:border-accent hover:shadow-sm"
        >
          <div className="font-semibold group-hover:text-accent">{link.name}</div>
          {link.desc && <div className="mt-1 text-sm text-fg-muted">{link.desc}</div>}
          <div className="mt-2 truncate font-mono text-xs text-fg-muted">{link.url}</div>
        </a>
      ))}
    </section>
  );
}

// PostsBlock + VideosBlock: 客户端动态拉取 (useEffect + fetch)
// 注: 这里走公开端 /api/public/*, 不依赖 admin auth
function PostsBlockView({ block }: { block: PostsBlock }) {
  const limit = block.limit ?? 6;
  const [posts, setPosts] = useState<Array<{ slug: string; title: string; excerpt: string | null; category: string; published_at: number | null }> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const url = `/api/public/posts?limit=${limit}${block.category ? `&category=${block.category}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPosts(data.items);
        else setErr(data.error ?? "加载失败");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [limit, block.category]);

  if (err) return <div className="my-4 text-sm text-fg-muted">[Posts] 加载失败: {err}</div>;
  if (!posts) return <div className="my-4 text-sm text-fg-muted">[Posts] 加载中…</div>;
  if (posts.length === 0) return <div className="my-4 text-sm text-fg-muted">[Posts] 暂无文章</div>;

  return (
    <section className="my-6 grid gap-4 md:grid-cols-2">
      {posts.map((p) => (
        <a key={p.slug} href={`/posts/${p.slug}`} className="group block rounded-lg border border-border bg-bg-card p-4 transition hover:border-accent hover:shadow-sm">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="rounded bg-bg-muted px-2 py-0.5 font-mono">{p.category}</span>
            {p.published_at && <time>{new Date(p.published_at * 1000).toLocaleDateString("zh-CN")}</time>}
          </div>
          <h3 className="mt-2 font-semibold group-hover:text-accent">{p.title}</h3>
          {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{p.excerpt}</p>}
        </a>
      ))}
    </section>
  );
}

function VideosBlockView({ block }: { block: VideosBlock }) {
  const limit = block.limit ?? 6;
  const [videos, setVideos] = useState<Array<{ slug: string; title: string; description: string | null; cover_image: string | null; embed_url: string }> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/videos?limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setVideos(data.items);
        else setErr(data.error ?? "加载失败");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [limit]);

  if (err) return <div className="my-4 text-sm text-fg-muted">[Videos] 加载失败: {err}</div>;
  if (!videos) return <div className="my-4 text-sm text-fg-muted">[Videos] 加载中…</div>;
  if (videos.length === 0) return <div className="my-4 text-sm text-fg-muted">[Videos] 暂无视频</div>;

  return (
    <section className="my-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <a key={v.slug} href={`/videos/${v.slug}`} className="group block overflow-hidden rounded-lg border border-border bg-bg-card transition hover:border-accent hover:shadow-sm">
          {v.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.cover_image} alt={v.title} className="aspect-video w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-bg-muted text-fg-muted">
              <span>▶ 视频</span>
            </div>
          )}
          <div className="p-4">
            <h3 className="font-semibold group-hover:text-accent">{v.title}</h3>
            {v.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{v.description}</p>}
          </div>
        </a>
      ))}
    </section>
  );
}

// ============================================================
// BlockRenderer - 单个 Block 调度
// ============================================================

interface BlockRendererProps {
  block: Block;
  allowCustomHtml?: boolean;
}

export function BlockRenderer({ block, allowCustomHtml = false }: BlockRendererProps) {
  switch (block.type) {
    case "text": return <TextBlockView block={block} />;
    case "heading": return <HeadingBlockView block={block} />;
    case "image": return <ImageBlockView block={block} />;
    case "video": return <VideoBlockView block={block} />;
    case "gallery": return <GalleryBlockView block={block} />;
    case "quote": return <QuoteBlockView block={block} />;
    case "callout": return <CalloutBlockView block={block} />;
    case "code": return <CodeBlockView block={block} />;
    case "divider": return <DividerBlockView />;
    case "list": return <ListBlockView block={block} />;
    case "table": return <TableBlockView block={block} />;
    case "custom_html": return <CustomHtmlBlockView block={block} allowCustomHtml={allowCustomHtml} />;
    case "music": return <MusicBlockView block={block} />;
    case "hero": return <HeroBlockView block={block} />;
    case "stats": return <StatsBlockView block={block} />;
    case "skills": return <SkillsBlockView block={block} />;
    case "timeline": return <TimelineBlockView block={block} />;
    case "links": return <LinksBlockView block={block} />;
    case "posts": return <PostsBlockView block={block} />;
    case "videos": return <VideosBlockView block={block} />;
    default:
      // 未知类型 fallback
      return (
        <div className="my-4 rounded border border-dashed border-border bg-bg-muted/30 p-3 text-sm text-fg-muted">
          未知 Block 类型: {(block as { type: string }).type}
        </div>
      );
  }
}

// ============================================================
// PageRenderer - 多个 Block 容器 + blocks JSON 解析
// ============================================================

interface PageRendererProps {
  blocks: string | Block[];          // Page.blocks: JSON string of Block[]
  allowCustomHtml?: boolean;
}

export function PageRenderer({ blocks, allowCustomHtml = false }: PageRendererProps) {
  const blockList = useMemo<Block[]>(() => {
    if (Array.isArray(blocks)) return blocks;
    try {
      const parsed = JSON.parse(blocks);
      if (Array.isArray(parsed)) return parsed as Block[];
      return [];
    } catch {
      // 非 JSON, 当作 markdown 文本, 包装成单 TextBlock
      return [{ id: "fallback-1", type: "text", content: blocks }] as TextBlock[];
    }
  }, [blocks]);

  if (blockList.length === 0) {
    return <div className="text-fg-muted">空内容</div>;
  }

  return (
    <div className="space-y-2">
      {blockList.map((b, i) => (
        <BlockRenderer key={(b as { id?: string }).id ?? i} block={b} allowCustomHtml={allowCustomHtml} />
      ))}
    </div>
  );
}
