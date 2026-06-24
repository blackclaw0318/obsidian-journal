# Obsidian Journal — 个人博客平台设计文档

> 版本: **v0.3 · 方案稿 (基于老板第二批反馈重写)**
> 作者: 黑 (Hei)
> 创建: 2026-06-24 (v0.1) → 重写 2026-06-24 (v0.2) → 重写 2026-06-24 (v0.3)
> 仓库: `blackclaw0318/obsidian-journal`
> 详见: `docs/CHANGELOG.md` v0.1→v0.2→v0.3 改动总览

---

## 0. TL;DR (30 秒读完)

- **做什么**: 单站长个人博客, 极简黑白风, 大量微动态, **13 种 Block 可视化页面搭建**, **完整小说作品/卷/章三层模型**
- **v0.3 核心升级** (基于老板 9 条新反馈):
  1. **Novel 双层模型**: 作品(Novel) → 卷(Volume) → 章(Chapter), 完美支持多卷小说
  2. **CustomHtmlBlock 开启路径**: Settings 显式开关 + DOMPurify 二次清洗 + Block 库 disabled 灰显
  3. **百度 Worker 独立仓库**: 推荐 `obsidian-journal-baidu-proxy` 单独 repo
  4. **Social 表规范化**: 替代 SiteConfig.socials String JSON
  5. **MediaUsage 中间表**: 媒体引用追踪 (Post/Chapter/Page/Video 多态)
  6. **VideoSeries 外键化**: 替代 Video.series String
  7. **FTS5 同步降级**: 失败不阻塞发布 + 重建索引按钮 + 定时 cron
  8. **BlockBase.theme**: 单 Block 暗色/亮色背景切换
  9. **CalloutBlock 新增** + **MarqueeBlock 移除** (凑数清理)
- **技术栈**: Next.js 14 + TS + Tailwind + shadcn/ui + Prisma + SQLite + Auth.js v5 + Framer Motion + Lenis + dnd-kit + Shiki + sharp + DOMPurify
- **审核重点**: §16 "待老板拍板" (Q1-Q11, **11 决策**)

---

## 1. 项目命名建议 (不变)

> 当前默认: **`obsidian-journal`** (黑曜石日志)

| 候选 | 含义 | 风格 | 黑推荐 |
|---|---|---|---|
| `obsidian-journal` | 黑曜石日志 | 沉稳、文学、私人 | ⭐ **默认** |
| `mono-press` | 单色出版 | 极简、内容为王 | 备选 1 |
| `inkwell` | 墨水瓶 | 写作感、东方韵味 | 备选 2 |
| `handfoot-blog` | 商业帝国系 | 品牌一致 | 备选 3 |
| `sk-journal` | 老板缩写 | 最简洁 | 备选 4 |

> 📌 **老板决策点 Q1**: 选哪个?

---

## 2. 设计哲学 (不变)

### 2.1 视觉关键词
**简洁 · 现代 · 青春 · 高级**

### 2.2 配色规范 (默认亮色 + 暗色切换)

**主色**:
```
纯黑:  #000000      (强调/按钮/标题)
纯白:  #FFFFFF      (背景)
```

**灰阶** (Tailwind zinc):
```
zinc-50:   #FAFAFA   卡片背景
zinc-100:  #F4F4F5   分区背景
zinc-200:  #E4E4E7   分割线
zinc-400:  #A1A1AA   次要文字
zinc-600:  #52525B   正文
zinc-900:  #18181B   标题
zinc-950:  #09090B   暗色模式背景
```

**双主题 (默认亮色 + 暗色切换)**:
- 亮色 (默认): 白底 + 黑字
- 暗色: 黑底 + 白字, 契合"黑曜石"
- 切换器右上角, 200ms "溶解"过渡

### 2.3 字体方案 (不变)
- 中文: 思源黑体 SC
- 英文: Geist Sans
- 代码: JetBrains Mono
- 装饰: LXGW WenKai

### 2.4 排版尺度 (不变)

---

## 3. 技术栈选型 (v0.3 加 DOMPurify)

```
┌─────────────────────────────────────────────────────────┐
│  Frontend                                                │
│  Next.js 14 (App Router) · TypeScript 5.x · React 18    │
│  Tailwind CSS 3.4 + shadcn/ui · Framer Motion 11         │
│  Lenis · next-themes (双主题)                            │
│  dnd-kit (Page Builder)                                  │
│  react-hook-form + zod                                   │
├─────────────────────────────────────────────────────────┤
│  Backend (全在 Next.js 内)                                │
│  Server Actions · Route Handlers · Middleware            │
│  Prisma 5 ORM · SQLite (FTS5)                            │
│  Auth.js v5 · bcrypt                                    │
│  gray-matter + unified + Shiki · sharp · **DOMPurify 🆕**│
├─────────────────────────────────────────────────────────┤
│  视频                                                    │
│  B 站 / YouTube / 本地: 标准 iframe / video              │
│  百度网盘: **自建 Cloudflare Worker 真直接播**            │
│  Worker 代码: **独立仓库 obsidian-journal-baidu-proxy 🆕**│
├─────────────────────────────────────────────────────────┤
│  DevOps                                                  │
│  pnpm · ESLint · Prettier · Vitest · Playwright          │
│  自托管 VPS (主) 或 Vercel (退路)                         │
└─────────────────────────────────────────────────────────┘
```

**v0.3 新增**:
- **DOMPurify**: CustomHtmlBlock 编译期二次清洗
- **独立 Worker 仓库**: 关注点分离, 部署独立

---

## 4. 系统架构 (不变)

```
[Browser 访客] → Next.js (RSC + Block[]) → SQLite + content/ + media/
[Browser 站长] → Server Actions → MD 解析 / 媒体处理 / Page Builder / Novel CRUD
[Worker] baidu-proxy.xxx.workers.dev → 解析百度分享链接 → 返回 m3u8 / iframe HTML
```

---

## 5. 目录结构 (v0.3 加 Worker 仓库说明)

### 5.1 主仓库结构

