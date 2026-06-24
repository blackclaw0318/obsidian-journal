# Obsidian Journal — 个人博客平台设计文档

> 状态: **v0.1 · 方案稿 (待老板审核)**
> 作者: 黑 (Hei)
> 创建: 2026-06-24
> 仓库: `blackclaw0318/obsidian-journal` (本仓库)

---

## 0. TL;DR (30 秒读完)

- **做什么**: 一个**单作者个人博客**, 支持 Markdown 上传自动发布、视频专栏、5 大内容分类。
- **技术栈**: **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + SQLite + Auth.js v5 + Framer Motion + Lenis**。
- **核心亮点**:
  1. 极简黑白 + 大量微动态 (Lenis 平滑滚动 + Framer Motion 进入/退出动画)
  2. **双模式**: 游客只读 / 站长登录后可上传 MD 改全站
  3. **MD 一键发布**: 上传 `.md` → 自动解析 frontmatter → 自动入专栏 → 自动渲染代码高亮
  4. **视频专栏**: B 站 BV 号 / 百度网盘分享链接 → 解析成可内嵌播放器
- **项目名候选**: 见 §1
- **审核重点**: 见 §16 "待老板拍板"

---

## 1. 项目命名建议

> 当前默认: **`obsidian-journal`** (黑曜石日志), 体现"黑 + 极简 + 个人写作"

| 候选 | 含义 | 风格 | 黑推荐 |
|---|---|---|---|
| `obsidian-journal` | 黑曜石日志 | 沉稳、文学、私人 | ⭐ **默认** |
| `mono-press` | 单色出版 | 极简、内容为王 | 备选 1 |
| `inkwell` | 墨水瓶 | 写作感、东方韵味 | 备选 2 |
| `handfoot-blog` | 商业帝国系 | 品牌一致 | 备选 3 |
| `sk-journal` | 老板缩写 | 最简洁 | 备选 4 |

> 📌 **老板决策点 P1**: 选哪个? 不拍就先用 `obsidian-journal`。

---

## 2. 设计哲学

### 2.1 视觉关键词
- **简洁 (Minimal)**: 大量留白, 单一焦点, 没有多余装饰
- **现代 (Modern)**: 几何网格, 强对比, 非对称布局
- **青春 (Youthful)**: 微动效, 弹性缓动, 不刻板
- **高级 (Premium)**: 排版考究, 字体克制, 细节到位

### 2.2 配色规范 (黑白配)
```
主色 (Primary)
  纯黑:  #000000
  纯白:  #FFFFFF

灰阶 (Neutral, Tailwind zinc)
  zinc-50:   #FAFAFA   背景
  zinc-100:  #F4F4F5   卡片
  zinc-200:  #E4E4E7   分割线
  zinc-400:  #A1A1AA   次要文字
  zinc-600:  #52525B   正文
  zinc-900:  #18181B   标题
  zinc-950:  #09090B   深背景 (夜间)

强调 (Accent) — 仅 1 个, 灰白渐变光斑
  bg-gradient-to-br from-zinc-100 to-white (亮色模式)
  bg-gradient-to-br from-zinc-800 to-zinc-950 (暗色模式)
```

**只支持亮/暗两模式, 暗色为默认** (与"黑曜石"主题契合)。

### 2.3 字体方案
| 用途 | 字体 | 备选 |
|---|---|---|
| 中文标题 | **思源黑体 SC** (Source Han Sans) | 苹方, 阿里巴巴普惠体 |
| 中文正文 | **思源黑体 SC Light** | 苹方-细 |
| 英文标题 | **Geist Sans** | Inter, Helvetica Neue |
| 英文正文 | **Geist Sans** | Inter |
| 代码 | **JetBrains Mono** | Fira Code, Geist Mono |
| 手写装饰 (可选) | **LXGW WenKai** (霞鹜文楷) | 演示/Logo 装饰 |

> 📌 全部走 `next/font` 自托管 + `font-display: swap`, **无第三方 CDN 请求**, 提升 LCP。

### 2.4 排版尺度
- **基线网格**: 8px
- **行高**: 正文 1.7, 标题 1.2
- **最大行宽**: 720px (正文阅读) / 1280px (列表)
- **段落间距**: 1.5em

---

## 3. 技术栈选型

### 3.1 一图速览

