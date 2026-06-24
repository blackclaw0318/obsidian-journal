# Obsidian Journal — 个人博客平台设计文档

> 版本: **v0.2 · 方案稿 (基于老板反馈重写)**
> 作者: 黑 (Hei)
> 创建: 2026-06-24 (v0.1) → 重写 2026-06-24 (v0.2)
> 仓库: `blackclaw0318/obsidian-journal`
> 详见: `docs/CHANGELOG.md` v0.1→v0.2 改动总览

---

## 0. TL;DR (30 秒读完)

- **做什么**: 单站长个人博客, 极简黑白风, 大量微动态, **13 种 Block 可视化页面搭建**
- **核心升级 (v0.2)**:
  1. **Page Builder**: 站长可在任意页面**自由添加/删除/拖拽** 13 种 Block (技能雷达/时间线/友链/统计...)
  2. **百度网盘真直接播**: 主推方案 B (第三方解析服务), 降级方案 C
  3. **数据模型严谨化**: Post / Chapter 拆表 + Prisma enum + Series + Media
  4. **媒体库**: 上传图片自动生成多尺寸 + blurhash + URL 替换
  5. **默认亮色**: 暗色仍高质量 (切换器保留)
- **技术栈**: Next.js 14 + TS + Tailwind + shadcn/ui + Prisma + SQLite + Auth.js v5 + Framer Motion + Lenis + dnd-kit + Shiki + sharp
- **审核重点**: §16 "待老板拍板" (Q1-Q9, 9 决策)

---

## 1. 项目命名建议

> 当前默认: **`obsidian-journal`** (黑曜石日志)

| 候选 | 含义 | 风格 | 黑推荐 |
|---|---|---|---|
| `obsidian-journal` | 黑曜石日志 | 沉稳、文学、私人 | ⭐ **默认** |
| `mono-press` | 单色出版 | 极简、内容为王 | 备选 1 |
| `inkwell` | 墨水瓶 | 写作感、东方韵味 | 备选 2 |
| `handfoot-blog` | 商业帝国系 | 品牌一致 | 备选 3 |
| `sk-journal` | 老板缩写 | 最简洁 | 备选 4 |

> 📌 **老板决策点 Q1**: 选哪个? 不拍就先用 `obsidian-journal`。

---

## 2. 设计哲学

### 2.1 视觉关键词
**简洁 · 现代 · 青春 · 高级**

### 2.2 配色规范 (黑白配, v0.2 改默认亮色)

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
- **亮色 (默认)**: 白底 + 黑字, 大量留白, 现代博客主流
- **暗色**: 黑底 + 白字, 契合"黑曜石"主题, 晚间阅读
- 切换器右上角, 带"溶解"过渡动画 (200ms)

### 2.3 字体方案
| 用途 | 字体 |
|---|---|
| 中文标题 | 思源黑体 SC (Source Han Sans) |
| 中文正文 | 思源黑体 SC Light |
| 英文标题 | Geist Sans |
| 英文正文 | Geist Sans |
| 代码 | JetBrains Mono |
| 手写装饰 | LXGW WenKai (霞鹜文楷) |

全部 `next/font` 自托管, **0 第三方 CDN 请求**。

### 2.4 排版尺度
- 基线网格 8px
- 行高: 正文 1.7 / 标题 1.2
- 最大行宽: 720px (正文) / 1280px (列表)
- 段落间距 1.5em

---

## 3. 技术栈选型 (v0.2 加粗标注新增)

### 3.1 一图速览