```
obsidian-journal/                 ← 主仓库 (本仓库)
├── docs/                         ← 设计文档
├── app/                          ← Next.js App Router
│   ├── (public)/
│   │   ├── novels/[slug]/        ← 作品列表 (Novel) 🆕
│   │   ├── novels/[slug]/[vol]/  ← 卷详情 🆕
│   │   ├── chapters/[slug]/      ← 章节详情
│   │   └── ...
│   ├── (admin)/
│   │   ├── novels/               ← 作品管理 🆕
│   │   ├── volumes/              ← 卷管理 🆕
│   │   ├── chapters/
│   │   ├── socials/              ← 友链/社交管理 🆕
│   │   ├── media-usage/          ← 引用追踪 🆕
│   │   ├── reindex/              ← FTS5 重建索引 🆕
│   │   └── pages/[key]/edit/     ← Page Builder
│   └── api/
├── components/
│   ├── blocks/
│   │   ├── HeroBlock.tsx
│   │   ├── TextBlock.tsx
│   │   ├── GalleryBlock.tsx
│   │   ├── StatsBlock.tsx
│   │   ├── SkillsBlock.tsx
│   │   ├── TimelineBlock.tsx
│   │   ├── LinksBlock.tsx
│   │   ├── PostsBlock.tsx
│   │   ├── VideosBlock.tsx
│   │   ├── DividerBlock.tsx
│   │   ├── CalloutBlock.tsx      🆕
│   │   ├── CustomHtmlBlock.tsx   (⚠️ 默认禁用)
│   │   ├── MusicBlock.tsx        (⚠️ 高级, 默认折叠)
│   │   └── registry.tsx
│   └── admin/page-builder/
├── lib/
│   ├── blocks/
│   │   ├── schemas.ts            (zod, 13 种 + theme)
│   │   └── renderer.tsx
│   ├── media/
│   │   ├── upload.ts             (sharp + blurhash)
│   │   ├── usage.ts              (引用追踪) 🆕
│   │   └── sanitize.ts           (DOMPurify 包装) 🆕
│   ├── db.ts                     (Prisma + FTS5 + 降级)
│   └── fts.ts                    (FTS5 同步 + 重建) 🆕
├── prisma/
│   ├── schema.prisma             (v0.3: 11 个 model)
│   └── migrations/
│       └── XXXX_add_fts5/        (手写 SQL: CREATE VIRTUAL TABLE)
├── content/
├── media/
├── scripts/
│   ├── reindex-fts.ts            🆕 (cron + 手跑)
│   └── revalidate-cache.ts
└── ...
```

### 5.2 Worker 仓库结构 🆕 (独立 repo)

```
obsidian-journal-baidu-proxy/      ← 独立仓库 (推荐方案, 见 §22)
├── src/
│   ├── index.ts                  ← Worker 入口
│   ├── baidu-resolver.ts         ← 分享链接 → 直链
│   ├── embed.html.ts             ← 返回的 HTML 模板 (hls.js 播放)
│   └── types.ts
├── wrangler.toml
├── package.json
├── tsconfig.json
├── README.md                     ← 部署文档
└── tests/
```

> 📌 **老板决策点 Q10**: Worker 独立 repo / monorepo?

---

## 6. 数据模型 (v0.3 重写, 11 个 model + 6 enum)

```prisma
// prisma/schema.prisma (v0.3)

generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

// ============ 枚举 ============

enum PostCategory { TECH LIFE NOVEL }

enum PostType { ARTICLE CHAPTER }

enum VideoPlatform { BILIBILI BAIDU YOUTUBE NATIVE }

enum MediaType { IMAGE VIDEO DOCUMENT AUDIO }

enum PageType { SYSTEM CUSTOM }

enum NovelStatus { ONGOING COMPLETED HIATUS }

// ============ 用户 (单站长) ============
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  displayName  String
  avatar       String?
  bio          String?
  createdAt    DateTime @default(now())
  uploads      Media[]
}

// ============ 站点配置 (单行) ============
model SiteConfig {
  id                Int      @id @default(1)
  siteName          String   @default("Obsidian Journal")
  tagline           String?
  authorName        String?
  authorAvatar      String?
  footerNote        String?
  defaultTheme      String   @default("light")
  allowCustomHtml   Boolean  @default(false)  // 🆕 v0.3: HTML Block 总开关
  baiduMode         String   @default("B-direct")  // "B-direct" | "C-fallback"
  baiduWorkerUrl    String?  // 自建 Worker URL
  updatedAt         DateTime @updatedAt
}

// ============ 社交/友链 (规范化, 替代 socials JSON) 🆕 ============
model Social {
  id        String   @id @default(cuid())
  platform  String   // 'github' | 'twitter' | 'email' | 'wechat' | 'bilibili' | 'zhihu' | 'rss' | 'custom'
  label     String   // 显示名
  url       String
  icon      String?  // 自定义 icon URL (可空, 用默认图标)
  order     Int      @default(0)
  visible   Boolean  @default(true)
  createdAt DateTime @default(now())
  
  @@index([order, visible])
}

// ============ 技术/生活文章系列 (Series 只用于 tech/life) ============
model Series {
  id          String       @id @default(cuid())
  slug        String       @unique
  name        String
  description String?
  coverUrl    String?
  category    PostCategory // TECH | LIFE (不再 NOVEL)
  posts       Post[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@index([category])
}

// ============ 小说作品 (v0.3 新增, 替代 Series(NOVEL)) ============
model Novel {
  id          String       @id @default(cuid())
  slug        String       @unique  // "meta-realm"
  name        String             // "元界"
  description String?
  coverUrl    String?
  status      NovelStatus  @default(ONGOING)
  tags        String?      // JSON
  volumes     NovelVolume[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

// ============ 小说卷 (v0.3 新增) ============
model NovelVolume {
  id          String   @id @default(cuid())
  slug        String         // "volume-1-rise"
  title       String         // "第一卷·崛起"
  description String?
  coverUrl    String?
  volumeNo    Int            // 1, 2, 3
  wordCount   Int      @default(0)
  publishedAt DateTime?
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  chapters    Chapter[]
  
  @@unique([novelId, volumeNo])
}

// ============ 普通文章 (tech/life) ============
model Post {
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  excerpt     String?
  category    PostCategory
  type        PostType     @default(ARTICLE)
  tags        String?
  coverUrl    String?
  sourcePath  String?
  contentMd   String
  htmlCache   String
  published   Boolean      @default(true)
  pinned      Boolean      @default(false)
  publishedAt DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  views       Int          @default(0)
  
  seriesId    String?
  series      Series?      @relation(fields: [seriesId], references: [id])
  
  @@index([category, publishedAt])
  @@index([seriesId])
}

// ============ 小说章节 (v0.3 改挂 NovelVolume, 不再挂 Series) ============
model Chapter {
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  excerpt     String?
  coverUrl    String?
  sourcePath  String?
  contentMd   String
  htmlCache   String
  chapterNo   Int          // 卷内序号
  wordCount   Int          @default(0)
  published   Boolean      @default(true)
  publishedAt DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  views       Int          @default(0)
  
  volumeId    String
  volume      NovelVolume  @relation(fields: [volumeId], references: [id], onDelete: Cascade)
  
  @@unique([volumeId, chapterNo])
  @@index([volumeId, publishedAt])
}

// ============ 视频系列 (v0.3 新增, 替代 Video.series String) ============
model VideoSeries {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  coverUrl    String?
  videos      Video[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============ 视频 ============
model Video {
  id          String         @id @default(cuid())
  slug        String         @unique
  title       String
  description String?
  coverUrl    String?
  platform    VideoPlatform
  sourceId    String         // BV 号 / 百度 surl / youtube id
  password    String?        // 百度提取码
  duration    Int?
  tags        String?
  publishedAt DateTime       @default(now())
  views       Int            @default(0)
  
  seriesId    String?        // 🆕 v0.3: 外键, 替代 String
  series      VideoSeries?   @relation(fields: [seriesId], references: [id])
  
  @@index([platform, publishedAt])
  @@index([seriesId])
}

// ============ 页面 (Page + Block[]) ============
model Page {
  id        String   @id @default(cuid())
  key       String   @unique
  title     String
  type      PageType @default(SYSTEM)
  layout    String   // JSON: { blocks: Block[] }
  isPublic  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============ 媒体 ============
model Media {
  id          String    @id @default(cuid())
  filename    String
  mimeType    String
  size        Int
  type        MediaType
  storageKey  String    @unique
  url         String
  width       Int?
  height      Int?
  blurhash    String?
  alt         String?
  caption     String?
  uploadedBy  String
  uploader    User      @relation(fields: [uploadedBy], references: [id])
  createdAt   DateTime  @default(now())
  usages      MediaUsage[]  // 🆕 反向关联
  
  @@index([type, createdAt])
}

// ============ 媒体引用追踪 (v0.3 新增) 🆕 ============
model MediaUsage {
  id        String   @id @default(cuid())
  mediaId   String
  refType   String   // 'post' | 'chapter' | 'page' | 'video'
  refId     String
  field     String?  // 'coverUrl' | 'contentMd' | 'layout.hero.bgImage' | ...
  createdAt DateTime @default(now())
  
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  
  @@unique([mediaId, refType, refId, field])
  @@index([mediaId])
  @@index([refType, refId])
}

// ============ 统计 ============
model DailyStat {
  date       DateTime @id
  postViews  Int      @default(0)
  videoViews Int      @default(0)
  newPosts   Int      @default(0)
}
```

