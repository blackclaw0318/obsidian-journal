# 架构细节 (v0.2)

> 配套 `DESIGN.md` §4 的展开, 给开发者看。

## A1. 渲染策略 (RSC vs CSR)

| 页面 | 渲染 | 原因 |
|---|---|---|
| `/`, `/about`, `/tech`, `/life`, `/novels`, `/videos` | RSC | SEO 关键 |
| `/series`, `/series/[slug]` | RSC | SEO |
| `/posts/[slug]`, `/chapters/[slug]`, `/videos/[id]` | RSC + 预渲染 | SSG |
| `/admin/*` (除登录) | RSC shell + 客户端 islands | 表格/上传/Builder 需交互 |
| `/login` | 全 Client | 表单 |
| 主题切换 / Lenis / dnd-kit | Client (no-SSR) | 浏览器 API / 拖拽 |
| Block 渲染器 | 客户端组件树 (RSC 渲染时挂载) | 互动 |

## A2. 数据流

```
[DB Read]   Post.findMany({ category, seriesId? })    → RSC 渲染列表
[DB Read]   Post.findUnique({ slug })                 → 渲染详情
[DB Read]   Series.findMany({ category, type })       → 系列列表
[DB Read]   Chapter.findMany({ seriesId, orderBy })   → 章节列表
[DB Read]   Page.findUnique({ key })                  → 解析 layout JSON, 渲染 Block[]
[DB Read]   Media.findMany({ type, q? })              → 媒体库

[DB Write]  Server Action: uploadPost()               → Post.create + FTS5 索引 + revalidate
[DB Write]  Server Action: uploadChapter()            → Chapter.create + FTS5 索引 + revalidate
[DB Write]  Server Action: savePageLayout()           → Page.layout.update + revalidate
[DB Write]  Server Action: uploadMedia()              → Media.create + sharp 处理

[Cache]     revalidatePath('/tech')
[Cache]     revalidateTag('post-' + slug)
```

## A3. MD 解析管线 (lib/md/compile.ts)

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

const schema = {
  tagNames: [...defaultSchema.tagNames, "video", "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    iframe: ["src", "width", "height", "allow", "sandbox", "referrerPolicy"],
  },
};

export async function compileMd(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } })
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
```

## A4. Block 注册表 (lib/blocks/registry.tsx) 🆕

```ts
import type { Block } from "./schemas";
import HeroBlock from "@/components/blocks/HeroBlock";
// ...

export const blockRegistry = {
  hero:       { schema: heroSchema,       component: HeroBlock,       label: "Hero 大标题", icon: "✨" },
  text:       { schema: textSchema,       component: TextBlock,       label: "文本段落", icon: "📝" },
  gallery:    { schema: gallerySchema,    component: GalleryBlock,    label: "图片画廊", icon: "🖼️" },
  stats:      { schema: statsSchema,      component: StatsBlock,      label: "数据统计", icon: "📊" },
  skills:     { schema: skillsSchema,     component: SkillsBlock,     label: "技能雷达", icon: "🎯" },
  timeline:   { schema: timelineSchema,   component: TimelineBlock,   label: "时间线", icon: "📅" },
  links:      { schema: linksSchema,      component: LinksBlock,      label: "友链", icon: "🔗" },
  posts:      { schema: postsSchema,      component: PostsBlock,      label: "文章列表", icon: "📰" },
  videos:     { schema: videosSchema,     component: VideosBlock,     label: "视频列表", icon: "🎬" },
  divider:    { schema: dividerSchema,    component: DividerBlock,    label: "分隔线", icon: "➖" },
  customHtml: { schema: customHtmlSchema, component: CustomHtmlBlock, label: "自定义 HTML ⚠️", icon: "⚠️", danger: true },
  marquee:    { schema: marqueeSchema,    component: MarqueeBlock,    label: "跑马灯", icon: "🎪" },
  music:      { schema: musicSchema,      component: MusicBlock,      label: "背景音乐", icon: "🎵" },
} as const;

