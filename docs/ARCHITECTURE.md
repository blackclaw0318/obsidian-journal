# 架构细节 (v0.3)

> 配套 `DESIGN.md` §4 的展开, 给开发者看。

## A1. 渲染策略 (不变)

## A2. 数据流 (v0.3 加 View + MediaUsage)

```
[DB Read]    Post / Chapter / Series / Novel / Volume / Video / Page / Media / Social
[DB Read]    MediaUsage.findMany({ where: { refType, refId } })  → 显示引用列表
[DB Read]    FTS5 MATCH ?                                            → 搜索

[DB Write]   Server Action: uploadPost()               → Post.create + FTS5 同步(降级) + revalidate
[DB Write]   Server Action: uploadChapter()            → Chapter.create + FTS5 同步(降级) + revalidate
[DB Write]   Server Action: savePageLayout()           → Page.layout.update + DOMPurify(customHtml) + revalidate
[DB Write]   Server Action: uploadMedia()              → Media.create + sharp 多尺寸 + blurhash + MediaUsage 同步
[DB Write]   Server Action: recordView()               → views +1 (DB 简单版, 同 IP 24h 限一次)
[DB Write]   Server Action: rebuildAllFTS()            → 全量重建 FTS5 索引 (Admin 按钮 + cron)
```

## A3. MD 解析管线 (不变)

## A4. Block 注册表 (v0.3: 13 种, 加 theme, 去 Marquee)

```ts
// lib/blocks/registry.tsx
export const blockRegistry = {
  hero:       { schema: heroSchema,       component: HeroBlock,       label: "Hero 大标题",   icon: "✨" },
  text:       { schema: textSchema,       component: TextBlock,       label: "文本段落",      icon: "📝" },
  gallery:    { schema: gallerySchema,    component: GalleryBlock,    label: "图片画廊",      icon: "🖼️" },
  stats:      { schema: statsSchema,      component: StatsBlock,      label: "数据统计",      icon: "📊" },
  skills:     { schema: skillsSchema,     component: SkillsBlock,     label: "技能雷达",      icon: "🎯" },
  timeline:   { schema: timelineSchema,   component: TimelineBlock,   label: "时间线",        icon: "📅" },
  links:      { schema: linksSchema,      component: LinksBlock,      label: "友链",          icon: "🔗" },
  posts:      { schema: postsSchema,      component: PostsBlock,      label: "文章列表",      icon: "📰" },
  videos:     { schema: videosSchema,     component: VideosBlock,     label: "视频列表",      icon: "🎬" },
  divider:    { schema: dividerSchema,    component: DividerBlock,    label: "分隔线",        icon: "➖" },
  callout:    { schema: calloutSchema,    component: CalloutBlock,    label: "提示框",        icon: "💡" },  // 🆕
  music:      { schema: musicSchema,      component: MusicBlock,      label: "背景音乐",      icon: "🎵", advanced: true },  // 🆕 标 advanced
  customHtml: { schema: customHtmlSchema, component: CustomHtmlBlock, label: "自定义 HTML",   icon: "⚠️", danger: true, requiresFeature: 'allowCustomHtml' },  // 🆕 受开关控制
} as const;
```

**Block 主题应用** (v0.3 新增):
```tsx
function BlockContainer({ block, children }) {
  const theme = block.theme ?? 'auto';
  return (
    <section
      className={cn(
        'block-container',
        theme === 'dark' && 'bg-zinc-950 text-zinc-50',
        theme === 'light' && 'bg-white text-zinc-900',
      )}
      data-theme={theme}
    >
      {children}
    </section>
  );
}
```

## A5. 视频 URL 解析 (不变)

## A6. 百度网盘 Worker (不变)

## A7. Page Builder 数据流 (v0.3 加 CustomHtml 受控)

```ts
// 在 addBlock 时检查:
if (entry.requiresFeature === 'allowCustomHtml' && !siteConfig.allowCustomHtml) {
  toast.error('CustomHtmlBlock 已禁用, 前往 Settings → 站点设置 → 允许自定义 HTML Block 启用');
  return;
}

// 在 savePageLayout 时 (Server Action):
for (const block of blocks) {
  if (block.type === 'customHtml' && !siteConfig.allowCustomHtml) {
    throw new ActionError('CustomHtmlBlock 已禁用, 无法保存');
  }
  if (block.type === 'customHtml') {
    block.data.html = sanitizeHtml(block.data.html);  // DOMPurify 二次清洗
  }
}
```

## A8. 媒体上传管线 (v0.3 加 MediaUsage 同步)

```ts
// lib/media/upload.ts (完整管线)
export async function processAndSaveMedia(file: File, uploaderId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // 1. 类型/大小校验
  const mime = file.type;
  if (!ALLOWED_MIME.includes(mime)) throw new ActionError('不支持的文件类型');
  if (file.size > MAX_SIZE[mime.split('/')[0]]) throw new ActionError('文件过大');
  
  // 2. 图片: sharp 多尺寸 + blurhash
  let processed;
  if (mime.startsWith('image/')) {
    processed = await processImage(buffer);
  } else if (mime.startsWith('video/')) {
    processed = await processVideo(buffer);  // ffmpeg 截首帧
  } else {
    processed = { url: await saveOriginal(buffer), size: buffer.length };
  }
  
  // 3. 写 Media 表
  const media = await prisma.media.create({
    data: {
      filename: file.name, mimeType: mime, size: file.size,
      type: getMediaType(mime),
      storageKey: processed.storageKey,
      url: processed.url,
      width: processed.width, height: processed.height,
      blurhash: processed.blurhash,
      uploadedBy: uploaderId,
    },
  });
  
  return media;
}

// 上传 Post/Chapter/Save PageLayout 时同步 MediaUsage
// (见 lib/media/usage.ts, DESIGN §19.5)
```