### 6.1 Block 数据结构 (v0.3: 13 种, 加 theme, 去 Marquee, 加 Callout)

```ts
// lib/blocks/schemas.ts (zod)

type BlockBase = {
  id: string;
  order: number;
  visible: boolean;
  theme?: 'light' | 'dark' | 'auto';  // 🆕 v0.3: 单 Block 暗色背景
};

type HeroBlock       = BlockBase & { type: 'hero';       data: { title; subtitle?; ctaText?; ctaUrl?; bgImage? } };
type TextBlock       = BlockBase & { type: 'text';       data: { md: string; align?: 'left'|'center' } };
type GalleryBlock    = BlockBase & { type: 'gallery';    data: { images: string[]; columns: 2|3|4; gap: number } };
type StatsBlock      = BlockBase & { type: 'stats';      data: { items: { label; value: number; suffix?: string }[] } };
type SkillsBlock     = BlockBase & { type: 'skills';     data: { items: { name; level: number }[] } };
type TimelineBlock   = BlockBase & { type: 'timeline';   data: { items: { date; title; content? }[] } };
type LinksBlock      = BlockBase & { type: 'links';      data: { links: { name; url; desc?; avatar? }[] } };
type PostsBlock      = BlockBase & { type: 'posts';      data: { category?: PostCategory; seriesId?: string; limit: number; sortBy: 'new'|'hot' } };
type VideosBlock     = BlockBase & { type: 'videos';     data: { seriesId?: string; limit: number } };  // 🆕 改外键
type DividerBlock    = BlockBase & { type: 'divider';    data: { style: 'line'|'dots'|'space' } };
type CalloutBlock    = BlockBase & { type: 'callout';    data: { variant: 'info'|'warning'|'success'|'danger'; title?; content: string; icon?: string } };  // 🆕
type CustomHtmlBlock = BlockBase & { type: 'customHtml'; data: { html: string } };  // ⚠️ 受 SiteConfig.allowCustomHtml 控制
type MusicBlock      = BlockBase & { type: 'music';      data: { src: string; title?; autoplay: boolean } };  // ⚠️ 高级, 默认折叠

type Block =
  | HeroBlock | TextBlock | GalleryBlock | StatsBlock | SkillsBlock
  | TimelineBlock | LinksBlock | PostsBlock | VideosBlock | DividerBlock
  | CalloutBlock | CustomHtmlBlock | MusicBlock;
```

**Block 主题应用**:
```tsx
function BlockContainer({ block, children }) {
  const theme = block.theme ?? 'auto';  // 'auto' = 跟随全局
  return (
    <section className={cn(
      'block-container',
      theme === 'dark' && 'bg-zinc-950 text-zinc-50',
      theme === 'light' && 'bg-white text-zinc-900',
    )} data-theme={theme}>
      {children}
    </section>
  );
}
```

### 6.2 FTS5 全文搜索 (v0.3 加降级) 🆕

```prisma
// prisma/migrations/XXXX_add_fts5/migration.sql (手写)
CREATE VIRTUAL TABLE post_search USING fts5(
  post_id UNINDEXED, title, excerpt, content,
  tokenize = 'unicode61'
);
CREATE VIRTUAL TABLE chapter_search USING fts5(
  chapter_id UNINDEXED, title, excerpt, content,
  tokenize = 'unicode61'
);
```