export function renderBlock(block: Block) {
  const entry = blockRegistry[block.type];
  if (!entry) return null;
  const Comp = entry.component;
  return <Comp data={block.data} />;
}
```

## A5. 视频 URL 解析 (lib/video/detect.ts)

```ts
export type DetectedVideo =
  | { platform: "bilibili"; bvid: string }
  | { platform: "baidu"; surl: string; pwd: string }
  | { platform: "youtube"; id: string }
  | { platform: "unknown"; url: string };

const BILI_RE = /(BV[a-zA-Z0-9]{10})/;
const BAIDU_RE = /pan\.baidu\.com\/s\/([a-zA-Z0-9_-]+)(?:\?pwd=([a-zA-Z0-9]{4}))?/;
const YT_RE = /(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;

export function detectVideo(url: string): DetectedVideo {
  const bili = url.match(BILI_RE);
  if (bili) return { platform: "bilibili", bvid: bili[1] };
  const bd = url.match(BAIDU_RE);
  if (bd) return { platform: "baidu", surl: bd[1], pwd: bd[2] ?? "" };
  const yt = url.match(YT_RE);
  if (yt) return { platform: "youtube", id: yt[1] };
  return { platform: "unknown", url };
}
```

## A6. 百度网盘 Worker (独立项目, ~200 行) 🆕

部署到 Cloudflare Worker / VPS 反代, 接收 `?url=pan.baidu.com/s/xxx&pwd=abcd`, 返回 m3u8 / 嵌入 HTML。

```ts
// worker/src/index.ts (示例)
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { searchParams } = new URL(req.url);
    const surl = searchParams.get("surl");
    const pwd = searchParams.get("pwd") ?? "";
    
    // 1. 模拟 PC 客户端请求, 获取直链
    const videoUrl = await resolveBaiduShare(surl, pwd, env.BAIDU_COOKIE);
    if (!videoUrl) return new Response("解析失败", { status: 502 });
    
    // 2. 返回 HTML 嵌入 (走 hls.js 播放)
    return new Response(embedHtml(videoUrl), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};

async function resolveBaiduShare(surl: string, pwd: string, cookie: string): Promise<string | null> {
  // 1. POST pan.baidu.com/share/verify? 验证提取码
  // 2. GET /s/1${surl} 拿文件列表, 找最大视频
  // 3. POST /api/sharedownload? 拿直链 (dlink)
  // 4. 返回 dlink
  // ⚠️ 实现细节需关注百度反爬策略
}
```

> ⚠️ 此 Worker 实现细节复杂, Phase 3 启动时黑单独出方案, 老板审后再写。

## A7. Page Builder 数据流 (zustand + 防抖) 🆕

```ts
// app/(admin)/pages/[key]/edit/page.tsx (客户端)
'use client';
import { create } from 'zustand';
import { useDebouncedCallback } from 'use-debounce';

interface PageBuilderState {
  blocks: Block[];
  selectedId: string | null;
  dirty: boolean;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  selectBlock: (id: string) => void;
  updateBlock: (id: string, data: any) => void;
  reorderBlocks: (oldIndex: number, newIndex: number) => void;
  save: () => Promise<void>;
}

const useBuilder = create<PageBuilderState>((set, get) => ({
  blocks: [],
  selectedId: null,
  dirty: false,
  addBlock: (type) => set((s) => ({
    blocks: [...s.blocks, { id: nanoid(), type, order: s.blocks.length, visible: true, data: defaultData[type] }],
    dirty: true,
  })),
  removeBlock: (id) => set((s) => ({ blocks: s.blocks.filter(b => b.id !== id), dirty: true })),
  // ...
  save: async () => {
    const { blocks } = get();
    await savePageLayout(pageKey, blocks);  // Server Action
    set({ dirty: false });
  },
}));

// 防抖自动保存
const debouncedSave = useDebouncedCallback(() => useBuilder.getState().save(), 800);
useEffect(() => {
  if (dirty) debouncedSave();
}, [dirty, debouncedSave]);
```

## A8. 媒体上传管线 (lib/media/upload.ts) 🆕

```ts
import sharp from 'sharp';
import { encode } from 'blurhash';

export async function processImage(buffer: Buffer, originalName: string) {
  const meta = await sharp(buffer).metadata();
  
  // 1. 生成多尺寸 WebP
  const sizes = [320, 640, 1280];
  const outputs = await Promise.all([
    ...sizes.map(async (w) => {
      const data = await sharp(buffer)
        .resize(w, null, { fit: 'inside' })
        .webp({ quality: 80 })
        .toBuffer();
      return { width: w, data };
    }),
    // 原图备份
    sharp(buffer).toBuffer().then((d) => ({ width: meta.width!, data: d, isOriginal: true })),
  ]);
  
  // 2. 存盘 (落 media/images/{size}/uuid.webp)
  const baseId = nanoid();
  const urls = await Promise.all(outputs.map(async (o) => {
    const sub = o.isOriginal ? 'originals' : String(o.width);
    const key = `media/images/${sub}/${baseId}.webp`;
    await fs.writeFile(`./${key}`, o.data);
    return { key, width: o.width };
  }));
  
  // 3. blurhash (从 32x32 缩略图算)
  const tiny = await sharp(buffer).resize(32, 32).raw().ensureAlpha().toBuffer();
  const blurhash = encode(new Uint8ClampedArray(tiny), 32, 32, 4, 3);
  
  return { urls, blurhash, width: meta.width!, height: meta.height! };
}
```

## A9. 鉴权流程 (不变)

```
[Browser] → /admin/* 
  → middleware.ts 检测 session cookie
  → Auth.js 解析 JWT → User
  → 未登录 → redirect /login
  → 登录 → render page
```

## A10. 部署拓扑

```
                 ┌──────────────────┐
   Internet ──►  │   Nginx (:443)   │
                 │   + Let's Encrypt│
                 └────────┬─────────┘
                          │ reverse_proxy
                          ▼
                 ┌──────────────────┐
                 │  Next.js (:3000)│
                 │  (PM2 cluster)   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ SQLite + content/│
                 │  + media/        │
                 └──────────────────┘

百度 Worker (独立部署):
                 ┌──────────────────┐
                 │ Cloudflare Worker│
                 │ pan-proxy.xxx    │
                 │ (黑写 ~200 行)   │
                 └──────────────────┘
```

## A11. 备份策略 (v0.2 加 media/)

```bash
# 每日 03:00 备份 SQLite + content/ + media/
0 3 * * * cd /opt/obsidian-journal && tar czf /backup/oj-$(date +\%F).tar.gz \
  prisma/dev.db content/ media/
# 保留 30 天
find /backup/oj-*.tar.gz -mtime +30 -delete
```

## A12. FTS5 同步管线 🆕

```ts
// lib/db.ts (Server Action: uploadPost 内)
export async function syncPostFTS(post: Post) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO post_search(post_id, title, excerpt, content) VALUES (?, ?, ?, ?)`,
    post.id, post.title, post.excerpt ?? '', stripMd(post.contentMd)
  );
}

export async function searchPosts(q: string, limit = 20): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ post_id: string }[]>(
    `SELECT post_id FROM post_search WHERE post_search MATCH ? LIMIT ?`,
    q, limit
  );
  return rows.map(r => r.post_id);
}
```

## A13. 监控 (v0.2 加媒体 + Worker)

- `/api/health` → 200 + 版本 + DB 状态 + media 磁盘使用 + Worker 状态
- Sentry (错误)
- Plausible / Umami (访问统计)
- **百度 Worker 状态监控** 🆕: 失败率 > 10% 自动告警 (Phase 4 加)