## A9. 鉴权流程 (不变)

## A10. 部署拓扑 (v0.3 加 Worker 独立仓)

```
                 ┌──────────────────┐
   Internet ──►  │   Nginx (:443)   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │  Next.js (:3000)│
                 │  (PM2 cluster)   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ SQLite + content/│
                 │  + media/        │
                 └──────────────────┘

百度 Worker (独立 repo, 独立部署):
                 ┌──────────────────┐
                 │ Cloudflare Worker│
                 │ pan-proxy.xxx    │
                 │ (独立仓库 ~200 行)│
                 └──────────────────┘
```

## A11. 备份策略 (v0.3 加 media/)

```bash
0 3 * * * cd /opt/obsidian-journal && tar czf /backup/oj-$(date +\%F).tar.gz prisma/dev.db content/ media/
30 3 * * * cd /opt/obsidian-journal && pnpm tsx scripts/reindex-fts.ts >> logs/reindex.log 2>&1
find /backup/oj-*.tar.gz -mtime +30 -delete
```

## A12. FTS5 同步管线 (v0.3 加降级) 🆕

```ts
// lib/fts.ts
import { prisma } from './db';
import { logger } from './logger';

export async function syncPostFTS(post: Post): Promise<FTSResult> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO post_search(post_id, title, excerpt, content) VALUES (?, ?, ?, ?)`,
      post.id, post.title, post.excerpt ?? '', stripMd(post.contentMd)
    );
    return { ok: true };
  } catch (e) {
    logger.warn(`[FTS] post ${post.id} sync failed: ${e.message}`);
    return { ok: false, error: String(e) };
  }
}

export async function rebuildAllFTS(): Promise<{ success: number; failed: number; total: number }> {
  const posts = await prisma.post.findMany({ where: { published: true } });
  const chapters = await prisma.chapter.findMany({ where: { published: true } });
  
  await prisma.$executeRawUnsafe(`DELETE FROM post_search`);
  await prisma.$executeRawUnsafe(`DELETE FROM chapter_search`);
  
  let success = 0, failed = 0;
  for (const p of posts) {
    const r = await syncPostFTS(p);
    r.ok ? success++ : failed++;
  }
  for (const c of chapters) {
    const r = await syncChapterFTS(c);
    r.ok ? success++ : failed++;
  }
  
  return { success, failed, total: posts.length + chapters.length };
}
```

## A13. 监控 (v0.3 加 Worker 健康)

```ts
// app/api/health/route.ts
export async function GET() {
  const checks = {
    db: await checkDB(),
    mediaDisk: await checkMediaDisk(),
    baiduWorker: await checkBaiduWorker(),  // 🆕
  };
  const ok = Object.values(checks).every(c => c.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}

async function checkBaiduWorker() {
  try {
    const url = `${process.env.BAUDU_WORKER_URL}/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

## A14. View 计数管线 (v0.3) 🆕

```ts
// lib/views.ts
import { headers } from 'next/headers';
import { LRUCache } from 'lru-cache';  // 或简单 Map

const viewCache = new LRUCache<string, number>({ max: 10_000, ttl: 24 * 3600_000 });

export async function recordView(
  refType: 'post'|'chapter'|'video', refId: string
): Promise<{ recorded: boolean }> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const key = `${refType}:${refId}:${ip}`;
  
  if (viewCache.has(key)) return { recorded: false };
  viewCache.set(key, Date.now());
  
  const table = { post: 'Post', chapter: 'Chapter', video: 'Video' }[refType];
  await prisma.$executeRawUnsafe(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, refId);
  
  return { recorded: true };
}
```

## A15. Novel 三层关系 🆕

```prisma
// 已见 schema.prisma §6, 此处列关系图
Novel (1) ──< (N) NovelVolume (1) ──< (N) Chapter
```

## A16. Social 规范化 🆕

```
Social { id, platform, label, url, icon, order, visible }
替代 SiteConfig.socials String JSON
```

渲染: `/about` 页用 LinksBlock 拉 visible=true 的 Social, 按 order 排序。

## A17. Worker 仓接口契约 🆕

主仓与 Worker 仓的接口约定 (TypeScript 接口, 手动同步或后续 monorepo 抽 packages):

```ts
// 主仓: lib/video/baidu.ts
export interface BaiduProxyRequest {
  surl: string;     // 分享链接 ID
  pwd: string;      // 提取码 (空 = 无)
  autoplay?: boolean;
}

// Worker 仓: src/index.ts (接收同名 URL params)
export interface BaiduProxyResponse {
  ok: boolean;
  videoUrl?: string;  // m3u8 / mp4 直链
  error?: string;
}
```

调用:
```tsx
const url = `${process.env.BAUDU_WORKER_URL}/?surl=${surl}&pwd=${pwd}&autoplay=0`;
return <iframe src={url} ... />;
```