```
┌─────────────────────────────────────────────────────────┐
│  Frontend                                                │
│  Next.js 14 (App Router) · TypeScript 5.x · React 18    │
│  Tailwind CSS 3.4 + shadcn/ui · Framer Motion 11         │
│  Lenis (smooth scroll) · next-themes (双主题)            │
│  **dnd-kit (Page Builder 拖拽) 🆕**                       │
│  **react-hook-form + zod (Block 配置表单) 🆕**            │
├─────────────────────────────────────────────────────────┤
│  Backend (全在 Next.js 内, 无独立后端)                    │
│  Server Actions · Route Handlers · Middleware (auth)     │
│  Prisma 5 ORM · SQLite (FTS5 全文搜索 🆕)                 │
│  Auth.js v5 (NextAuth) · bcrypt                          │
│  gray-matter + unified (MD 解析) · Shiki (代码高亮)      │
│  **sharp (图片多尺寸/blurhash 生成) 🆕**                  │
├─────────────────────────────────────────────────────────┤
│  视频                                                    │
│  B 站: BV 号 → iframe 嵌入                                │
│  **百度网盘: 第三方解析服务真直接播 🆕**                    │
│  YouTube / 本地: 标准 iframe / video 标签                │
├─────────────────────────────────────────────────────────┤
│  DevOps                                                  │
│  pnpm · ESLint · Prettier · Vitest · Playwright          │
│  自托管 VPS (黑推荐) 或 Vercel                            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 选型理由

| 选型 | 替代方案 | 选定理由 |
|---|---|---|
| **Next.js 14** | Astro / Nuxt | 前后端一体, Server Actions 适配 MD 上传, RSC 让公开页接近静态 |
| **dnd-kit** 🆕 | react-dnd / SortableJS | 现代 React 拖拽, 支持复杂约束, TS 友好, 体积小 |
| **react-hook-form + zod** 🆕 | Formik / Yup | 性能最好, 类型安全, Block 配置表单必备 |
| **Prisma enum** 🆕 | String 字段 | 严谨, 避免脏数据, IDE 提示 |
| **SQLite FTS5** 🆕 | Fuse.js / Meilisearch | 零依赖, 万级 < 50ms, 量大了再上 Meilisearch |
| **sharp** 🆕 | jimp / ImageMagick | Node.js 图片处理最快, 自动生成 WebP + blurhash |
| **Framer Motion + Lenis** | GSAP | FM 配合 React 最顺; Lenis 滚动丝滑感天花板 |
| **shadcn/ui** | MUI / Chakra | 黑白极简风用 shadcn 最契合 (无样式可改组件) |
| **Auth.js v5** | Lucia | Next.js 生态首选, Credentials 单用户模式 |
| **Shiki** | Prism | 构建期渲染, 零运行时 JS, VSCode 同款 |

### 3.3 明确的"不选"
- ❌ Headless CMS (Strapi/Contentful) — 单人博客杀鸡用牛刀
- ❌ MongoDB — 关系数据, 上 SQL
- ❌ 自托管视频 — 永远不碰, B 站/百度解决
- ❌ Fuse.js — FTS5 完胜 (Fuse 200 篇后明显卡顿)
- ❌ PageSection 单表 — 不够灵活, 升 Page + Block[]

---

## 4. 系统架构

```
                        ┌──────────────────────┐
                        │   公开访客 (Browser)  │
                        └──────────┬───────────┘
                                   │ 1. GET /
                                   ▼
        ┌──────────────────────────────────────────┐
        │           Next.js (Vercel / 自托管)      │
        │ ┌────────────────────────────────────┐   │
        │ │  RSC (Server Components)           │   │
        │ │  - / (Page 渲染 Block[])           │   │
        │ │  - /about /tech /life /novels      │   │
        │ │  - /series/[slug] 🆕               │   │
        │ │  - /posts/[slug] /chapters/[slug]🆕│   │
        │ └────────────────────────────────────┘   │
        │ ┌────────────────────────────────────┐   │
        │ │  Middleware (auth)                 │   │
        │ │  - /admin/* 强制鉴权               │   │
        │ └────────────────────────────────────┘   │
        └──────────┬──────────────────┬────────────┘
                   │                  │
          2.Prisma │                  │ 3. 文件系统
                   ▼                  ▼
            ┌────────────┐     ┌────────────────┐
            │  SQLite    │     │  content/      │
            │  + FTS5    │     │  *.md 原件     │
            │  (单文件)  │     │  + media/ 🆕   │
            └────────────┘     │  + assets/     │
                                └────────────────┘

                        ┌──────────────────────┐
                        │  站长 (Owner, 登录)   │
                        └──────────┬───────────┘
                                   │ Server Action
                                   ▼
        ┌──────────────────────────────────────────┐
        │  Server Actions:                          │
        │  - uploadPost() / uploadChapter() 🆕      │
        │  - parseAndPublish()                      │
        │  - updatePageLayout() 🆕 (Page Builder)  │
        │  - uploadMedia() 🆕                       │
        │  - upsertSeries() 🆕                      │
        └──────────────────────────────────────────┘
```

### 4.1 关键设计原则
1. **公开页全走 RSC + DB 读**, 不在请求时编译 MD
2. **编译发生在上传瞬间**, 渲染结果 (HTML) 存进 DB 的 `htmlCache` 字段
3. **原 MD 同步落盘 `content/`**, 方便本地 git 管理 + 灾备
4. **Page.layout 存 JSON**, Block 类型 + 数据, 站长可视化编辑
5. **Middleware 鉴权**: `/admin/*` 全部拦截, 未登录跳 `/login`
6. **媒体库独立目录 `media/`**, 与 `content/` 分离, 走 CDN URL 🆕

---

## 5. 目录结构 (v0.2 新增项加 🆕)

```
obsidian-journal/
├── docs/                       # 设计/方案文档
│   ├── DESIGN.md              # 总设计 (本文)
│   ├── ARCHITECTURE.md        # 详细架构
│   ├── ROADMAP.md             # 阶段路线图
│   ├── DECISIONS.md           # 老板拍板记录
│   ├── CHANGELOG.md           # 改动总览 🆕
│   └── PUSH_NOTES.md          # 推送备忘
├── app/                        # Next.js App Router
│   ├── (public)/              # 公开页 (游客可见)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # 首页 (Page Block 渲染)
│   │   ├── about/             # 基础简介 (Page Builder 可改)
│   │   ├── tech/              # 技术专栏
│   │   ├── life/              # 生活专栏
│   │   ├── novels/            # 小说专栏
│   │   ├── videos/            # 视频专栏
│   │   ├── series/            # 系列/合集 🆕
│   │   │   ├── page.tsx       #   系列列表
│   │   │   └── [slug]/page.tsx # 系列详情 (含 posts/chapters)
│   │   ├── posts/[slug]/      # 普通文章
│   │   ├── chapters/[slug]/   # 小说章节 🆕
│   │   └── videos/[id]/       # 视频详情
│   ├── (admin)/               # 管理后台
│   │   ├── layout.tsx
│   │   ├── dashboard/         # 仪表盘
│   │   ├── posts/             # 文章管理
│   │   ├── chapters/          # 章节管理 (小说) 🆕
│   │   ├── series/            # 系列管理 🆕
│   │   ├── videos/            # 视频管理
│   │   ├── media/             # 媒体库 🆕
│   │   ├── pages/             # Page Builder 🆕
│   │   │   ├── page.tsx       #   页面列表
│   │   │   └── [key]/edit/    #   Page Builder 编辑器
│   │   ├── upload/            # MD 上传页
│   │   └── settings/          # 站点设置
│   ├── (auth)/login/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── media/[id]/        # 媒体代理 (CDN) 🆕
│   │   └── revalidate/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui
│   ├── motion/                # Framer Motion
│   ├── blog/
│   ├── video/
│   ├── nav/
│   ├── media/                 # 媒体组件 🆕
│   │   ├── MediaPicker.tsx    #   选择器 (在 MD 编辑/Block 用)
│   │   ├── ImageGallery.tsx
│   │   └── UploadDropzone.tsx
│   ├── blocks/                # 🆕 13 种 Block 渲染器
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
│   │   ├── CustomHtmlBlock.tsx
│   │   ├── MarqueeBlock.tsx
│   │   ├── MusicBlock.tsx
│   │   └── registry.ts        # 类型注册表
│   └── admin/                 # 后台组件
│       └── page-builder/      # Page Builder UI 🆕
│           ├── BlockLibrary.tsx
│           ├── PreviewCanvas.tsx
│           ├── BlockConfigForm.tsx
│           └── SortableBlock.tsx
├── lib/
│   ├── db.ts                  # Prisma + FTS5 🆕
│   ├── auth.ts                # Auth.js
│   ├── md/
│   ├── video/
│   │   ├── bilibili.ts
│   │   ├── baidu-b.ts         # B 方案真直接播 🆕
│   │   └── baidu-c.ts         # C 方案降级
│   ├── blocks/                # 🆕 Block schema (zod)
│   │   ├── schemas.ts         #   13 种 zod schema
│   │   └── renderer.tsx       #   类型 → 组件
│   ├── media/                 # 🆕
│   │   ├── upload.ts          #   sharp 处理
│   │   └── blurhash.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma          # v0.2 重写
│   └── seed.ts
├── content/                    # MD 原件落盘
│   ├── tech/                  # ⚠️ gitignored (体积)
│   ├── life/                  # ⚠️ gitignored
│   ├── novels/                # ⚠️ gitignored
│   └── videos/                # ⚠️ gitignored
├── media/                      # 🆕 媒体库 (gitignored)
│   ├── images/
│   │   ├── originals/
│   │   ├── 320/               # 自动生成
│   │   ├── 640/
│   │   └── 1280/
│   └── docs/
├── public/                     # 静态资源
├── tests/
├── .env.example
├── .gitignore                  # v0.2 细化
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## 6. 数据模型 (v0.2 重写)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============ 枚举 (v0.2 新增, 替代 String) ============

enum PostCategory {
  TECH
  LIFE
  NOVEL
}

enum PostType {
  ARTICLE   // 普通文章 (tech/life)
  CHAPTER   // 小说章节
}

enum VideoPlatform {
  BILIBILI
  BAIDU
  YOUTUBE
  NATIVE
}

enum MediaType {
  IMAGE
  VIDEO
  DOCUMENT
  AUDIO
}

enum PageType {
  SYSTEM   // 系统页 (home/about/tech/...)
  CUSTOM   // 自定义页 (站长新建)
}

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
  id           Int      @id @default(1)
  siteName     String   @default("Obsidian Journal")
  tagline      String?
  authorName   String?
  authorAvatar String?
  socials      String?  // JSON
  footerNote   String?
  defaultTheme String   @default("light")  // v0.2: 默认亮色
  updatedAt    DateTime @updatedAt
}

// ============ 系列/合集 (v0.2 新增) ============
model Series {
  id          String      @id @default(cuid())
  slug        String      @unique
  name        String
  description String?
  coverUrl    String?
  category    PostCategory
  type        PostType    // ARTICLE series OR NOVEL series
  posts       Post[]
  chapters    Chapter[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([category, type])
}

// ============ 普通文章 (tech/life) ============
model Post {
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  excerpt     String?
  category    PostCategory
  type        PostType     @default(ARTICLE)
  tags        String?      // JSON array
  coverUrl    String?
  sourcePath  String?
  contentMd   String
  htmlCache   String
  published   Boolean      @default(true)
  pinned      Boolean      @default(false)
  publishedAt DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  views       Int          @default(0)
  likes       Int          @default(0)
  
  seriesId    String?
  series      Series?      @relation(fields: [seriesId], references: [id])
  
  @@index([category, publishedAt])
  @@index([seriesId])
}

// ============ 小说章节 (v0.2 独立表) ============
model Chapter {
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  excerpt     String?
  coverUrl    String?
  sourcePath  String?
  contentMd   String
  htmlCache   String
  chapterNo   Int          // 章节号 (在 series 内)
  wordCount   Int          @default(0)
  published   Boolean      @default(true)
  publishedAt DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  views       Int          @default(0)
  
  seriesId    String
  series      Series       @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  
  @@unique([seriesId, chapterNo])
  @@index([seriesId, publishedAt])
}

// ============ 视频 ============
model Video {
  id          String        @id @default(cuid())
  slug        String        @unique
  title       String
  description String?
  coverUrl    String?
  platform    VideoPlatform
  sourceId    String        // BV 号 / 百度 surl / youtube id
  password    String?       // 百度提取码
  duration    Int?
  series      String?       // 系列名 (字符串, 不与 Series 表关联)
  tags        String?
  publishedAt DateTime      @default(now())
  views       Int           @default(0)
}

// ============ 页面 (v0.2 升级: Page + Block[]) ============
model Page {
  id        String   @id @default(cuid())
  key       String   @unique  // "home" | "about" | "tech" | 自定义 slug
  title     String
  type      PageType @default(SYSTEM)
  layout    String   // JSON: { blocks: Block[] }
  isPublic  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============ 媒体 (v0.2 新增) ============
model Media {
  id          String    @id @default(cuid())
  filename    String    // 原始文件名
  mimeType    String
  size        Int       // 字节
  type        MediaType
  storageKey  String    @unique  // media/images/originals/abc.jpg
  url         String    // 公开 URL
  width       Int?
  height      Int?
  blurhash    String?
  alt         String?
  caption     String?
  uploadedBy  String
  uploader    User      @relation(fields: [uploadedBy], references: [id])
  createdAt   DateTime  @default(now())
  
  @@index([type, createdAt])
}

// ============ 统计 ============
model DailyStat {
  date       DateTime @id
  postViews  Int      @default(0)
  videoViews Int      @default(0)
  newPosts   Int      @default(0)
}
```

### 6.1 Block 数据结构 (存于 Page.layout JSON) 🆕

```ts
// lib/blocks/schemas.ts (zod)
type BlockBase = { id: string; order: number; visible: boolean };

type HeroBlock      = BlockBase & { type: 'hero'; data: { title; subtitle?; ctaText?; ctaUrl?; bgImage? } };
type TextBlock      = BlockBase & { type: 'text'; data: { md: string; align?: 'left'|'center' } };
type GalleryBlock   = BlockBase & { type: 'gallery'; data: { images: string[]; columns: 2|3|4; gap: number } };
type StatsBlock     = BlockBase & { type: 'stats'; data: { items: { label; value: number; suffix?: string }[] } };
type SkillsBlock    = BlockBase & { type: 'skills'; data: { items: { name; level: number }[] } };  // level 0-100
type TimelineBlock  = BlockBase & { type: 'timeline'; data: { items: { date; title; content? }[] } };
type LinksBlock     = BlockBase & { type: 'links'; data: { links: { name; url; desc?; avatar? }[] } };
type PostsBlock     = BlockBase & { type: 'posts'; data: { category?: PostCategory; seriesId?: string; limit: number; sortBy: 'new'|'hot' } };
type VideosBlock    = BlockBase & { type: 'videos'; data: { series?: string; limit: number } };
type DividerBlock   = BlockBase & { type: 'divider'; data: { style: 'line'|'dots'|'space' } };
type CustomHtmlBlock= BlockBase & { type: 'customHtml'; data: { html: string } };  // ⚠️ 高风险, 默认关闭
type MarqueeBlock   = BlockBase & { type: 'marquee'; data: { text: string; speed: number } };
type MusicBlock     = BlockBase & { type: 'music'; data: { src: string; title?; autoplay: boolean } };

type Block = HeroBlock | TextBlock | GalleryBlock | StatsBlock | SkillsBlock 
           | TimelineBlock | LinksBlock | PostsBlock | VideosBlock 
           | DividerBlock | CustomHtmlBlock | MarqueeBlock | MusicBlock;
```

### 6.2 FTS5 全文搜索 🆕

```sql
-- Prisma migrate 后手执行 (或写在 migration.sql)
CREATE VIRTUAL TABLE post_search USING fts5(
  post_id UNINDEXED,
  title,
  excerpt,
  content,
  tokenize = 'unicode61'
);

CREATE VIRTUAL TABLE chapter_search USING fts5(
  chapter_id UNINDEXED,
  title,
  excerpt,
  content,
  tokenize = 'unicode61'
);

-- 上传 Post 时同步索引 (Server Action 内)
INSERT INTO post_search(post_id, title, excerpt, content) VALUES (?, ?, ?, ?);

-- 搜索
SELECT post_id FROM post_search WHERE post_search MATCH ? LIMIT 20;
```

---

## 7. 双模式设计 (v0.2 修订)

### 7.1 模式 1: 游客模式 (Public)
- **行为**: 只读浏览
- **可访问**: 全部公开页 (含 `/series/[slug]`)
- **体验**: 平滑滚动 + 进入动画 + 双主题切换 (右上角, 默认亮色)

### 7.2 模式 2: 站长模式 (Owner)

| 功能 | 路径 | 说明 | v0.2 强化 |
|---|---|---|---|
| 仪表盘 | `/admin/dashboard` | 文章数/视频数/总浏览/最近 7 日曲线 | |
| **MD 上传** | `/admin/upload` | 拖拽 .md → 选类型 (article/chapter) → 选系列 → 发布 | ✅ 类型/系列判断 |
| 文章管理 | `/admin/posts` | 列表/编辑/删除/置顶 | ✅ 关联系列编辑 |
| **章节管理** | `/admin/chapters` | 小说章节 CRUD | 🆕 |
| **系列管理** | `/admin/series` | 系列 CRUD, 拖拽排序章节 | 🆕 |
| 视频管理 | `/admin/videos` | B 站/百度/YouTube 链接粘贴自动解析 | ✅ B 方案真直接播 |
| **媒体库** | `/admin/media` | 图片上传/多尺寸/blurhash/搜索 | 🆕 |
| **Page Builder** | `/admin/pages/[key]/edit` | **可视化拖拽添加/删除/编辑 Block** | 🆕 核心升级 |
| 页面管理 | `/admin/pages` | 系统页/自定义页 CRUD | 🆕 |
| 站点设置 | `/admin/settings` | 站名/简介/友链/底部/默认主题 | |

### 7.3 鉴权实现
- Auth.js v5 + `CredentialsProvider` (账号密码)
- Middleware (`middleware.ts`) 拦截 `/admin/*`
- Session: JWT (无 Session 表)

> 📌 **老板决策点 Q2**: 是否加评论 (Giscus, GitHub Discussions 后端)?

---

## 8. 页面与路由速查 (v0.2 加粗 🆕)

| 路由 | 类型 | 渲染源 | 动画 |
|---|---|---|---|
| `/` | RSC | Page("home") + Block[] | Hero 入场淡入 + 错位 |
| `/about` | RSC | Page("about") + Block[] | 滚动渐显 |
| `/tech` | RSC | 列出 Post(category=TECH) | 列表项 stagger |
| `/life` | RSC | 列出 Post(category=LIFE) | 同上 |
| `/novels` | RSC | 列出 Series(category=NOVEL) | 大卡片 |
| `/videos` | RSC | VideoGrid | hover 缩放 |
| **`/series`** 🆕 | RSC | 列出所有 Series | |
| **`/series/[slug]`** 🆕 | RSC | Series 详情 + Posts/Chapters | |
| `/posts/[slug]` | RSC | Post 详情 + MDXRenderer | 滚动高亮 TOC |
| **`/chapters/[slug]`** 🆕 | RSC | Chapter 详情 (前后章导航) | |
| `/videos/[id]` | RSC + CSR | VideoEmbed | 嵌入区 |
| `/login` | Client | LoginForm | 背景粒子 |
| `/admin/*` | RSC + CSR | AdminShell | 路由切换 fade |
| **`/admin/pages/[key]/edit`** 🆕 | Client | Page Builder (3 栏) | Block 拖拽 |
| **`/admin/media`** 🆕 | RSC + CSR | MediaGrid + UploadDropzone | |

---

## 9. MD 上传与解析管线

### 9.1 用户故事
> 老板: 写完 `rust-async.md` → 拖到 Admin → 选"文章/技术/可选系列" → 点"发布" → 5 秒后公开站可见
> 老板: 写完 `meta-realm-ch1.md` → 拖到 Admin → 选"章节/选系列/章节号" → 发布

### 9.2 流程图 (v0.2 区分 type)

```
拖 .md → 解析 frontmatter → 判断 type
   │
   ├─ type=article → 入 Post 表 (必填 category, 可选 seriesId)
   │
   └─ type=chapter → 入 Chapter 表 (必填 seriesId, chapterNo)
       │
       ▼
   校验 slug 唯一性 → unified 编译 MD → 检测 video URL
       │
       ▼
   落库 + 落盘 content/ + 同步 FTS5 索引 → revalidatePath
```

### 9.3 Frontmatter 约定 (v0.2 完善)

```markdown
---
title: Rust 异步编程入门
slug: rust-async-intro       # 可选
type: article                # 🆕 article | chapter (必填, 缺省 article)
category: tech               # article 必填 (tech/life), chapter 忽略
series: rust-tutorial        # 🆕 可选, 系列 slug (文章/小说共用)
chapter: 1                   # 🆕 chapter 必填 (序号)
tags: [rust, async, tokio]
cover: /media/images/abc.jpg
pinned: false
excerpt: 一句话简介
date: 2026-06-24
---

# 正文从这里开始

视频示例: https://www.bilibili.com/video/BV1xx411c7mD
百度网盘: https://pan.baidu.com/s/1xxx?pwd=abcd
```

---

## 10. 视频嵌入方案 (v0.2 重点升级)

### 10.1 哔哩哔哩 — 标准 iframe

**输入**: 分享链接 / 短链 / BV 号 / 嵌入链接
**解析**: 正则提取 `BV[a-zA-Z0-9]+`
**嵌入**:
```tsx
<iframe
  src={`//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0`}
  className="aspect-video w-full"
  allowFullScreen
  sandbox="allow-scripts allow-same-origin allow-popups"
  referrerPolicy="no-referrer"
  scrolling="no"
  frameBorder="0"
/>
```

### 10.2 百度网盘 — **主推方案 B 真直接播** 🆴 v0.2 重大变更

**核心问题**: 百度官方**不提供 embed API**, 分享链接无法直接 iframe 播放。

#### 方案 B: 第三方解析服务 (默认启用, 黑推荐 ✅)

**原理**: 走第三方解析服务, 把百度分享链接"翻译"成直链 (m3u8/MP4), iframe 嵌第三方播放器。

**黑调研的服务候选** (按稳定性 + 合规性排):

| 服务 | 域名示例 | 稳定性 | 合规风险 | 速度 |
|---|---|---|---|---|
| A. 自建 Cloudflare Worker | pan-proxy.xxx.workers.dev | ⭐⭐⭐⭐⭐ 自己控 | 极低 | 快 |
| B. pan-yz | pan-yz.workers.dev | ⭐⭐⭐ | 中 (逆向百度) | 快 |
| C. 油猴脚本服务端 | 油猴作者提供 | ⭐⭐ 不稳定 | 中 | 中 |
| D. 百度官方 embed | 如果开放 | ⭐⭐⭐⭐⭐ | 0 | 慢 |

**黑推荐: 自建 Cloudflare Worker** (方案 A):
- 写一个轻量 Worker, 解析 `?url=pan.baidu.com/s/xxx&pwd=abcd`
- 走 PC 端 UA 模拟登录, 提取真实视频流地址
- 返回 m3u8, 站内用 `hls.js` 播放
- 站长独立部署, 不依赖第三方
- **风险**: 百度反爬升级 → Worker 失效 → 切方案 C 降级

**实施组件**:
```tsx
// components/video/BaiduEmbed.tsx
<iframe
  src={`https://pan-proxy.xxx.workers.dev/?url=${surl}&pwd=${pwd}&autoplay=0`}
  className="aspect-video w-full"
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
  referrerPolicy="no-referrer"
  allowFullScreen
  frameBorder="0"
/>
```

**⚠️ 合规风险 (老板必读)**:
- 百度 ToS 禁止"绕过客户端分享限制"
- 第三方解析服务存在法律灰色地带
- 自建 Worker 仅服务个人站, 不外发, 风险可控
- 老板自己承担合规责任

#### 方案 C: 中间页 + 提取码 (降级方案, 一键切换)

**触发条件**: 自建 Worker 失效 / 老板不愿承担合规风险
**实现**: 视频卡片显示"提取码" + 大按钮"前往百度网盘", 新窗口打开官方播放页
**优点**: 0 合规风险
**缺点**: 用户体验降级 (跳转)

#### 方案选择机制

```ts
// lib/video/baidu.ts
export type BaiduMode = 'B-direct' | 'C-fallback';

export function renderBaidu(video: Video) {
  const mode = process.env.BAIDU_MODE ?? 'B-direct';
  if (mode === 'B-direct') return <BaiduDirectEmbed ... />;
  return <BaiduFallbackEmbed ... />;  // 显示提取码 + 跳转按钮
}
```

**`.env`**:
```
BAIDU_MODE=B-direct          # 默认方案 B
BAIDU_WORKER_URL=https://...
```

> 📌 **老板决策点 Q3**: 是否接受方案 B 的合规风险?
> - ✅ 接受 → 自建 Worker, 默认 B
> - ❌ 不接受 → 直接走 C 方案 (体验降级, 0 风险)

> 📌 **老板决策点 Q7**: 百度解析 Worker 部署在哪?
> - Cloudflare Worker (免费额度 10 万请求/天, 个人站足够)
> - 自建 VPS 反向代理
> - Replit / Deno Deploy (类似)

### 10.3 YouTube / 本地视频 (标准)

```tsx
<iframe src={`https://www.youtube-nocookie.com/embed/${id}`} ... />  // YouTube
<video src="/videos/intro.mp4" controls />                            // 本地
```

### 10.4 视频管理后台
- 粘贴 B 站/百度/YouTube 链接 → 实时解析 → 显示预览卡片 → 填标题/系列/标签 → 保存
- 列表: 按系列分组, 拖拽排序
- 数据: 标题/封面/平台/源 ID/提取码 (百度)

---

## 11. 动画策略 (v0.2 强化)

### 11.1 动画分级 (新增 L6 Block 动画)
| 级别 | 触发 | 效果 | 实现 |
|---|---|---|---|
| L0 全局 | 加载完成 | Lenis 平滑滚动 | SmoothScroll |
| L1 路由 | 页面切换 | 上滑 + 淡入 (200ms) | AnimatePresence |
| L2 列表 | 滚入视口 | 错位 stagger 渐显 | Framer + useInView |
| L3 元素 | hover | 缩放/位移/阴影 | Tailwind + Framer |
| L4 微动 | 静止 | 背景光斑飘动/数字计数 | Framer |
| **L6 Block** 🆕 | Page Builder | 拖拽 ghost + 入场弹簧 | dnd-kit + Framer |
| **L7 Block** 🆕 | 入场动画 | 滚动到 Block 时错位渐显 | Framer + useInView |

### 11.2 Block 入场动画 (默认开启, 站长可关)
- 整个 Block 容器 `whileInView`
- 子元素 stagger 50ms
- 缓动 `cubic-bezier(0.22, 1, 0.36, 1)`

---

## 12. 性能优化

### 12.1 指标目标 (Lighthouse 移动端)
| 指标 | 目标 |
|---|---|
| **LCP** | < 1.5s |
| **INP** | < 100ms |
| **CLS** | < 0.05 |
| **TTFB** | < 200ms |
| **Bundle (gzip)** | < 100KB (公开页) |
| **Lighthouse 总分** | ≥ 95 |

### 12.2 关键策略
1. RSC + 流式 SSR (公开页 90% 服务端)
2. **Page.layout 静态化**: 系统页首次构建生成, 改后 revalidate
3. `next/image` + `next/font` (自托管)
4. SSG + ISR (文章详情 `generateStaticParams` 预渲染)
5. **FTS5 搜索零运行时** (编译期建索引)
6. Shiki 编译期高亮
7. 路由级代码分割
8. Tailwind purge (< 10KB CSS)
9. **媒体 lazy + blurhash 占位** 🆕

---

## 13. 部署方案 (不变)

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

---

## 14. 安全考虑 (v0.2 加沙箱)

| 风险 | 缓解 |
|---|---|
| 站长密码泄漏 | bcrypt (cost=12) + 失败次数限流 |
| 越权访问 `/admin` | Middleware + RSC 二次校验 |
| MD 上传 XSS | unified + rehype-sanitize 白名单 + CSP |
| **视频 iframe framejacking** 🆕 | `sandbox="allow-scripts allow-same-origin allow-popups"` + `referrerpolicy="no-referrer"` |
| 文件上传炸弹 | `Content-Length` 限制 5MB + `.md` 白名单 |
| **自定义 HTML Block** 🆕 | 默认 `disabled`, 开启后 + CSP + DOMPurify 二次清洗 |
| CSRF | Auth.js 内置 + Server Action `Origin` 校验 |
| 媒体上传类型 | mime 白名单 + sharp 重处理 |

---

## 15. 开发路线图 (v0.2 加 Page Builder + 媒体库 + Series)

### Phase 0 — 准备 ✅
- [x] 项目立项 + GitHub 仓库
- [x] 方案文档 v0.1
- [x] 老板反馈 → v0.2 重写
- [ ] 老板拍板 Q1-Q9

### Phase 1 — 骨架 (3-5 天)
- [ ] Next.js 14 + TS + Tailwind + Prisma + SQLite 初始化
- [ ] **schema.prisma v0.2 全量** (Post + Chapter + Series + Page + Media)
- [ ] seed.ts (示例数据: 1 Series + 1 Post + 1 Chapter + 1 Video)
- [ ] Auth.js v5 + 登录页 + Middleware
- [ ] 基础布局 + 双主题 (默认亮色) + Lenis
- [ ] **Page + Block 基础架构** (registry + 13 种 renderer 雏形)
- [ ] 首页 (Page("home") + Block[Hero, Posts])
- **交付**: 能登录, 黑白首页, Block 渲染框架

### Phase 2 — 内容展示 (3-5 天)
- [ ] 5 大专栏列表页
- [ ] Post + Chapter 详情页 + Shiki
- [ ] 视频列表 + B 站 + 百度 (B 方案) + YouTube
- [ ] **Series 列表 + 详情页** 🆕
- [ ] **FTS5 搜索** 🆕
- [ ] SEO: sitemap / robots / OG
- **交付**: 公开站可看, 可搜索

### Phase 3 — Admin 后台 (7-10 天, v0.2 加量)
- [ ] Admin 布局 + 侧边栏
- [ ] **MD 上传 (区分 article/chapter + 系列选择)** 🆕
- [ ] 文章 / 章节 / 系列 CRUD
- [ ] 视频管理 (B 站/百度 B 方案/YouTube)
- [ ] **媒体库 (上传/多尺寸/blurhash/搜索)** 🆕
- [ ] **Page Builder (3 栏: Block 库 + 预览 + 配置表单)** 🆕 核心
- [ ] 站点设置
- **交付**: 老板独立运营, 可视化搭页面

### Phase 4 — 打磨 (3-5 天)
- [ ] 动画细节
- [ ] 移动端适配
- [ ] 性能 (Lighthouse ≥ 95)
- [ ] 部署脚本 (含 Worker 部署)
- [ ] README + 运营文档
- **交付**: 可上线

**总计**: 16-25 天 (Phase 3 加量)

---

## 16. 待老板拍板 (Q1-Q9, v0.2 增 3 项)

> ⚠️ **不拍板不写代码**

| # | 决策项 | 黑推荐 | 备选 | 状态 |
|---|---|---|---|---|
| **Q1** | 项目名 | `obsidian-journal` | mono-press / inkwell / handfoot-blog / sk-journal | 🟡 |
| **Q2** | 评论区 | 不做 (纯静态) | Giscus | 🟡 |
| **Q3** | **百度网盘方案** | **B: 第三方解析真直接播** (自建 Worker) | C: 中间页+提取码 (合规) | 🟡 v0.2 升级 |
| **Q4** | 部署平台 | 自托管 VPS | Vercel | 🟡 |
| **Q5** | **默认主题** | **亮色** (现代博客风) + 暗色切换 | 默认暗色 | 🟡 v0.2 改 |
| **Q6** | 评论 LLM 自动回复 | 不做 (v2 再议) | 做 | 🟡 |
| **Q7** 🆕 | **百度 Worker 部署** | **Cloudflare Worker** (免费, 自己控) | 自建 VPS 反代 / Replit | 🟡 |
| **Q8** 🆕 | **媒体库域名** | **同站 /media/** (简单) | 独立子域 `cdn.xxx.com` | 🟡 |
| **Q9** 🆕 | **Page Builder 模式** | **自由搭建** (Block 库全开放) | 模板驱动 (选预设再改) | 🟡 |

### 黑补充 (可缓)
| # | 建议项 | 黑推荐 |
|---|---|---|
| Q10 | 友链页面 | 加 (Blocks.Links 一键) |
| Q11 | RSS / Atom Feed | 加 |
| Q12 | 数据备份 cron | 加 |

---

## 17. 风险与开放问题 (v0.2 更新)

| 风险 | 影响 | 黑预案 |
|---|---|---|
| **百度 Worker 反爬升级** | B 方案失效 | 一键切 C 方案, `.env` 控制 |
| **百度合规风险** | 理论上违反百度 ToS | 个人站风险可控, 老板自决 |
| B 站 iframe 限速 | 国内卡 | 提示"前往 B 站观看"按钮 |
| SQLite 写入并发 | 高频编辑崩 | 个人站几乎不会, 真出事切 Postgres |
| **自定义 HTML Block XSS** 🆕 | 高风险 | 默认 disabled, 开启需二次确认 + CSP |
| **媒体库磁盘占用** 🆕 | 大量图片占空间 | sharp 压缩 + 自动清理 + 备份 |
| **FTS5 中文分词** 🆕 | 中文搜索效果差 | `unicode61` 基础支持, 可加 `tokenize='trigram'` |

---

## 18. 后续 v2 (不变)
- [ ] AI 摘要 (复用 minimax API)
- [ ] i18n
- [ ] 评论 LLM 自动回复
- [ ] Newsletter
- [ ] PWA
- [ ] Web3 打赏
- [ ] 公众号 / Twitter 同步

---

## 19. 媒体库模块 (v0.2 新增, 独立章节)

### 19.1 功能
- 拖拽上传图片 / 视频 / PDF
- 自动生成多尺寸: `320 / 640 / 1280 / original` (WebP)
- 自动生成 blurhash (8x4 像素摘要) → 占位
- 标签/搜索/筛选
- 媒体引用追踪 (哪些 Post/Page 用了这张图)

### 19.2 上传流程

```
拖文件 → Server Action: uploadMedia()
   │
   ├─ mime 白名单 (image/jpeg, png, webp, gif, svg, mp4, pdf)
   ├─ 限大小 (图 10MB, 视频 200MB, PDF 20MB)
   │
   ├─ sharp 处理图片:
   │   ├─ 读 metadata (width, height)
   │   ├─ 生成 320/640/1280 WebP (保留原图)
   │   ├─ 计算 blurhash
   │   └─ 输出到 media/images/{320,640,1280,originals}/
   │
   ├─ 视频: ffmpeg 截首帧作为封面 (Phase 4 加)
   │
   └─ 写 Media 表 (返回 URL)
```

### 19.3 MD 引用替换 (上传时)

```
MD 里写: ![cover](./cover.jpg)
   │
   ├─ Admin 上传时检测本地引用
   ├─ 自动上传到 media/, 返回新 URL
   └─ 替换 MD 文本为: ![cover](https://.../media/images/640/abc.webp)
```

### 19.4 媒体库 UI
- 网格视图 (缩略图)
- 列表视图 (文件名/大小/类型/上传时间)
- 上传 Dropzone (拖拽 + 进度条)
- 选中复制 URL / Markdown 引用 / HTML 标签
- 删除 (检测引用, 警告)

---

## 20. 系列/合集 (v0.2 新增)

### 20.1 概念
- **文章系列**: tech 文章按"教程/主题"分组, 如 "Rust 入门" 5 篇
- **小说卷**: novel chapters 按"卷/书"分组, 如 "元界 第一卷" 12 章

### 20.2 路由
- `/series` — 所有系列列表 (按分类 Tab 切)
- `/series/[slug]` — 系列详情:
  - 顶部: 封面 + 名称 + 简介 + 文章数
  - 列表: Posts/Chapters 按 chapterNo / publishedAt 排
  - 文章模式: 横向卡片 (标题/摘要/日期)
  - 章节模式: 竖向列表 (序号/标题/字数/日期)

### 20.3 后台管理
- `/admin/series` — CRUD
- `/admin/series/[slug]/edit` — 编辑 + 拖拽排序章节

---

## 21. Page Builder 详解 (v0.2 核心升级)

### 21.1 UI 三栏

```
┌──────────────────────────────────────────────────────────────┐
│ ← 返回  页面: /about          [预览] [保存草稿] [发布]         │
├──────────┬──────────────────────────────┬────────────────────┤
│ Block 库 │        实时预览 (1200px)     │  Block 配置         │
│ (180px)  │  ┌────────────────────────┐  │  (320px)           │
│          │  │                       │  │  ┌──────────────┐  │
│ ▢ Hero   │  │  [Hero Block]          │  │  │ 选中: Hero   │  │
│ ▢ Text   │  │  ─────────────────    │  │  │              │  │
│ ▢ Gallery│  │  [Stats Block]         │  │  │ Title:       │  │
│ ▢ Stats  │  │  ─────────────────    │  │  │ [______]     │  │
│ ▢ Skills │  │  [Skills Block]        │  │  │              │  │
│ ▢ Timeline  │  ─────────────────    │  │  │ Subtitle:    │  │
│ ▢ Links  │  │                       │  │  │ [______]     │  │
│ ▢ Posts  │  │                       │  │  │              │  │
│ ▢ Videos │  │                       │  │  │ BG Image:    │  │
│ ▢ Divider│  │                       │  │  │ [选择媒体]   │  │
│ ▢ HTML ⚠ │  │                       │  │  │              │  │
│ ▢ Marquee│  │                       │  │  │ 可见: ☑      │  │
│ ▢ Music  │  │                       │  │  │ 顺序: 1      │  │
│          │  │                       │  │  │              │  │
│          │  │                       │  │  │ [删除 Block] │  │
│          │  │                       │  │  └──────────────┘  │
└──────────┴──────────────────────────────┴────────────────────┘
```

### 21.2 交互
1. **添加**: 点击 Block 库 OR 拖拽到预览区
2. **选中**: 点击预览区中的 Block → 右侧显示配置表单
3. **配置**: 表单改 → 防抖 500ms 自动保存草稿 → 预览实时更新
4. **排序**: 拖拽预览区 Block 上下移动 → order 自动重排
5. **删除**: 配置表单底部"删除"按钮 + 二次确认
6. **可见性**: 配置表单"可见"复选框 → `visible: false` 时前端隐藏

### 21.3 数据流

```
用户操作 → 客户端 zustand state → 防抖 → Server Action: savePageLayout()
   │
   ├─ zod 校验每个 Block
   ├─ 写 Page.layout (JSON 字符串)
   ├─ revalidatePath('/about')  // 公开页失效
   └─ 触发 Lenis + 公开页刷新
```

### 21.4 系统页 vs 自定义页
- **系统页** (home/about/tech/life/novels/videos): 站长可改 Block 但不能改 key
- **自定义页** (站长新建): `/custom/[slug]`, key = `custom-${slug}`

### 21.5 模板机制 (Q9 决策)

| 模式 | 黑推荐 | 说明 |
|---|---|---|
| **自由搭建** ⭐ | ✅ | Block 库全开放, 站长拖拽 |
| **模板驱动** | 备选 | 提供 5-10 套预设模板 (极简风/杂志风/作品集风), 选模板后改 Block |

> 📌 **老板决策点 Q9**: 自由搭建 or 模板驱动?

---

## 22. 待老板拍板优先级 (黑视角)

| 优先级 | 决策 | 影响 |
|---|---|---|
| 🔴 P0 | Q1 (项目名) | 仓库名/品牌/SEO |
| 🔴 P0 | Q3 (百度方案 B) | 视频功能能否真"直接播放" |
| 🟡 P1 | Q5 (默认主题) | 第一印象 |
| 🟡 P1 | Q4 (部署平台) | 数据库选型 (SQLite vs Postgres) |
| 🟡 P1 | Q9 (Page Builder 模式) | 后台 UI 复杂度 |
| 🟢 P2 | Q7 (Worker 部署) | 视频功能落地细节 |
| 🟢 P2 | Q8 (媒体域名) | 是否需要额外 DNS 配置 |
| 🟢 P2 | Q2 (评论) | 可后续加 |
| 🟢 P2 | Q6 (LLM 回复) | v2 再说 |

> 老板按 P0 → P1 → P2 顺序审, 黑按序解 Phase 1。

---

> 📌 **审核路径建议**:
> 1. §0 TL;DR (30 秒)
> 2. §6 数据模型 (看严谨性)
> 3. §10 视频 (B 方案合规风险)
> 4. §16 9 决策 (按 P0→P2)
> 5. §21 Page Builder (核心升级)
>
> 老板审完拍板, 黑立刻动 Phase 1。