**v0.3 降级策略** (关键):
```ts
// lib/fts.ts
export async function syncPostFTS(post: Post): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO post_search(post_id, title, excerpt, content) VALUES (?, ?, ?, ?)`,
      post.id, post.title, post.excerpt ?? '', stripMd(post.contentMd)
    );
    return { ok: true };
  } catch (e) {
    // ⚠️ v0.3: 失败不抛出, 返回错误状态
    logger.warn(`[FTS] sync failed for post ${post.id}: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

// uploadPost() 调用:
const ftsResult = await syncPostFTS(post);
if (!ftsResult.ok) {
  // 文章已入库, FTS 同步失败, 不阻塞
  warnings.push(`FTS 同步失败: ${ftsResult.error}, 文章已发布, 可稍后重建索引`);
}

// Admin 后台"重建索引"按钮 (scripts/reindex-fts.ts):
export async function rebuildAllFTS() {
  await prisma.$executeRawUnsafe(`DELETE FROM post_search`);
  await prisma.$executeRawUnsafe(`DELETE FROM chapter_search`);
  
  const posts = await prisma.post.findMany({ where: { published: true } });
  let success = 0, failed = 0;
  for (const p of posts) {
    const r = await syncPostFTS(p);
    r.ok ? success++ : failed++;
  }
  return { success, failed, total: posts.length };
}

// 定时 cron (每天凌晨 03:30):
// 0 3 * * * cd /opt/obsidian-journal && pnpm tsx scripts/reindex-fts.ts >> logs/reindex.log 2>&1
```

---

## 7. 双模式设计 (v0.3 加 Novel/Volume 后台)

### 7.1 模式 1: 游客模式 (Public)
不变。

### 7.2 模式 2: 站长模式 (Owner)

| 功能 | 路径 | v0.3 新增/强化 |
|---|---|---|
| 仪表盘 | `/admin/dashboard` | |
| **MD 上传** | `/admin/upload` | type 区分 article/chapter, 选 series/volume |
| 文章管理 | `/admin/posts` | |
| **章节管理** | `/admin/chapters` | 🆕 选卷 |
| **卷管理** | `/admin/volumes` | 🆕 |
| **作品管理** | `/admin/novels` | 🆕 (Novel CRUD + 状态管理) |
| **系列管理** | `/admin/series` | 🆕 限定 tech/life |
| 视频管理 | `/admin/videos` | series 改外键下拉 |
| **视频系列管理** | `/admin/video-series` | 🆕 |
| **媒体库** | `/admin/media` | + 引用追踪 |
| **Page Builder** | `/admin/pages/[key]/edit` | CustomHtml 受开关控制 |
| **站点设置** | `/admin/settings` | + `allowCustomHtml` 开关 |
| **友链/社交管理** | `/admin/socials` | 🆕 |
| **FTS5 重建** | `/admin/reindex` | 🆕 |

---

## 8. 页面与路由速查 (v0.3 加 Novel/Volume)

| 路由 | 渲染源 | v0.3 |
|---|---|---|
| `/` | Page("home") + Block[] | |
| `/about` | Page("about") + Block[] | |
| `/tech` | Post(category=TECH) 列表 | |
| `/life` | Post(category=LIFE) 列表 | |
| `/novels` | **Novel 列表** 🆕 | 卡片: 封面/名/状态/卷数/总字数 |
| **`/novels/[slug]`** | **Novel 详情** 🆕 | 作品卷列表 |
| **`/novels/[slug]/[volSlug]`** | **卷详情** 🆕 | 章节列表 |
| `/series` | Series 列表 (仅 tech/life) 🆕 收紧 | |
| `/series/[slug]` | Series 详情 (仅 tech 文章) 🆕 收紧 | |
| `/videos` | Video 列表 | series 改外键 |
| `/videos/[id]` | 视频详情 | |
| `/posts/[slug]` | Post 详情 | |
| `/chapters/[slug]` | Chapter 详情 + 前后章 + 同卷导航 🆕 | |
| `/login` | 登录 | |
| `/admin/*` | 后台 | |

---

## 9. MD 上传与解析 (v0.3 加 chapter 选卷)

不变, 但 chapter 类型现在选 `volume` 而非 `series`:

```markdown
---
title: 元界 · 第一章
type: chapter
volume: volume-1-rise   # 🆕 v0.3 改 (原 series)
chapter: 1
date: 2026-06-24
---
```

---

## 10. 视频嵌入方案 (v0.3 series 外键化)

不变, 但 Video 表 series 改外键 VideoSeries:

**Admin 上传视频**:
- 填 series: 不再手填字符串, 改成下拉 (VideoSeries 列表)
- 后台管理 `/admin/video-series` CRUD

---

## 11. 动画策略 (不变)

---

## 12. 性能优化 (不变)

---

## 13. 部署方案 (v0.4 加 §13.4 硬件适配)

### 13.1 方案 A: Vercel (退路)
- 优点: 零配置, 边缘网络
- 缺点: 国内慢, SQLite 需切 Postgres

### 13.2 方案 B: 自托管 VPS (黑推荐 ⭐)
- 架构: Nginx + PM2 + SQLite + 定期 cron 备份
- 优点: 国内快, 数据私有
- 缺点: 自己维护 (黑写 `deploy.sh`)

### 13.3 百度 Worker 部署 (独立)
- Cloudflare Worker (免费额度足够)
- 或 VPS 上 Node.js 反代

> 📌 **老板决策点 Q4**: 部署平台?

### 13.4 硬件适配 🆕 v0.4 (基于老板 4c16g 当前 → 2c4g 未来生产)

**核心思路**: 用 `DEPLOY_MODE` 环境变量三档自适应, **不写两套代码**。

#### 13.4.1 三档定义

| DEPLOY_MODE | 适用主机 | PM2 模式 | Node heap | sharp 并发 | swap | Next.js | CDN |
|---|---|---|---|---|---|---|---|
| `dev` | 4c16g (开发/测试) | fork (1 实例) | 4 GB | 不限 | 0 | 标准 | 否 |
| `prod-16g` | 4c16g (生产 - 富配) | cluster max=2 | 2 GB | 4 | 0 | **standalone** | 可选 |
| `prod-4g` | 2c4g (生产 - 紧凑) | **fork (1 实例)** | **1.5 GB** | **1** | **2 GB 必备** | **standalone** | **强烈建议** |

#### 13.4.2 配置矩阵 (具体参数)

```bash
# .env (3 套, 各主机用对应一套)
# ──────── dev (4c16g 本地) ────────
DEPLOY_MODE=dev
NODE_OPTIONS=--max-old-space-size=4096
SHARP_CONCURRENCY=4
DATABASE_URL=file:./prisma/dev.db

# ──────── prod-16g (4c16g 生产) ────────
DEPLOY_MODE=prod-16g
NODE_OPTIONS=--max-old-space-size=2048
SHARP_CONCURRENCY=4
DATABASE_URL=file:/opt/obsidian-journal/prisma/prod.db
PM2_INSTANCES=2

# ──────── prod-4g (2c4g 生产 - 降配) ────────
DEPLOY_MODE=prod-4g
NODE_OPTIONS=--max-old-space-size=1536
SHARP_CONCURRENCY=1
DATABASE_URL=file:/opt/obsidian-journal/prisma/prod.db
PM2_INSTANCES=1
SWAP_SIZE_MB=2048
CDN_ENABLED=true
```

#### 13.4.3 关键约束 (2c4g 必须遵守)

**A. sharp 并发 = 1** (峰值内存控制):
```ts
// lib/media/upload.ts
import sharp from 'sharp';

const MAX_CONCURRENT = parseInt(process.env.SHARP_CONCURRENCY || '4');
let activeCount = 0;
const queue: Array<() => void> = [];

async function acquireSharp(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(() => { activeCount++; resolve(); }));
}

function releaseSharp(): void {
  activeCount--;
  const next = queue.shift();
  if (next) next();
}

export async function processImage(buffer: Buffer) {
  await acquireSharp();
  try {
    return await sharp(buffer).resize(1280).webp().toBuffer();
  } finally {
    releaseSharp();
  }
}
```

**B. SQLite WAL + 调优** (Prisma 启动时执行):
```ts
// lib/db.ts (启动 hook)
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.DEPLOY_MODE === 'dev' ? ['query', 'warn', 'error'] : ['error'],
});

export async function tuneSqlite() {
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL`);
    await prisma.$executeRawUnsafe(`PRAGMA busy_timeout = 5000`);
    await prisma.$executeRawUnsafe(`PRAGMA synchronous = NORMAL`);
    await prisma.$executeRawUnsafe(`PRAGMA mmap_size = 268435456`); // 256MB
    await prisma.$executeRawUnsafe(`PRAGMA cache_size = -64000`);    // 64MB cache
  }
}
```

**C. Next.js standalone** (生产必备):
```js
// next.config.mjs
export default {
  output: 'standalone',  // 🆕 v0.4 生产必备
  // ...
};
```

构建产物 `/.next/standalone/` 仅 ~30MB (vs 标准 ~150MB), 含所有依赖, 部署只需拷这个目录 + `public/` + `.next/static/`。

**D. swap 配置 (2c4g 必备)**:
```bash
# /swap/swapfile.conf (systemd-swap 或手动)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**E. sharp 跨平台编译**:
```bash
# 在 4c16g 开发机 (amd64) 编译, 然后 scp 到 2c4g 生产机
# 若生产机架构相同, 直接 npm ci --omit=dev 跳过编译
# 若不同 (如生产是 arm64), 在生产机单独 npm rebuild sharp

# deploy.sh 片段:
if [ "$(uname -m)" != "amd64" ]; then
  echo "⚠️ 非 amd64 架构, 需要 npm rebuild sharp"
  npm rebuild sharp
fi
```