```
┌─────────────────────────────────────────────────────────┐
│  Frontend                                                │
│  Next.js 14 (App Router) · TypeScript 5.x · React 18    │
│  Tailwind CSS 3.4 + shadcn/ui · Framer Motion 11         │
│  Lenis (smooth scroll) · next-themes (dark mode)        │
├─────────────────────────────────────────────────────────┤
│  Backend (全在 Next.js 内, 无独立后端)                    │
│  Server Actions · Route Handlers · Middleware (auth)     │
│  Prisma 5 ORM · SQLite (dev/prod 兼容)                   │
│  Auth.js v5 (NextAuth) · bcrypt                          │
│  gray-matter + unified (MD 解析) · Shiki (代码高亮)      │
├─────────────────────────────────────────────────────────┤
│  DevOps                                                  │
│  pnpm · ESLint · Prettier · Vitest (单测) · Playwright   │
│  Vercel (首选) · 自托管 (PM2 + Nginx) 二选一             │
└─────────────────────────────────────────────────────────┘
```

### 3.2 选型理由 (黑视角)

| 选型 | 替代方案 | 选定理由 |
|---|---|---|
| **Next.js 14 (App Router)** | Astro / Nuxt / SvelteKit | **前后端一体**, Server Actions 天然适配 MD 上传; 生态最成熟; RSC 让公开页接近静态; Vercel 一键部署 |
| **TypeScript** | JavaScript | 不解释, 任何严肃项目必备 |
| **Tailwind + shadcn/ui** | styled-components / MUI | 黑白极简风用 Tailwind 最快, shadcn 给无样式可改组件 (与极简风契合) |
| **Prisma + SQLite** | MongoDB / Postgres | 个人博客数据量小, SQLite 单文件零运维; Prisma 类型安全, 后续换 PG 一行配置 |
| **Auth.js v5** | Lucia / 自建 JWT | Next.js 生态首选, 支持 Credentials Provider 单用户模式 |
| **Framer Motion + Lenis** | GSAP / Anime.js | FM 配合 React 最顺; Lenis 是当下 Web 滚动丝滑感天花板 |
| **gray-matter + unified** | marked / markdown-it | unified 是 remark/rehype 生态, 插件链最强 (GFM/数学公式/代码高亮) |
| **Shiki** | Prism / highlight.js | **构建期渲染** (VSCode 同款), 零运行时 JS, 完美支持黑白主题 |

