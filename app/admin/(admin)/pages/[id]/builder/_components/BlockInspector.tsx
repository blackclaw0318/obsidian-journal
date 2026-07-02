// ============================================================
// BlockInspector 右栏 (v0.14, v0.6.1 §21.1)
// per-block 简单 form (Phase 1 基础版, 13 种全覆盖)
// ============================================================

"use client";

import { usePageBuilder } from "@/lib/page-builder/store";
import type { Block } from "@/lib/blocks";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded border border-border bg-bg px-2 py-1 text-sm focus:border-fg focus:outline-none";

function TextInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "text") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Markdown 内容">
        <textarea
          value={block.content}
          onChange={(e) => update(block.id, { content: e.target.value })}
          className={`${inputCls} min-h-[120px] font-mono text-xs`}
        />
      </Field>
    </div>
  );
}

function HeadingInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "heading") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="标题文字">
        <input
          value={block.text}
          onChange={(e) => update(block.id, { text: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="级别">
        <select
          value={block.level}
          onChange={(e) => update(block.id, { level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })}
          className={inputCls}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>H{n}</option>)}
        </select>
      </Field>
      <Field label="锚点 (可选)">
        <input
          value={block.anchor ?? ""}
          onChange={(e) => update(block.id, { anchor: e.target.value || undefined })}
          className={inputCls}
        />
      </Field>
    </div>
  );
}

function ImageInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "image") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="图片 URL (支持 /media/...)">
        <input value={block.src} onChange={(e) => update(block.id, { src: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Alt 描述">
        <input value={block.alt ?? ""} onChange={(e) => update(block.id, { alt: e.target.value })} className={inputCls} />
      </Field>
      <Field label="说明文字 (可选)">
        <input value={block.caption ?? ""} onChange={(e) => update(block.id, { caption: e.target.value })} className={inputCls} />
      </Field>
    </div>
  );
}

function VideoInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "video") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="视频 URL">
        <input value={block.src} onChange={(e) => update(block.id, { src: e.target.value })} className={inputCls} />
      </Field>
      <Field label="封面图 URL (可选)">
        <input value={block.poster ?? ""} onChange={(e) => update(block.id, { poster: e.target.value })} className={inputCls} />
      </Field>
    </div>
  );
}

function GalleryInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "gallery") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="列数">
        <select
          value={block.columns ?? 3}
          onChange={(e) => update(block.id, { columns: Number(e.target.value) as 2 | 3 | 4 })}
          className={inputCls}
        >
          {[2, 3, 4].map((n) => <option key={n} value={n}>{n} 列</option>)}
        </select>
      </Field>
      <Field label="图片数">
        <input
          type="number"
          min="0"
          value={block.images.length}
          onChange={(e) => {
            const n = Math.max(0, Number(e.target.value));
            const next = [...block.images];
            while (next.length < n) next.push({ src: "", alt: "" });
            while (next.length > n) next.pop();
            update(block.id, { images: next });
          }}
          className={inputCls}
        />
      </Field>
      <details className="text-xs">
        <summary className="cursor-pointer text-fg-muted">编辑每张图 URL/Alt ({block.images.length} 张)</summary>
        <div className="mt-2 flex flex-col gap-2">
          {block.images.map((img, i) => (
            <div key={i} className="flex flex-col gap-1">
              <input
                placeholder="URL"
                value={img.src}
                onChange={(e) => {
                  const next = [...block.images];
                  next[i] = { ...next[i], src: e.target.value };
                  update(block.id, { images: next });
                }}
                className={inputCls}
              />
              <input
                placeholder="Alt"
                value={img.alt ?? ""}
                onChange={(e) => {
                  const next = [...block.images];
                  next[i] = { ...next[i], alt: e.target.value };
                  update(block.id, { images: next });
                }}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function QuoteInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "quote") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="引文"><textarea value={block.text} onChange={(e) => update(block.id, { text: e.target.value })} className={`${inputCls} min-h-[80px]`} /></Field>
      <Field label="出处 (可选)"><input value={block.cite ?? ""} onChange={(e) => update(block.id, { cite: e.target.value })} className={inputCls} /></Field>
    </div>
  );
}

function CalloutInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "callout") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="变体">
        <select value={block.variant} onChange={(e) => update(block.id, { variant: e.target.value as "info" | "warning" | "success" | "danger" })} className={inputCls}>
          {["info", "warning", "success", "danger"].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="标题 (可选)"><input value={block.title ?? ""} onChange={(e) => update(block.id, { title: e.target.value })} className={inputCls} /></Field>
      <Field label="内容 (Markdown)"><textarea value={block.content} onChange={(e) => update(block.id, { content: e.target.value })} className={`${inputCls} min-h-[80px]`} /></Field>
    </div>
  );
}

function CodeInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "code") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="语言"><input value={block.language} onChange={(e) => update(block.id, { language: e.target.value })} className={inputCls} /></Field>
      <Field label="文件名 (可选)"><input value={block.filename ?? ""} onChange={(e) => update(block.id, { filename: e.target.value })} className={inputCls} /></Field>
      <Field label="代码"><textarea value={block.code} onChange={(e) => update(block.id, { code: e.target.value })} className={`${inputCls} min-h-[160px] font-mono text-xs`} /></Field>
    </div>
  );
}

function ListInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "list") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="类型">
        <select value={block.ordered ? "ol" : "ul"} onChange={(e) => update(block.id, { ordered: e.target.value === "ol" })} className={inputCls}>
          <option value="ul">无序</option>
          <option value="ol">有序</option>
        </select>
      </Field>
      <Field label="项目数">
        <input
          type="number"
          min="1"
          value={block.items.length}
          onChange={(e) => {
            const n = Math.max(1, Number(e.target.value));
            const next = [...block.items];
            while (next.length < n) next.push("");
            while (next.length > n) next.pop();
            update(block.id, { items: next });
          }}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-col gap-1">
        {block.items.map((item, i) => (
          <input
            key={i}
            value={item}
            placeholder={`项目 ${i + 1}`}
            onChange={(e) => {
              const next = [...block.items];
              next[i] = e.target.value;
              update(block.id, { items: next });
            }}
            className={inputCls}
          />
        ))}
      </div>
    </div>
  );
}

function TableInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "table") return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-fg-muted">表头 / 行编辑请手动改 JSON (Phase 1 简版, v0.15 加 UI)</div>
      <Field label="列数 (header)">
        <input
          type="number"
          min="1"
          value={block.headers.length}
          onChange={(e) => {
            const n = Math.max(1, Number(e.target.value));
            const next = [...block.headers];
            while (next.length < n) next.push(`列${next.length + 1}`);
            while (next.length > n) next.pop();
            update(block.id, { headers: next });
          }}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-col gap-1">
        {block.headers.map((h, i) => (
          <input key={i} value={h} onChange={(e) => {
            const next = [...block.headers]; next[i] = e.target.value; update(block.id, { headers: next });
          }} className={inputCls} />
        ))}
      </div>
    </div>
  );
}

function CustomHtmlInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "custom_html") return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-700">
        ⚠️ CustomHtml 受 SiteConfig.allowCustomHtml 控制,且会过 DOMPurify 清洗
      </div>
      <Field label="HTML 源码">
        <textarea value={block.html} onChange={(e) => update(block.id, { html: e.target.value })} className={`${inputCls} min-h-[200px] font-mono text-xs`} />
      </Field>
    </div>
  );
}

function MusicInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "music") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="音频 URL"><input value={block.src} onChange={(e) => update(block.id, { src: e.target.value })} className={inputCls} /></Field>
      <Field label="标题"><input value={block.title ?? ""} onChange={(e) => update(block.id, { title: e.target.value })} className={inputCls} /></Field>
      <Field label="艺术家"><input value={block.artist ?? ""} onChange={(e) => update(block.id, { artist: e.target.value })} className={inputCls} /></Field>
    </div>
  );
}

// ============================================================
// v0.26 复合 Block Inspector (v0.6.1 §21.2)
// ============================================================

function HeroInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "hero") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="主标题 *"><input value={block.title} onChange={(e) => update(block.id, { title: e.target.value })} className={inputCls} /></Field>
      <Field label="副标题"><input value={block.subtitle ?? ""} onChange={(e) => update(block.id, { subtitle: e.target.value })} className={inputCls} /></Field>
      <Field label="CTA 按钮文字"><input value={block.ctaText ?? ""} onChange={(e) => update(block.id, { ctaText: e.target.value })} className={inputCls} /></Field>
      <Field label="CTA 跳转 URL"><input value={block.ctaUrl ?? ""} onChange={(e) => update(block.id, { ctaUrl: e.target.value })} className={inputCls} placeholder="/posts" /></Field>
      <Field label="背景图 URL (可选)"><input value={block.bgImage ?? ""} onChange={(e) => update(block.id, { bgImage: e.target.value })} className={inputCls} placeholder="/media/xxx.jpg" /></Field>
    </div>
  );
}

function StatsInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "stats") return null;
  const items = block.items;
  const setItem = (i: number, patch: Partial<typeof items[number]>) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    update(block.id, { items: next });
  };
  const addItem = () => update(block.id, { items: [...items, { label: "新项", value: 0 }] });
  const removeItem = (i: number) => update(block.id, { items: items.filter((_, idx) => idx !== i) });
  return (
    <div className="flex flex-col gap-3">
      <Field label="列数">
        <select value={block.columns ?? 4} onChange={(e) => update(block.id, { columns: Number(e.target.value) as 2 | 3 | 4 })} className={inputCls}>
          <option value={2}>2 列</option>
<option value={3}>3 列</option>
          <option value={4}>4 列</option>
        </select>
      </Field>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-fg-muted">Items ({items.length})</div>
        {items.map((it, i) => (
          <div key={i} className="flex gap-1">
            <input value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} placeholder="标签" className={`${inputCls} flex-1`} />
            <input type="number" value={it.value} onChange={(e) => setItem(i, { value: Number(e.target.value) })} placeholder="值" className={`${inputCls} w-16`} />
            <input value={it.suffix ?? ""} onChange={(e) => setItem(i, { suffix: e.target.value })} placeholder="后缀" className={`${inputCls} w-12`} />
            <button onClick={() => removeItem(i)} className="rounded border border-border px-1.5 text-xs text-fg-muted hover:text-fg">✕</button>
          </div>
        ))}
        <button onClick={addItem} className="rounded border border-dashed border-border py-1 text-xs text-fg-muted hover:bg-bg-muted">+ 添加项</button>
      </div>
    </div>
  );
}

function SkillsInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "skills") return null;
  const items = block.items;
  const setItem = (i: number, patch: Partial<typeof items[number]>) => {
    update(block.id, { items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  };
  const addItem = () => update(block.id, { items: [...items, { name: "新技能", level: 50 }] });
  const removeItem = (i: number) => update(block.id, { items: items.filter((_, idx) => idx !== i) });
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-fg-muted">技能 ({items.length})</div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-1">
          <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="名称" className={`${inputCls} flex-1`} />
          <input type="number" min={0} max={100} value={it.level} onChange={(e) => setItem(i, { level: Math.max(0, Math.min(100, Number(e.target.value))) })} placeholder="0-100" className={`${inputCls} w-16`} />
          <button onClick={() => removeItem(i)} className="rounded border border-border px-1.5 text-xs text-fg-muted hover:text-fg">✕</button>
        </div>
      ))}
      <button onClick={addItem} className="rounded border border-dashed border-border py-1 text-xs text-fg-muted hover:bg-bg-muted">+ 添加技能</button>
    </div>
  );
}

function TimelineInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "timeline") return null;
  const items = block.items;
  const setItem = (i: number, patch: Partial<typeof items[number]>) => {
    update(block.id, { items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  };
  const addItem = () => update(block.id, { items: [...items, { date: "2026-01", title: "新事件" }] });
  const removeItem = (i: number) => update(block.id, { items: items.filter((_, idx) => idx !== i) });
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-fg-muted">事件 ({items.length})</div>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-1 rounded border border-border p-2">
          <div className="flex gap-1">
            <input value={it.date} onChange={(e) => setItem(i, { date: e.target.value })} placeholder="日期 (2026-01)" className={`${inputCls} w-28`} />
            <input value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="标题" className={`${inputCls} flex-1`} />
            <button onClick={() => removeItem(i)} className="rounded border border-border px-1.5 text-xs text-fg-muted hover:text-fg">✕</button>
          </div>
          <textarea value={it.content ?? ""} onChange={(e) => setItem(i, { content: e.target.value })} placeholder="内容 (可选)" className={`${inputCls} min-h-[40px] font-mono text-xs`} />
        </div>
      ))}
      <button onClick={addItem} className="rounded border border-dashed border-border py-1 text-xs text-fg-muted hover:bg-bg-muted">+ 添加事件</button>
    </div>
  );
}

function LinksInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "links") return null;
  const links = block.links;
  const setLink = (i: number, patch: Partial<typeof links[number]>) => {
    update(block.id, { links: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  };
  const addLink = () => update(block.id, { links: [...links, { name: "新链接", url: "https://" }] });
  const removeLink = (i: number) => update(block.id, { links: links.filter((_, idx) => idx !== i) });
  return (
    <div className="flex flex-col gap-3">
      <Field label="列数">
        <select value={block.columns ?? 2} onChange={(e) => update(block.id, { columns: Number(e.target.value) as 2 | 3 })} className={inputCls}>
          <option value={2}>2 列</option>
<option value={3}>3 列</option>
        </select>
      </Field>
      <div className="text-xs font-medium text-fg-muted">链接 ({links.length})</div>
      {links.map((l, i) => (
        <div key={i} className="flex flex-col gap-1 rounded border border-border p-2">
          <div className="flex gap-1">
            <input value={l.name} onChange={(e) => setLink(i, { name: e.target.value })} placeholder="名称" className={`${inputCls} flex-1`} />
            <button onClick={() => removeLink(i)} className="rounded border border-border px-1.5 text-xs text-fg-muted hover:text-fg">✕</button>
          </div>
          <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="URL (https://...)" className={inputCls} />
          <input value={l.desc ?? ""} onChange={(e) => setLink(i, { desc: e.target.value })} placeholder="简介 (可选)" className={inputCls} />
        </div>
      ))}
      <button onClick={addLink} className="rounded border border-dashed border-border py-1 text-xs text-fg-muted hover:bg-bg-muted">+ 添加链接</button>
    </div>
  );
}

function PostsInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "posts") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="分类 (留空 = 全部)">
        <select value={block.category ?? ""} onChange={(e) => update(block.id, { category: (e.target.value || undefined) as "tech" | "life" | undefined })} className={inputCls}>
          <option value="">全部</option>
          <option value="tech">技术</option>
          <option value="life">生活</option>
        </select>
      </Field>
      <Field label="数量限制">
        <input type="number" min={1} max={50} value={block.limit ?? 6} onChange={(e) => update(block.id, { limit: Math.max(1, Math.min(50, Number(e.target.value))) })} className={inputCls} />
      </Field>
      <Field label="排序">
        <select value={block.sortBy ?? "new"} onChange={(e) => update(block.id, { sortBy: e.target.value as "new" | "hot" })} className={inputCls}>
          <option value="new">最新 (按发布时间)</option>
          <option value="hot">最热 (按 view_count)</option>
        </select>
      </Field>
      <div className="rounded border border-dashed border-border p-2 text-xs text-fg-muted">
        💡 自动从数据库拉取 published 文章, 公开页面 + 后台预览均生效
      </div>
    </div>
  );
}

function VideosInspector({ block }: { block: Block }) {
  const { update } = usePageBuilder();
  if (block.type !== "videos") return null;
  return (
    <div className="flex flex-col gap-3">
      <Field label="数量限制">
        <input type="number" min={1} max={50} value={block.limit ?? 6} onChange={(e) => update(block.id, { limit: Math.max(1, Math.min(50, Number(e.target.value))) })} className={inputCls} />
      </Field>
      <div className="rounded border border-dashed border-border p-2 text-xs text-fg-muted">
        💡 自动从数据库拉取 published 视频
      </div>
    </div>
  );
}

function DividerInspector() {
  return <div className="text-xs text-fg-muted">分割线无配置项</div>;
}

const INSPECTORS: Record<string, React.ComponentType<{ block: Block }>> = {
  text: TextInspector,
  heading: HeadingInspector,
  image: ImageInspector,
  video: VideoInspector,
  gallery: GalleryInspector,
  quote: QuoteInspector,
  callout: CalloutInspector,
  code: CodeInspector,
  divider: DividerInspector as unknown as React.ComponentType<{ block: Block }>,
  list: ListInspector,
  table: TableInspector,
  custom_html: CustomHtmlInspector,
  music: MusicInspector,
  // v0.26 复合 Block
  hero: HeroInspector,
  stats: StatsInspector,
  skills: SkillsInspector,
  timeline: TimelineInspector,
  links: LinksInspector,
  posts: PostsInspector,
  videos: VideosInspector
};

export function BlockInspector() {
  const { state } = usePageBuilder();
  const block = state.blocks.find((b) => b.id === state.selectedId) ?? null;
  if (!block) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-bg-card p-6 text-sm text-fg-muted">
        ← 点击中间 Block 编辑属性
      </div>
    );
  }
  const Inspector = INSPECTORS[block.type];
  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-bg-card p-3">
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-fg-muted">⚙️ {block.type}</h2>
      </div>
      {Inspector ? <Inspector block={block} /> : <div className="text-xs text-fg-muted">未知 Block 类型</div>}
    </div>
  );
}