#### 13.4.4 部署拓扑 (按主机标注)

```
   ┌──────────────────┐
   │   Cloudflare CDN │ ← 静态资源 /images/*.webp /_next/static/*
   │  (可选, 强烈建)  │
   └────────┬─────────┘
            │ 缓存命中走 CDN, miss 回落源站
            ▼
   ┌──────────────────┐
   │   Nginx (:443)   │
   │   + Let's Encrypt│
   └────────┬─────────┘
            │
   ┌────────┴─────────────────────────────┐
   │ Next.js (PM2 fork, 1 实例)            │
   │ Node heap 1.5G (2c4g) / 2G (4c16g)   │
   │ sharp concurrency 1 (2c4g) / 4 (16g)  │
   │ swap 2GB (2c4g) / 0 (16g)             │
   └────────┬─────────────────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ SQLite (WAL)     │
   │ content/ media/  │
   └──────────────────┘

   百度 Worker (独立, Cloudflare):
   ┌──────────────────┐
   │ pan-proxy.xxx    │
   │ (独立仓, 不占主) │
   └──────────────────┘
```

#### 13.4.5 资源预估 (2c4g 跑稳的边界)

| 资源 | 2c4g 上限 | 预估实际峰值 | 余量 |
|---|---|---|---|
| **Node heap** | 1.5 GB | ~1.0 GB (sharp 串行, RSC 流式) | 33% |
| **sharp 处理** | 共享 heap | ~300 MB / 张 | 串行安全 |
| **SQLite** | 文件 | ~50 MB + WAL 50 MB | 充足 |
| **系统 + 缓存** | ~1.5 GB | ~800 MB | 充足 |
| **swap** | 2 GB | 偶发 | 防 OOM |

**预计**: 2c4g 可承载 **日 PV < 5000**, 同时在线 < 100。超此规模需升配或迁 Postgres。

> 📌 **老板决策点 Q12**: 是否启用 2c4g 降级模式?
> - 黑推荐: **默认支持**, `DEPLOY_MODE=prod-4g` 一键启用
> - 不启用也行 (4c16g 跑 v0.3 默认配置已经够), 但**未来部署到 2c4g 时必开**

#### 13.4.6 监控告警 (2c4g 必备)

```bash
# /usr/local/bin/healthcheck.sh (定时 5min 跑, 超阈值企业微信告警)
MEM_PCT=$(free | awk '/^Mem:/{printf "%.0f", $3/$2*100}')
DISK_PCT=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
SWAP_USED=$(free | awk '/^Swap:/{printf "%.0f", $3/$2*100}')

if [ "$MEM_PCT" -gt 85 ]; then
  curl -X POST "$WECOM_WEBHOOK" -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"⚠️ OJ 内存 $MEM_PCT%\"}}"
fi
```

---

## 14. 安全考虑 (v0.3 详化 CustomHtmlBlock)

| 风险 | 缓解 | v0.3 |
|---|---|---|
| 站长密码泄漏 | bcrypt (cost=12) + 失败限流 | |
| 越权 | Middleware + RSC 二次校验 | |
| MD XSS | unified + rehype-sanitize + CSP | |
| **CustomHtmlBlock XSS** 🆕 | SiteConfig.allowCustomHtml=false 默认 + **DOMPurify 编译期二次清洗** | §14.1 |
| 视频 iframe framejacking | sandbox + referrerPolicy | |
| 文件上传炸弹 | Content-Length 限制 + mime 白名单 | |
| CSRF | Auth.js + Origin 校验 | |
| 媒体上传类型 | mime 白名单 + sharp 重处理 | |