### 3.3 明确的"不选"
- ❌ **Notion API 同步**: 不必要的中间层, 直接 MD 文件
- ❌ **Headless CMS (Strapi/Contentful)**: 单人博客杀鸡用牛刀
- ❌ **MongoDB**: 关系数据, 上 SQL
- ❌ **Tailwind UI (付费)**: 黑白极简风 shadcn + 自写完全够
- ❌ **视频自托管**: 永远不碰, B站/百度解决

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
        │ │  - /                              │   │
        │ │  - /about /tech /life /novels     │   │
        │ │  - /posts/[slug]                  │   │
        │ └────────────────────────────────────┘   │
        │ ┌────────────────────────────────────┐   │
        │ │  Route Handlers (REST API)         │   │
        │ │  - /api/posts /api/videos         │   │
        │ └────────────────────────────────────┘   │
        │ ┌────────────────────────────────────┐   │
        │ │  Middleware (auth)                 │   │
        │ │  - /admin/* 强制鉴权              │   │
        │ └────────────────────────────────────┘   │
        └──────────┬──────────────────┬────────────┘
                   │                  │
          2.Prisma │                  │ 3. 文件系统
                   ▼                  ▼
            ┌────────────┐     ┌────────────────┐
            │  SQLite    │     │  content/      │
            │  (单文件)  │     │  *.md 原件     │
            └────────────┘     │  + assets/     │
                                └────────────────┘

                        ┌──────────────────────┐
                        │  站长 (Owner, 登录)   │
                        └──────────┬───────────┘
                                   │ 4. POST /admin/upload (Server Action)
                                   │    FormData: file=*.md, category=...
                                   ▼
        ┌──────────────────────────────────────────┐
        │  Server Action: parseAndPublish()        │
        │  1. gray-matter 解析 frontmatter         │
        │  2. 检测 video URL (B站/百度)            │
        │  3. unified 编译 MD → HTML + Shiki      │
        │  4. 写 SQLite (Post 表)                 │
        │  5. 备份原 .md 到 content/                │
        │  6. revalidatePath() 让公开页即刻生效    │
        └──────────────────────────────────────────┘
```

### 4.1 关键设计原则
1. **公开页全走 RSC + DB 读**, 不在请求时编译 MD → 极快
2. **编译发生在上传瞬间**, 渲染结果 (HTML 字符串) 存进 DB 的 `htmlCache` 字段
3. **原 MD 同时落盘到 `content/`**, 方便站长本地 git 管理 + 灾备
4. **Admin 操作全部 Server Action**, 不用单独写 API 路由
5. **Middleware 鉴权**: `/admin/*` 全部拦截, 未登录跳 `/login`

---

## 5. 目录结构

```
obsidian-journal/
├── docs/                       # 设计/方案文档 (本目录)
│   ├── DESIGN.md              # 总设计 (本文)
│   ├── ARCHITECTURE.md        # 详细架构
│   ├── ROADMAP.md             # 阶段路线图
│   └── DECISIONS.md           # 老板拍板记录
├── app/                        # Next.js App Router
│   ├── (public)/              # 公开页 (游客可见)
│   │   ├── layout.tsx         #   全站 layout (Lenis + 主题 + Navbar)
│   │   ├── page.tsx           #   首页 (Hero + 最新文章)
│   │   ├── about/             #   基础简介
│   │   ├── tech/              #   技术专栏
│   │   │   ├── page.tsx       #     列表
│   │   │   └── [slug]/        #     详情
│   │   ├── life/              #   生活专栏 (同上结构)
│   │   ├── novels/            #   小说专栏 (同上结构)
│   │   ├── videos/            #   视频专栏
│   │   │   ├── page.tsx       #     网格列表
│   │   │   └── [id]/          #     详情 + 嵌入播放
│   │   └── posts/[slug]/      #   通用文章详情 (按 category 重定向)
│   ├── (admin)/               # 管理后台 (需登录)
│   │   ├── layout.tsx         #   Admin layout (侧边栏)
│   │   ├── dashboard/         #   仪表盘 (统计)
│   │   ├── posts/             #   文章管理 (CRUD)
│   │   ├── upload/            #   MD 上传页
│   │   ├── pages/             #   页面自定义
│   │   ├── videos/            #   视频管理
│   │   └── settings/          #   站点设置
│   ├── (auth)/
│   │   └── login/             #   登录页
│   ├── api/                   # 少量 Route Handlers
│   │   ├── auth/[...nextauth]/
│   │   └── revalidate/        #   手动失效缓存
│   ├── globals.css            #   Tailwind base + Shiki 主题
│   └── layout.tsx             #   Root layout
├── components/                 # 复用组件
│   ├── ui/                    #   shadcn/ui 基础
│   ├── motion/                #   Framer Motion 动画组件
│   │   ├── FadeIn.tsx
│   │   ├── Stagger.tsx
│   │   ├── PageTransition.tsx
│   │   └── SmoothScroll.tsx   #   Lenis 包装
│   ├── blog/                  #   博客业务组件
│   │   ├── PostCard.tsx
│   │   ├── PostList.tsx
│   │   ├── MDXRenderer.tsx    #   渲染解析后的 HTML
│   │   └── CodeBlock.tsx      #   Shiki 输出
│   ├── video/                 #   视频组件
│   │   ├── BilibiliEmbed.tsx  #   B 站嵌入
│   │   ├── BaiduPanEmbed.tsx  #   百度网盘嵌入
│   │   └── VideoCard.tsx
│   └── nav/                   #   导航
│       ├── Navbar.tsx
│       └── AdminSidebar.tsx
├── lib/                        # 工具与业务逻辑
│   ├── db.ts                  #   Prisma client 单例
│   ├── auth.ts                #   Auth.js 配置
│   ├── md/                    #   MD 解析管线
│   │   ├── parse.ts           #     gray-matter 入口
│   │   ├── compile.ts         #     unified + Shiki
│   │   └── videoDetector.ts   #     B 站/百度 URL 解析
│   ├── video/                 #   视频解析
│   │   ├── bilibili.ts        #     BV 号解析
│   │   └── baidu.ts           #     百度分享链接解析
│   └── utils.ts
├── prisma/
│   ├── schema.prisma          #   数据模型
│   └── seed.ts                #   种子数据
├── content/                    # MD 原件落盘 (gitignored 体积部分)
│   ├── tech/
│   ├── life/
│   ├── novels/
│   └── videos/
├── public/                     # 静态资源
│   ├── fonts/                 #   自托管字体 (可选, next/font 自动托管)
│   ├── og/                    #   OG 分享卡
│   └── favicon.ico
├── styles/
│   └── shiki-theme.json       #   自定义 Shiki 主题
├── tests/
│   ├── unit/                  #   Vitest
│   └── e2e/                   #   Playwright
├── .env.example               #   环境变量样例
├── .gitignore
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 6. 数据模型 (Prisma Schema 草稿)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./prisma/dev.db
}

// ============ 用户 (单站长) ============
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String                  // bcrypt
  displayName  String
  avatar       String?
  bio          String?
  createdAt    DateTime @default(now())
  sessions     Session[]
}

// ============ 站点配置 (单行) ============
model SiteConfig {
  id            Int      @id @default(1)
  siteName      String   @default("Obsidian Journal")
  tagline       String?
  authorName    String?
  authorAvatar  String?
  socials       String?  // JSON: { github, twitter, email, ... }
  aboutHtml     String?  // 关于页 MD 编译结果
  footerNote    String?
  updatedAt     DateTime @updatedAt
}

// ============ 文章 ============
model Post {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  excerpt     String?  // 摘要
  category    String   // "tech" | "life" | "novel"
  tags        String?  // JSON array
  coverUrl    String?
  sourcePath  String?  // 原 .md 在 content/ 下的相对路径
  contentMd   String   // 原 MD (备份)
  htmlCache   String   // 编译后 HTML (展示用)
  published   Boolean  @default(true)
  pinned      Boolean  @default(false)
  publishedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt
  views       Int      @default(0)
  likes       Int      @default(0)
  
  @@index([category, publishedAt])
}

// ============ 视频 (独立于 Post) ============
model Video {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  description String?
  coverUrl    String?
  platform    String   // "bilibili" | "baidu" | "youtube" | "native"
  sourceId    String   // BV 号 / 百度 surl / youtube id / 本地路径
  password    String?  // 百度网盘提取码
  duration    Int?     // 秒
  series      String?  // 系列名 (如 "Web3 教程")
  tags        String?
  publishedAt DateTime @default(now())
  views       Int      @default(0)
}

// ============ 页面装饰 (自定义页面内容) ============
model PageSection {
  id        String   @id @default(cuid())
  pageKey   String   // "home" | "about" | "tech" | ...
  sectionKey String  // "hero" | "intro" | "showcase"
  order     Int
  type      String   // "text" | "gallery" | "links" | "code"
  data      String   // JSON
  visible   Boolean  @default(true)
  updatedAt DateTime @updatedAt
  
  @@unique([pageKey, sectionKey])
}

// ============ 统计 (日报) ============
model DailyStat {
  date       DateTime @id
  postViews  Int      @default(0)
  videoViews Int      @default(0)
  newPosts   Int      @default(0)
}

// ============ Auth.js 必需 ============
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 7. 双模式设计

### 7.1 模式 1: 游客模式 (Public)
- **行为**: 只读浏览
- **可访问**: `/`, `/about`, `/tech`, `/life`, `/novels`, `/videos`, `/posts/[slug]`, `/videos/[id]`
- **不可见**: Admin 入口, 编辑按钮
- **体验**: 平滑滚动 + 进入动画 + 主题切换 (右上角)

### 7.2 模式 2: 站长模式 (Owner)
- **触发**: `/login` 输入账密 → 写 httpOnly cookie (Auth.js session)
- **能力**:
  | 功能 | 路径 | 说明 |
  |---|---|---|
  | 仪表盘 | `/admin/dashboard` | 文章数/视频数/总浏览/最近 7 日曲线 |
  | MD 上传 | `/admin/upload` | 拖拽 .md → 选专栏 → 一键发布 |
  | 文章管理 | `/admin/posts` | 列表/编辑/删除/置顶/草稿 |
  | 视频管理 | `/admin/videos` | 粘贴 B 站/百度链接 → 自动解析 |
  | 页面装饰 | `/admin/pages` | 拖拽式: Home/About/Tech 等页面的 Section 顺序与内容 |
  | 站点设置 | `/admin/settings` | 站名/简介/友链/底部 |

### 7.3 鉴权实现
- **Auth.js v5** + `CredentialsProvider` (账号密码)
- **Middleware** (`middleware.ts`) 拦截 `/admin/*`:
  ```ts
  export { auth as middleware } from "@/lib/auth"
  export const config = { matcher: ["/admin/:path*"] }
  ```
- **Session 存储**: 走 JWT (Auth.js 默认), 无需 Session 表 (上表只是 Prisma 标准样例, 实际用 JWT)
- **密码**: bcrypt 哈希, `.env` 初始化时写入

> 📌 **老板决策点 P2**: 是否要支持"评论"功能? 个人博客通常无评论, 但加一个 Giscus (GitHub Discussions 后端) 是 0 成本。要不要?

---

## 8. 页面与路由速查

| 路由 | 类型 | 核心组件 | 动画 |
|---|---|---|---|
| `/` | RSC | Hero / FeaturedPosts / LatestVideos | 入场淡入 + 上滑, 数字计数 |
| `/about` | RSC | Avatar / Bio / Skills / Timeline | 滚动渐显 |
| `/tech` | RSC + CSR | PostList (category=tech) | 列表项 stagger 错位 |
| `/life` | RSC + CSR | PostList (category=life) | 同上 |
| `/novels` | RSC + CSR | PostList (category=novel) | 同上, 卡片更大 |
| `/videos` | RSC | VideoGrid | 卡片 hover 缩放 + 阴影 |
| `/posts/[slug]` | RSC | MDXRenderer / TOC | 滚动高亮 TOC |
| `/videos/[id]` | RSC + CSR | VideoEmbed / Info | 嵌入区 + 评论区 (可选) |
| `/login` | Client | LoginForm | 背景粒子 |
| `/admin/*` | RSC + CSR | AdminSidebar / Tables | 路由切换 fade |

---

## 9. MD 上传与解析管线 (核心功能详解)

### 9.1 用户故事
> 老板: 写完一篇 `rust-async.md` → 拖到 Admin → 选"技术"专栏 → 点"发布" → 5 秒后公开站可见

### 9.2 流程图
```
┌────────────┐   drop .md    ┌──────────────────┐
│  Admin UI  ├──────────────►│ Server Action    │
│  (drag)    │  FormData     │ uploadPost()     │
└────────────┘               └────────┬─────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ 1. gray-matter   │
                            │    读 frontmatter │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ 2. 校验          │
                            │    - 必填字段     │
                            │    - slug 唯一性  │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ 3. unified 编译  │
                            │    remark-parse  │
                            │    remark-gfm    │
                            │    remark-math   │
                            │    rehype-shiki  │
                            │    rehype-stringify│
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ 4. 检测 video    │
                            │    (MD 内嵌链接)  │
                            │    → 提取 B/百度  │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ 5. 落库 + 落盘   │
                            │    SQLite Post    │
                            │    content/*.md   │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ 6. revalidate    │
                            │    /tech /posts/..│
                            └──────────────────┘
```

### 9.3 Frontmatter 约定
```markdown
---
title: Rust 异步编程入门
slug: rust-async-intro         # 可选, 缺省 = 文件名 slugify
category: tech                 # tech | life | novel (必填)
tags: [rust, async, tokio]     # 可选
cover: /covers/rust-async.jpg  # 可选
pinned: false                  # 可选
excerpt: 一句话简介             # 可选, 缺省自动取首段
date: 2026-06-24               # 可选, 缺省 = now()
---

# 正文从这里开始

这是 `inline code`, 下面是代码块:

\```rust
fn main() {
    println!("hello");
}
\```

视频示例: https://www.bilibili.com/video/BV1xx411c7mD
```

### 9.4 错误处理
- 前端: 上传后**实时显示解析日志** (灰色提示流), 失败高亮红条
- 后端: 每步抛 `ActionError`, 写 `logs/upload.error.log`
- 不破坏原 `.md`, 失败不入库, 老板可改完重传

### 9.5 批量上传
- 一次拖 10 个 .md → 并行解析 → 显示进度条 → 全部完成后跳列表

---

## 10. 视频嵌入方案 (重点)

### 10.1 哔哩哔哩 (B 站)
**输入支持**:
- 分享链接: `https://www.bilibili.com/video/BV1xx411c7mD`
- 短链: `https://b23.tv/xxxxx`
- 嵌入链接: `//player.bilibili.com/player.html?bvid=...`
- 纯 BV 号: `BV1xx411c7mD`

**解析**: 正则提取 `BV[a-zA-Z0-9]+` 或 `AV\d+`

**嵌入**:
```tsx
<iframe
  src={`//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0`}
  className="aspect-video w-full"
  allowFullScreen
  scrolling="no"
  frameBorder="0"
/>
```

**可选增强**: 通过 B 站开放 API 拉标题/封面/时长/播放量 (需 `SESSDATA` cookie, 见 §10.3)

### 10.2 百度网盘 (难点)
**问题**: 百度**官方不提供 embed API**, 分享链接无法直接 iframe。

**方案矩阵**:

| 方案 | 优点 | 缺点 | 黑推荐 |
|---|---|---|---|
| A. 官方 embed 链接 | 官方, 合规 | 经常失效, 限速 | ❌ |
| B. 第三方解析服务 (如 `pan-yz.workers.dev`) | 真正能播 | 第三方稳定性, 合规风险 | ⚠️ 备选 |
| **C. 中间页 + 复制提取码** | 合规, 稳定 | 需用户点 2 次 | ⭐ **默认** |
| D. 引导到客户端 | 体验最好 | 用户离开站 | 备选 |

**方案 C 实施**:
- 视频卡片: 显示"🔒 百度网盘"标识 + 提取码
- 点击 → 弹出中间页, 显示:
  - 视频封面/标题/简介
  - 提取码 (一键复制按钮)
  - 大按钮 "前往百度网盘播放" (新窗口打开)
- 可选: 同页面提供一个"第三方解析播放"按钮 (用方案 B, 标注免责声明)

**老板决策点 P3**: 百度网盘走方案 C 稳妥, 还是想折腾方案 B 全自动?

### 10.3 视频管理后台
- 粘贴 B 站/百度链接 → 实时解析 → 显示预览卡片 → 填标题/系列/标签 → 保存
- 列表: 按系列分组, 拖拽排序
- 数据: 标题/封面/平台/源 ID/提取码 (百度)

### 10.4 视频页播放器组件设计
```tsx
<VideoEmbed platform="bilibili" bvid="BV1xx" />
<VideoEmbed platform="baidu" uk="xxx" surl="yyy" pwd="abcd" />
<VideoEmbed platform="native" src="/videos/intro.mp4" />
```

平台自适应渲染, 统一带 loading skeleton + 错误态 (链接失效提示)。

---

## 11. 动画策略

### 11.1 动画分级
| 级别 | 触发 | 效果 | 实现 |
|---|---|---|---|
| L0 全局 | 加载完成 | Lenis 平滑滚动 | `SmoothScroll` 组件 |
| L1 路由 | 页面切换 | 上滑 + 淡入 (200ms) | Framer Motion `AnimatePresence` |
| L2 列表 | 滚入视口 | 错位 stagger 渐显 (50ms 间隔) | Framer Motion + `useInView` |
| L3 元素 | hover | 缩放/位移/阴影 (150ms 缓动) | Tailwind transition + Framer |
| L4 微动 | 静止状态 | 背景光斑飘动/数字滚动 | Framer Motion `useAnimation` |
| L5 装饰 | 鼠标移动 | 自定义光标 (可选, 默认关) | 客户端组件 |

### 11.2 缓动曲线
```ts
const EASE = [0.22, 1, 0.36, 1]      // 苹果风弹性出场
const EASE_OUT = [0.16, 1, 0.3, 1]   // Material Design
```

### 11.3 性能约束
- **滚动动画必须用 `transform` + `opacity`**, 禁用 `width/height/top/left`
- **Lenis 关掉条件**: `prefers-reduced-motion: reduce` 时立即降级到原生滚动
- **大列表虚拟化**: >50 项用 `react-virtuoso` 或 `@tanstack/react-virtual`

### 11.4 必须有
- ✅ 路由切换动效
- ✅ 卡片错位入场
- ✅ hover 微动
- ✅ 数字计数动画
- ✅ 暗色模式切换的"溶解"效果
- ⏳ 文字逐字显现 (可选)
- ⏳ 自定义光标 (可选)

---

## 12. 性能优化

### 12.1 指标目标 (Lighthouse 移动端)
| 指标 | 目标 | 老板期待 |
|---|---|---|
| **LCP** | < 1.5s | 极致 |
| **FID/INP** | < 100ms | 极致 |
| **CLS** | < 0.05 | 极致 |
| **TTFB** | < 200ms | 极致 |
| **Bundle (gzip)** | < 100KB (公开页) | 极致 |
| **Lighthouse 总分** | ≥ 95 | 极致 |

### 12.2 关键策略
1. **RSC + 流式 SSR**: 公开页 90% 在服务端, 客户端只水合交互组件
2. **next/image**: 所有图片走自动 WebP/AVIF + 懒加载
3. **next/font**: 字体自托管 + 预加载 + `display: swap`
4. **静态生成 (SSG)**: 文章详情页 `generateStaticParams` 预渲染
5. **ISR**: 文章改动走 `revalidatePath` 局部失效
6. **Shiki 编译期**: 代码高亮零运行时
7. **路由级代码分割**: 每个 page lazy
8. **Tailwind purge**: CSS < 10KB
9. **Prisma 单例**: 避免 dev 热重载多连接
10. **CDN**: Vercel Edge Network 或 Cloudflare

### 12.3 加载体验
- **首屏骨架屏**: 用 Shiki 主题色 (zinc-900) 占位
- **Loading bar**: 路由切换顶部细线进度
- **图片 blur placeholder**: `next/image` placeholder="blur"

---

## 13. 部署方案

### 13.1 方案 A: Vercel (强烈推荐)
- **优点**: Next.js 亲生, 零配置, 全球边缘, 自动 HTTPS
- **缺点**: 国内访问慢, 免费额度 100GB/月 (个人站绰绰有余)
- **域名**: 老板自有域名 CNAME 至 `cname.vercel-dns.com`
- **数据库**: Vercel Postgres / Neon / Supabase (SQLite 部署受限)
- **费用**: 个人站约 $0-5/月

> ⚠️ **问题**: Vercel 部署 SQLite 难 (无持久化), 需切 Postgres
> 📌 **老板决策点 P4**: 部署平台 — Vercel / 自托管 / 两者都要?

### 13.2 方案 B: 自托管 (老板"自己的机器")
- **架构**: 老板 VPS (2核2G 起步) + PM2 + Nginx + Certbot
- **数据库**: SQLite 文件 (足够个人博客) + 定期 cron 备份
- **优点**: 国内访问快, 数据私有
- **缺点**: 需自己维护 (黑可写 `deploy.sh` 一键脚本)
- **费用**: VPS 约 ¥30-100/月

### 13.3 方案 C: 两者皆可
- 主: Vercel (国际访客)
- 备: 国内 VPS 镜像 (国内访客 + 兜底)

### 13.4 黑推荐
- **Phase 1-2**: 开发 + Vercel Preview
- **Phase 3+**: 切自托管 (老板审美要"自己的", 数据也私有)
- **最终**: 写好 `scripts/deploy.sh`, 一行命令部署

---

## 14. 安全考虑

| 风险 | 缓解 |
|---|---|
| 站长密码泄漏 | bcrypt (cost=12) + 强密码策略 + 失败次数限流 |
| 越权访问 `/admin` | Middleware 拦截 + RSC 二次校验 |
| MD 上传 XSS | unified 编译 + rehype-sanitize 白名单 + CSP 头 |
| 视频嵌入被 XSS framejacking | `sandbox` + `referrerpolicy="no-referrer"` |
| 文件上传炸弹 | `Content-Length` 限制 5MB + 文件类型白名单 `.md` |
| CSRF | Auth.js 内置 + Server Action 走 `Origin` 校验 |
| SQL 注入 | Prisma 参数化, 无拼接 |
| 速率限制 | Vercel Edge Middleware / Nginx limit_req |

---

## 15. 开发路线图

### Phase 0 — 准备 (本阶段)
- [x] 项目立项 + GitHub 仓库
- [x] 方案文档 (本 DESIGN.md)
- [ ] 老板审核 + 拍板 (Q1-Q6)

### Phase 1 — 骨架 (3-5 天)
- [ ] Next.js 14 + TS + Tailwind 初始化
- [ ] Prisma + SQLite + seed
- [ ] Auth.js v5 + 登录页 + Middleware
- [ ] 基础布局: Navbar / Footer / 主题切换
- [ ] 首页 + About 页 (静态)
- [ ] Lenis + Framer Motion 基础设施
- **交付**: 能登录的半成品, 黑白风首页

### Phase 2 — 内容展示 (3-5 天)
- [ ] 5 大专栏列表页
- [ ] 文章详情页 + Shiki 代码高亮
- [ ] 视频列表 + B 站嵌入
- [ ] 搜索 (轻量级, Fuse.js 客户端)
- [ ] SEO: sitemap / robots / OG
- **交付**: 公开站基本可看

### Phase 3 — Admin 后台 (5-7 天)
- [ ] Admin 布局 + 侧边栏
- [ ] MD 上传 + 解析管线 (核心)
- [ ] 文章 CRUD
- [ ] 视频管理 (B 站/百度解析)
- [ ] 页面装饰 (Section 拖拽排序)
- [ ] 站点设置
- **交付**: 老板可独立运营

### Phase 4 — 打磨 (3-5 天)
- [ ] 动画细节打磨
- [ ] 移动端适配
- [ ] 性能优化 (Lighthouse ≥ 95)
- [ ] 部署脚本
- [ ] README + 运营文档
- **交付**: 可上线

**总计**: 14-22 天 (按老板每日 1-2h 拍板节奏)

---

## 16. 待老板拍板 (Q1-Q6)

> ⚠️ **不拍板不写代码** — 黑执行原则

| # | 决策项 | 默认 | 备选 |
|---|---|---|---|
| **Q1** | 项目名 | `obsidian-journal` | `mono-press` / `inkwell` / `handfoot-blog` / `sk-journal` |
| **Q2** | 评论区 | 不做 (纯静态) | Giscus (GitHub Discussions) |
| **Q3** | 百度网盘方案 | C: 中间页 + 提取码 | B: 第三方解析全自动 |
| **Q4** | 部署平台 | 自托管 (老板 VPS) | Vercel / 两者 |
| **Q5** | 暗色模式 | 默认暗色 (与"黑曜石"契合) | 默认亮色 + 暗色切换 |
| **Q6** | 评论的 LLM 自动回复 (像 xhs 那样) | 不做 | 后续 v2 再说 |

### 黑补充建议 (Q7-Q10, 不拍也行, 黑有主张)
| # | 建议项 | 黑推荐 | 理由 |
|---|---|---|---|
| Q7 | 友链页面 | **加** | 博客圈标配, 30 行代码 |
| Q8 | RSS / Atom Feed | **加** | 个人博客灵魂功能, 50 行 |
| Q9 | 全站搜索 | **先 Fuse.js 客户端** | 懒, 后续文章多了再 Algolia |
| Q10 | 数据备份 cron | **加** | SQLite 一行 crontab, 老板心安 |

---

## 17. 风险与开放问题

| 风险 | 影响 | 黑预案 |
|---|---|---|
| 百度网盘解析服务失效 | 视频无法播 | 默认走 C 方案 (合规), 写"链接失效举报"通道 |
| B 站 iframe 限速 | 国内播放卡 | 提示"前往 B 站观看"按钮, 不强求站内播 |
| SQLite 写入并发瓶颈 | 高频编辑崩 | 个人站几乎不会触发, 真出事切 Postgres |
| MD 解析库升级 break | 上传挂 | pin 版本 + 升级前单测覆盖 |
| Auth.js v5 仍在 beta | API 变 | v5 已稳定, 跟进度, 必要时锁 5.0.x |

---

## 18. 后续可选 v2 (不在本方案)

- [ ] AI 摘要生成 (复用 minimax API)
- [ ] 多语言 (i18n)
- [ ] 评论的 LLM 自动回复
- [ ] Newsletter 订阅
- [ ] PWA / 离线阅读
- [ ] Web3 打赏 (老板的 HandFoot 帝国风)
- [ ] 公众号 / Twitter 自动同步

---

> 📌 **审核重点**: §1 (命名) + §10.2 (百度) + §13 (部署) + §16 (6 决策)
>
> 老板审完拍板, 黑立刻动 Phase 1。
