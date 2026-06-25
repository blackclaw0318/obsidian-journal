# 黑曜石日志 (obsidian-journal)

> 用代码与数据说话 — HandFoot 商业帝国的个人博客平台

[![Version](https://img.shields.io/badge/version-0.6.1-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)]()
[![Node](https://img.shields.io/badge/node-22+-339933)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## 🌐 老板实时访问

| 通道 | URL | 说明 |
|---|---|---|
| **Cloudflare Tunnel (公网)** | https://usgs-everybody-terms-possible.trycloudflare.com | 一键 tunnel,随时可能换 URL |
| **本地** | http://localhost:3000 | dev server |
| **GitHub 截图 (静态)** | https://github.com/blackclaw0318/obsidian-journal/tree/main/output/screenshots | v0.6.1 真渲染截图 |

## 🎯 项目状态

**v0.6.1 — Phase 1 跑通版** (2026-06-25)

| Phase | 状态 | 说明 |
|---|---|---|
| P0 设计稿 | ✅ v0.1 → v0.5 | docs/ 完整 |
| **P1 骨架** | ✅ **v0.6 当前** | Next.js + node:sqlite + 13 Block + Seed + e2e 全过 |
| P2 展示 | ⏳ 待启动 | 5 专栏 + FTS5 + SEO |
| P3 Admin | ⏳ 待启动 | MD 上传 + Page Builder |
| P4 打磨 | ⏳ 待启动 | 性能 + 2c4g 压测 + 部署文档 |

## 📸 v0.6.1 真渲染截图 (chromium-1223 直跑)

| 页面 | 文件 | 状态 |
|---|---|---|
| 首页 | [06-home.png](output/screenshots/06-home.png) | ✅ 200 OK |
| 文章列表 | [07-posts-list.png](output/screenshots/07-posts-list.png) | ✅ 3 posts |
| 文章详情 | [08-post-detail.png](output/screenshots/08-post-detail.png) | ✅ markdown 渲染 |
| 小说列表 | [09-novels-list.png](output/screenshots/09-novels-list.png) | ✅ 元界 |
| Admin | [10-admin.png](output/screenshots/10-admin.png) | ✅ 占位页 |

## 🛠 技术栈 (v0.6.1 真实)

- **前端**: Next.js 14.2 (App Router) + React 18 + TypeScript
- **样式**: Tailwind CSS + 自定义主题 (黑曜石暗色 + 金色装饰)
- **数据库**: **Node 22 内置 `node:sqlite`** + 手写 SQL + WAL 模式 (非 Prisma — 见 DECISIONS Q11)
- **ORM/Repo**: 手写 `lib/repo.ts` (14 model × CRUD/upsert/findMany)
- **测试**: Vitest 2.1 (unit) + Playwright 1.49 (e2e, 8/8 通过)
- **截图**: chromium-1223 CLI (绕过 Playwright headless_shell-1148 binary 缺失)
- **公网暴露**: Cloudflare Tunnel 2026.6.1 (临时 trycloudflare 子域)
- **部署**: 见 [docs/DEPLOY.md](docs/DEPLOY.md) (v0.4 §13.4 部署配置层)

## 🚀 快速开始

```bash
# 1. 装依赖 (国内用户需先设镜像)
npm config set registry https://registry.npmmirror.com/
npm install

# 2. 一键启动 (init schema + seed + dev)
npm run db:seed   # 首次: 创建表 + 灌种子数据
npm run dev       # 启动 dev server (http://localhost:3000)

# 3. 跑测试 (验证完整链路)
npm run verify    # typecheck + lint + vitest
npx playwright test --reporter=list  # e2e

# 4. 暴露公网 (老板随时访问)
npm run dev:tunnel  # cloudflared tunnel --url http://localhost:3000
```

### 环境变量 (.env)

```env
DATABASE_URL="file:./data/dev.db"   # SQLite 路径
NEXTAUTH_SECRET="<random-32B>"      # NextAuth JWT 密钥
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@obsidian.local"
ADMIN_PASSWORD_HASH="<bcrypt>"      # 见 scripts/db-init.ts
DEPLOY_MODE="dev"                   # dev | prod-16g | prod-4g
SHARP_CONCURRENCY=2                 # sharp 并发 (2c4g 时设 1)
NODE_MAX_OLD_SPACE_MB=4096          # Next.js heap
```

## 📂 项目结构

```
obsidian-journal/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # 首页 (Hero + 5 专栏 + 最新 Post/Novel/Video)
│   ├── posts/                    # 文章 (列表 + 详情)
│   ├── novels/                   # 小说 (列表 + 详情, Phase 2 展开)
│   ├── admin/                    # Admin 后台 (Phase 3)
│   ├── globals.css               # Tailwind + 自定义主题
│   └── layout.tsx                # 根布局 (导航 + Footer)
├── lib/                          # 业务核心
│   ├── db.ts                     # node:sqlite 单例 + WAL + 7 PRAGMA + initSchema()
│   ├── repo.ts                   # 14 model × repo
│   ├── blocks/                   # 13 Block 类型 (Heading/Paragraph/Image/...)
│   ├── types.ts                  # TypeScript 类型
│   └── utils.ts                  # 工具函数 (slugify/formatDate/...)
├── prisma/                       # 命名保留 (实际是 seed, 无 schema.prisma)
│   └── seed.ts                   # 种子数据 (1 user + 3 socials + 3 posts + 1 novel + 2 chapters + 1 video)
├── scripts/
│   ├── db-init.ts                # initSchema 手动调用
│   ├── db-reset.ts               # 清库 + 重 seed
│   ├── screenshot.ts             # Playwright 截图脚本 (备用, 实际用 chrome CLI)
│   └── tunnel.sh                 # cloudflared 一键拉起
├── tests/
│   ├── unit/                     # Vitest 单测 (blocks/utils, 19 个 case)
│   └── e2e/home.spec.ts          # Playwright e2e (8 个 case, 全过)
├── docs/                         # 设计 + 决策 + 测试 + 部署
│   ├── DESIGN.md                 # v0.3 完整设计稿 (46KB)
│   ├── ARCHITECTURE.md           # 架构图 + 数据流 (22KB)
│   ├── DECISIONS.md              # Q1-Q16 决策项 + 黑推荐
│   ├── TESTING.md                # 测试金字塔 + 4 决策 (Q13-Q16)
│   ├── ROADMAP.md                # 4 Phase 路线
│   └── DEPLOY.md                 # 部署文档 (v0.4 §13.4)
├── output/screenshots/           # 阶段截图 (git 入仓做可见性)
├── data/dev.db                   # SQLite (gitignored)
└── package.json
```

## 📊 v0.6.1 验收数据

| 项 | 数据 |
|---|---|
| 代码行 | ~3,500 行 TypeScript |
| 数据模型 | 14 model (User/SiteConfig/Social/Post/Novel/NovelVolume/NovelChapter/VideoSeries/Video/Media/MediaUsage/...) |
| Block 类型 | 13 (Heading/Paragraph/Image/Quote/Callout/Code/Math/List/Video/Audio/CustomHtml/Divider/Embed) |
| 测试 | Vitest 19/19 · Playwright 8/8 · typecheck OK · lint ✔ |
| 部署 | dev (本机) + 4c16g (测试中) + 2c4g (待压测) |
| 公开访问 | Cloudflare Tunnel 临时 URL |

## 🔒 凭据安全

`.env` gitignored,包含:
- `DATABASE_URL` — SQLite 路径(本地文件,无密码)
- `NEXTAUTH_SECRET` — JWT 签名密钥
- `ADMIN_PASSWORD_HASH` — bcrypt 哈希

生产部署前**必须**:
- 重生成 NEXTAUTH_SECRET (32+ 随机字节)
- 重置 admin 密码 (`scripts/db-reset.ts`)
- HTTPS only (Cloudflare Tunnel 自带)

## 🛣 路线

- [x] **v0.6.1** — Phase 1 骨架 (Next.js + node:sqlite + e2e 全过)
- [ ] **v0.7** — Phase 2 展示 (5 专栏 + FTS5 + SEO)
- [ ] **v0.8** — Phase 3 Admin (MD 上传 + Page Builder + 媒体库)
- [ ] **v0.9** — Phase 4 打磨 (性能 + Lighthouse 92+ + 2c4g 压测)

## 🤝 协作

- **主仓**: https://github.com/blackclaw0318/obsidian-journal (public)
- **作者**: 上坤 (HandFoot 商业帝国 owner)
- **AI 协作者**: 黑 (Hei) — HandFoot 商业帝国首席全栈兼 AI 算法工程师
- **License**: MIT

---

> 上次更新: 2026-06-25 09:30 · v0.6.1 真渲染截图入仓