### 14.1 CustomHtmlBlock 开启路径 🆕

**开启步骤** (老板流程):
1. 登录 Admin → `/admin/settings`
2. 找到 "允许自定义 HTML Block" 开关 (默认关)
3. 点击开关 → **弹二次确认**:
   ```
   ⚠️ 风险警告
   
   启用自定义 HTML Block 允许你在 Page Builder 中插入任意 HTML/JavaScript。
   - 可能引入 XSS 漏洞
   - 任何用户输入都将被当作可信代码执行
   - 启用后所有 HTML 仍会经过 DOMPurify 二次清洗
   - 黑视角: 强烈建议保持禁用, 99% 场景用其他 Block 已足够
   
   [取消]  [我已知风险, 启用]
   ```
4. 确认 → 开关置 true → 写 DB

**前端行为** (Page Builder):
- `allowCustomHtml = false` (默认):
  - Block 库中"自定义 HTML ⚠️"项显示**灰色 disabled**, hover 提示:
    ```
    🔒 自定义 HTML Block 已禁用
    
    前往 Settings → 站点设置 → 允许自定义 HTML Block 启用。
    启用前请评估 XSS 风险。
    ```
- `allowCustomHtml = true`:
  - Block 可拖入, 选中后右侧表单显示 textarea (Monaco Editor 高亮)
  - 保存时**仍走 DOMPurify 二次清洗**:

```ts
// lib/media/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['div', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 
                 'blockquote', 'code', 'pre', 'strong', 'em', 'br', 'span', 
                 'iframe', 'video'],  // 受控白名单
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 
                 'width', 'height', 'allow', 'sandbox'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],  // 阻止事件处理器
};

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}

// Server Action: savePageLayout 内
if (block.type === 'customHtml') {
  block.data.html = sanitizeHtml(block.data.html);
}
```

**黑视角**: 即使开启, DOMPurify 也保证零 XSS。但仍建议老板保持禁用, 因为:
- 99% 场景能用 TextBlock (支持 MD) + 其他 Block 表达
- CustomHtml 多了 = 维护成本 + 安全审计成本
- 真要嵌入 B 站/YouTube, 用 VideoEmbed Block (Phase 2 单独做, 不依赖 CustomHtml)

> 📌 **老板决策点 Q9b**: CustomHtmlBlock 是否允许开启?
> - 黑推荐: **默认禁用**, Settings 显式开启 (上述流程)

---

## 15. 开发路线图 (v0.3 加 view 计数 + 重建索引)

### Phase 0 ✅
- 立项 + v0.1/v0.2/v0.3 方案

### Phase 1 — 骨架 (3-5 天)
- [ ] Next.js 14 + 全 v0.3 schema (11 model)
- [ ] seed.ts: 1 Novel + 2 Volume + 4 Chapter + 1 Series + 2 Post + 1 Video + 1 VideoSeries + 3 Media + 5 Social + Page("home") 配 5 Block
- [ ] Auth.js + 登录 + Middleware
- [ ] 基础布局 + 双主题 (默认亮色) + Lenis
- [ ] **13 种 Block 渲染器** (含 Callout, 不含 Marquee)
- [ ] 首页 (Page("home") + Block[Hero, Stats, Posts, Callout])
- [ ] View 计数 (Server Action: recordView, 同 IP 24h 防刷)

### Phase 2 — 内容展示 (4-6 天, v0.3 加 Novel/Volume 详情页)
- [ ] 5 大专栏列表
- [ ] Post + Chapter 详情页 + Shiki + TOC
- [ ] **Novel/Volume 详情页 + 作品状态徽章** 🆕
- [ ] Series 列表 + 详情 (收紧为 tech/life)
- [ ] Video 列表 + B 站 + 百度 (B 方案) + YouTube
- [ ] **FTS5 搜索 + 重建索引脚本 + 定时 cron** 🆕
- [ ] SEO + Lighthouse 移动 ≥ 92

### Phase 3 — Admin 后台 (8-12 天, v0.3 加量)
- [ ] Admin 布局
- [ ] MD 上传 (article/chapter 区分 + 选 series/volume)
- [ ] **Novel/Volume/Chapter 三层 CRUD** 🆕
- [ ] Series (tech/life) CRUD
- [ ] Video + VideoSeries CRUD 🆕
- [ ] **Social CRUD** 🆕
- [ ] 媒体库 (上传/多尺寸/blurhash/**MediaUsage 引用追踪** 🆕)
- [ ] **Page Builder (CustomHtml 受开关控制 + DOMPurify 清洗)** 🆕
- [ ] **Settings (allowCustomHtml 开关 + 二次确认)** 🆕
- [ ] **Admin /admin/reindex (重建 FTS5 索引)** 🆕
- [ ] **百度 Worker 独立仓库开发** 🆕
- [ ] 站点设置

### Phase 4 — 打磨 (4-6 天)
- [ ] 动画 + 移动端 + 性能
- [ ] 部署脚本 (主站 + Worker)
- [ ] README + 运营文档

**总计**: 19-29 天 (Phase 2/3 增)

---

## 16. 待老板拍板 (Q1-Q12, v0.4 增 1 项)

| # | 决策项 | 黑推荐 | 状态 |
|---|---|---|---|
| **Q1** | 项目名 | `obsidian-journal` | 🟡 |
| **Q2** | 评论区 | 不做 | 🟡 |
| **Q3** | 百度方案 | B (真直接播) + C 降级 | 🟡 |
| **Q4** | 部署平台 | 自托管 VPS | 🟡 |
| **Q5** | 默认主题 | 亮色 + 暗色切换 | 🟡 |
| **Q6** | 评论 LLM | 不做 (v2) | 🟡 |
| **Q7** | Worker 部署 | Cloudflare Worker | 🟡 |
| **Q8** | 媒体域名 | 同站 /media/ | 🟡 |
| **Q9** | Page Builder 模式 | 自由搭建 | 🟡 |
| **Q9b** 🆕 | **CustomHtmlBlock 开关** | **默认禁用 + Settings 显式开启** | 🟡 |
| **Q10** 🆕 | **Worker 仓库结构** | **独立 repo** `obsidian-journal-baidu-proxy` | 🟡 |
| **Q11** 🆕 | **Novel 模型** | **Novel + NovelVolume 双层** | 🟡 |
| **Q12** 🆕 | **2c4g 降级模式** | **默认支持, DEPLOY_MODE=prod-4g 启用** | 🟡 |

### 优先级 (黑建议审阅顺序)

| 优先级 | 决策 | 影响 |
|---|---|---|
| 🔴 P0 | Q1 项目名 / Q3 百度 / Q11 Novel | 阻塞 Phase 1 |
| 🟡 P1 | Q4 部署 / Q5 默认主题 / Q9 Page Builder / Q10 Worker 仓库 / Q12 降级 | 阻塞 Phase 1-3 |
| 🟡 P1 | Q9b CustomHtml 开关 | Settings 配置 |
| 🟢 P2 | Q2 评论 / Q6 LLM / Q7 Worker 部署 / Q8 媒体域名 | 不阻塞 |

---

## 17. 风险与开放问题 (v0.3 加)

| 风险 | 影响 | 黑预案 |
|---|---|---|
| 百度 Worker 反爬 | B 失效 | `.env` 切 C |
| 百度合规 | ToS 风险 | 老板自决 |
| B 站 iframe 限速 | 国内卡 | 跳转按钮 |
| **FTS5 同步失败** 🆕 | 搜索不到新文章 | 降级发布 + Admin 重建按钮 + cron |
| **CustomHtmlBlock XSS** 🆕 | 高风险 | 默认禁用 + DOMPurify 二次清洗 |
| **媒体删除误删引用** 🆕 | Post 图片失效 | MediaUsage 检测 + 警告 |
| SQLite 写入并发 | 几乎不会 | 切 Postgres |
| 媒体库磁盘 | sharp 压缩 + 自动清理 |
| FTS5 中文分词 | 效果一般 | unicode61, 后续 trigram |

---

## 18. 后续 v2 (不变)

---

## 19. 媒体库模块 (v0.3 加引用追踪)

### 19.4 媒体库 UI (v0.3 加引用追踪展示)

每张图右侧栏显示"**被 N 处引用**":
```
[缩略图]  cover-abc.jpg
          /media/images/640/abc.webp
          1024×768 · 120KB
          blurhash: LKO2?U%2Tw=w]~RBVZRi};RPxuwH
          
          ⚠️ 被 3 处引用:
            • Post: "Rust 入门" (coverUrl)
            • Page: "/about" (layout.hero.bgImage)
            • Chapter: "元界·第一章" (contentMd)
          
          [复制 URL]  [编辑 Alt]  [删除 ⚠️]
```

删除时:
```
⚠️ 此媒体被 3 处引用

删除后以下位置将显示破图:
• Post: "Rust 入门" → 封面
• Page: "/about" → Hero 背景
• Chapter: "元界·第一章" → 第 3 段图

[取消]  [仍然删除]  [替换为其他媒体...]
```

### 19.5 MediaUsage 同步管线 🆕

```ts
// lib/media/usage.ts

export async function trackMediaUsage(
  mediaId: string, refType: 'post'|'chapter'|'page'|'video',
  refId: string, field: string
) {
  await prisma.mediaUsage.upsert({
    where: { mediaId_refType_refId_field: { mediaId, refType, refId, field } },
    create: { mediaId, refType, refId, field },
    update: {},  // 已存在则 noop
  });
}

// uploadPost / updatePageLayout 内扫描并同步
async function syncMediaRefs(refType: string, refId: string, content: string) {
  // 1. 提取 content 中所有 /media/images/... 引用
  const mediaUrls = extractMediaUrls(content);
  // 2. 找对应 mediaId
  const mediaIds = await Promise.all(mediaUrls.map(async (url) => {
    const m = await prisma.media.findUnique({ where: { url } });
    return m?.id;
  })).then(ids => ids.filter(Boolean));
  // 3. 删旧引用
  await prisma.mediaUsage.deleteMany({ where: { refType, refId } });
  // 4. 加新引用
  for (const id of mediaIds) {
    await trackMediaUsage(id, refType, refId, 'contentMd');
  }
}
```

---

## 20. 系列/合集 (v0.3 收紧: 仅 tech/life)

### 20.1 概念调整
- **Series**: 仅 tech/life 文章系列 (如 "Rust 入门" 5 篇)
- **Novel**: 小说作品 (如 "元界" 含多卷)
- **NovelVolume**: 小说卷 (如 "元界 第一卷·崛起")

### 20.2 路由
- `/series` — tech/life 系列列表 (Tab 切分类)
- `/series/[slug]` — 系列详情 (Post 横向卡片)
- `/novels` — 小说作品列表 (大卡片: 封面/状态/卷数/总字数)
- `/novels/[slug]` — 作品详情 (卷列表)
- `/novels/[slug]/[volSlug]` — 卷详情 (章节列表)

---

## 21. Page Builder 详解 (v0.3 加 CustomHtml 受控)

### 21.1 UI 三栏 (不变)

### 21.2 Block 库显示 (v0.3 加 CustomHtml 状态)

```
Block 库 (左栏):
  ▢ Hero           ✓ 正常
  ▢ Text           ✓ 正常
  ▢ Gallery        ✓ 正常
  ▢ Stats          ✓ 正常
  ▢ Skills         ✓ 正常
  ▢ Timeline       ✓ 正常
  ▢ Links          ✓ 正常
  ▢ Posts          ✓ 正常
  ▢ Videos         ✓ 正常
  ▢ Divider        ✓ 正常
  ▢ Callout        ✓ 正常 (v0.3 新增)
  ▢ Music          ⓘ 高级 (默认折叠)
  ▢ Custom HTML    🔒 已禁用 (Settings 启用)
```

### 21.3 数据流 (不变)

---

## 22. Worker 仓库结构 🆕

### 22.1 方案对比

| 方案 | 优点 | 缺点 | 黑推荐 |
|---|---|---|---|
| **A. 独立 repo** | 部署独立, 生命周期解耦, 主仓精简 | 跨仓库 PR/issue 跟踪 | ⭐ **默认** |
| B. monorepo (pnpm workspace) | 单仓管理, 共享类型 | CI 复杂, Worker 部署独立 | 备选 |
| C. 直接放主仓 `workers/` 子目录 | 简单 | 混入前端构建, 关注点不分离 | ❌ |

### 22.2 黑推荐: 独立 repo

**新仓库**: `blackclaw0318/obsidian-journal-baidu-proxy`

**目录** (200~300 行代码):
```
obsidian-journal-baidu-proxy/
├── src/
│   ├── index.ts          # Worker 入口 (fetch handler)
│   ├── baidu-resolver.ts # 分享链接 → 直链 (核心 ~100 行)
│   ├── embed.html.ts     # 返回 HTML 模板 (hls.js + fallback)
│   └── types.ts
├── wrangler.toml         # Cloudflare 配置
├── package.json
├── tsconfig.json
├── README.md             # 部署 + 百度反爬策略更新日志
└── tests/
    └── baidu-resolver.test.ts
```

**主仓与 Worker 仓的接口**:
- 主仓 `.env`: `BAIDU_WORKER_URL=https://pan-proxy.xxx.workers.dev`
- Worker 不依赖主仓代码, 仅共享一个 `interface Video { platform, surl, pwd }` 接口约定 (可手动同步或后续抽 `packages/shared-types`)

**部署**:
```bash
cd obsidian-journal-baidu-proxy
pnpm install
pnpm wrangler deploy
# 输出: Published pan-proxy (X.XX sec)
# URL: https://pan-proxy.xxx.workers.dev
```

**监控** (Phase 4):
- Worker 端: Cloudflare Analytics
- 主仓 `/api/health`: 检查 Worker URL 是否返回 200
- 失败率 > 10% → 告警 (企业微信)

### 22.3 备选: monorepo

若老板倾向单仓管理, 改造方案:
```
obsidian-journal-monorepo/   # 新仓库名
├── apps/
│   ├── web/                 # Next.js 主站 (移自 obsidian-journal)
│   └── baidu-proxy/         # Worker (上面目录)
├── packages/
│   └── shared-types/        # 共享 TS 类型
├── pnpm-workspace.yaml
└── turbo.json               # 或 nx
```

> ⚠️ 但需要把现有 `obsidian-journal` 仓库改造, **黑不推荐**: 已推送的 v0.3 文档归零, 反而复杂。

> 📌 **老板决策点 Q10**: 独立 repo (黑推荐) / monorepo?

---

## 23. View 计数方案 🆕

### 23.1 需求
- Post / Chapter / Video 详情页每次访问 +1 view
- 防刷: 同 IP 24h 内只 +1

### 23.2 实现 (DB 简单版)

```ts
// lib/views.ts
import { headers } from 'next/headers';

const VIEW_COOLDOWN_HOURS = 24;

export async function recordView(
  refType: 'post'|'chapter'|'video', refId: string
): Promise<{ recorded: boolean }> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const cacheKey = `view:${refType}:${refId}:${ip}`;
  
  // 简单内存缓存 (单实例够用, 多实例上 Redis)
  const lastView = memoryCache.get(cacheKey);
  const now = Date.now();
  if (lastView && now - lastView < VIEW_COOLDOWN_HOURS * 3600_000) {
    return { recorded: false };
  }
  memoryCache.set(cacheKey, now);
  
  // DB +1
  const table = { post: 'post', chapter: 'chapter', video: 'video' }[refType];
  await prisma.$executeRawUnsafe(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, refId);
  
  // 日统计
  await prisma.dailyStat.upsert({
    where: { date: startOfDay(now) },
    create: { date: startOfDay(now), [`${refType}Views`]: 1 },
    update: { [`${refType}Views`]: { increment: 1 } },
  });
  
  return { recorded: true };
}

// 详情页 RSC 内调用:
export default async function PostPage({ params }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  await recordView('post', post.id);  // 不 await 也行 (不阻塞渲染)
  return <Article post={post} />;
}
```

### 23.3 升级路径 (Phase 4 可选)
- 多实例 → Redis 替代内存缓存
- 详情页用 `unstable_after` (Next.js 14.2+) 异步记录, 不阻塞渲染

> **黑推荐**: Phase 2 实现 DB 简单版, 个人站够用。

---

## 24. Novel 模型设计详解 🆕

### 24.1 三层结构

```
Novel (作品: "元界")
├── NovelVolume (卷 1: "第一卷·崛起")
│   ├── Chapter (第 1 章)
│   ├── Chapter (第 2 章)
│   └── ...
├── NovelVolume (卷 2: "第二卷·远征")
│   └── ...
```

### 24.2 关系图

```
Novel (1) ──< (N) NovelVolume (1) ──< (N) Chapter
                                              │
                                              └── (1) MediaUsage (可选)
```

### 24.3 URL 设计

| 资源 | URL 模式 | 例 |
|---|---|---|
| 作品列表 | `/novels` | |
| 作品详情 | `/novels/{novel.slug}` | `/novels/meta-realm` |
| 卷详情 | `/novels/{novel.slug}/{vol.slug}` | `/novels/meta-realm/volume-1-rise` |
| 章节详情 | `/chapters/{chapter.slug}` | `/chapters/chapter-1-awakening` |

**章节独立 URL 模式**: 即使换了卷/作品, 章节 URL 也稳定, 利于 SEO + 友链引用。

### 24.4 作品状态

```prisma
enum NovelStatus { ONGOING COMPLETED HIATUS }
```

UI 显示:
- ONGOING → 绿色徽章 "连载中"
- COMPLETED → 灰色徽章 "已完结"
- HIATUS → 橙色徽章 "休刊中"

### 24.5 MD 上传 chapter 选卷

```markdown
---
title: 第一章 · 觉醒
type: chapter
volume: volume-1-rise        # 🆕 v0.3 字段名 (原 series)
chapter: 1
date: 2026-06-24
---

# 正文
```

Server Action 解析时:
```ts
const volume = await prisma.novelVolume.findUnique({ 
  where: { novelId_slug: { novelId, slug: frontmatter.volume } } 
});
if (!volume) throw new ActionError(`卷不存在: ${frontmatter.volume}`);

// 创建 chapter
const chapter = await prisma.chapter.create({
  data: { ...frontmatter, volumeId: volume.id, chapterNo: frontmatter.chapter }
});
```

### 24.6 章节导航 (chapters/[slug])

页底显示:
```
← 上一章                       下一章 →
(chapter-0-prologue)        (chapter-2-conflict)

所属: 元界 / 第一卷·崛起  [查看全卷 →]
```

---

> 📌 **审核路径建议**:
> 1. §0 TL;DR (30 秒)
> 2. §6 数据模型 (看 Novel/Volume/MediaUsage/Social/VideoSeries)
> 3. §14.1 CustomHtmlBlock 开启路径
> 4. §22 Worker 仓库结构
> 5. §16 11 决策 (按 P0→P2)
>
> 老板审完拍板, 黑立刻动 Phase 1。
