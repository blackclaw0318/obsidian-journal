# Changelog

## v0.12.0 (2026-06-30) — Phase 3.7 起步: Block 渲染器 + 公开详情页 ⭐

### 🎉 Phase 3 进度: 60% → 65% (3.7 起步)

**v0.6.1 §6.1 Block 系统核心**: 13 种 Block 渲染器 (公开端 + Admin 预览共用)
**v0.6.1 §8 公开详情页**: 5 个公开页 (novel/volume/chapter/page/video)

### 🆕 v0.11 → v0.12 新增 (12 文件 +1197/-25 行)

**Block 渲染器** (v0.6.1 §6.1 严守 13 种)
- `lib/blocks/render.tsx` (291 行): 13 个 Block 渲染器
  - markdown-it + DOMPurify (技术栈 §3 严守)
  - "use client" (CSR)
  - HeadingBlock 自动 anchor (中英文 slug)
  - CalloutBlock 4 变体 (info/warn/success/danger) + lucide-react 图标
- `tests/unit/blocks-render.test.tsx` (138 行): 8 单测覆盖渲染

**公开详情页** (v0.6.1 §8)
- `app/novels/[slug]/page.tsx` (113 行): 小说详情 (聚合卷+已发布章节)
- `app/novels/[slug]/[volSlug]/page.tsx` (82 行): 卷详情
- `app/chapters/[slug]/page.tsx` (94 行): 章节详情 (含 view_count++)
- `app/pages/[slug]/page.tsx` (50 行): 单页详情
- `app/videos/[slug]/page.tsx` (92 行): 视频详情
- `tests/e2e/public-detail-pages.spec.ts` (84 行): 4 公开页 e2e

**媒体库 UI 改进**
- `app/media/page.tsx` (+97/-21 行): 详情/预览/引用追踪

**repo 扩展** (lib/repo.ts +61 行, 公开端查询)
- novelRepo: bySlugWithVolumes (聚合 novel→volumes→chapters)
- volumeRepo: bySlug + byNovelWithPublishedChapters
- chapterRepo: incrementView + bySlugPublished + bySlugWithContext
- videoRepo: bySlugWithSeries
- **全部严守 published/deleted_at 过滤**

**新依赖**: markdown-it ^14.2.0 + @types/markdown-it ^14.1.2

### 🧪 测试覆盖 (verify:fast)
- typecheck: 0 错误
- lint: 0 警告
- unit: 70/70 (含 8 新 blocks-render)
- integration: 132/132 (含 novel/video 公开查询关联)
- **总计 202/202 通过**

### 🛠 运营修复
- Tunnel URL 失效: cloudflared-quick.service 重启 → 新 URL `arrivals-approve-shield-ladder.trycloudflare.com`
- obsidian-tunnel-monitor.service 第一次重启后触发 failed (tunnel 握手期检测, 非 bug, 自愈)

### ⏭ Phase 3.7 继续 (Page Builder v1 主体, v0.6.1 §21)
- 左栏 Block 库 (13 种 + 状态)
- 中栏 Canvas (dnd-kit 拖拽)
- 右栏属性编辑器
- /admin/pages/[key]/edit 三栏
- Block 序列化 ↔ Page.content JSON

Refs: docs/DESIGN.md §6.1 + §8 + §21

---

## v0.11.0 (2026-06-29) — 批 1 收官 + 3.4/3.5/3.6 落地 ⭐

### 🎉 Phase 3 进度: 30% → 60% (3.1+3.2+3.3+3.4+3.5+3.6+批1)

**v0.6.1 §6 还原**: Series 表 (v0.6.1 设计 tech/life 文章系列, Phase 2.1 实施时偷懒砍了, 现还源)
**新增**: DailyStat 表 (Phase 4 监控铺路)

### 🆕 v0.10 → v0.11 新增 (15 个 model + admin 全部联动)

**Phase 3.4 视频系列管理** (working tree 收官)
- `videoSeriesRepo` + `videoRepo` 扩展: byId/bySlug/listAll/slugExists/update/hardDelete
- `/admin/videos` + `/admin/video-series` CRUD 路由
- 3 集成 + 3 e2e 测试

**Phase 3.5 页面管理** (working tree 收官, 基础版)
- `pageRepo`: byId/bySlug/listAll/update/softDelete/restore
- `/admin/pages` CRUD 路由
- 3 集成 + 3 e2e 测试

**Phase 3.6 媒体库** (working tree 收官)
- `mediaRepo`: byId/byFilename/listAll/update/hardDelete + addUsage/removeUsage
- `/admin/media` 列表 + 上传 + 引用追踪
- 3 集成 + 3 e2e 测试

**批 1 加成** (Phase 3.1 验证后补齐)
- **Series 表还原 v0.6.1 §6**: tech/life 文章系列 (与 video_series 区分)
  - `posts.series_id` 外键 (Phase 2.1 实施时偷懒改成 video_series, 现还原)
  - `seriesRepo` 完整 CRUD
  - 7 集成 + 3 e2e 测试
  - `/admin/series` CRUD UI (新建/编辑/删除/列表)
- **DailyStat 表**: 每日 PV/UV/post_views/new_comments 聚合
  - `dailyStatsRepo`: upsert/byDate/range/recent/totalPv
  - 3 集成测试
- **/admin/socials 友链管理** (v0.6.1 §7.2)
  - `socialRepo` 扩展: byId/update/hardDelete/count
  - `/admin/socials` 列表 + inline 创建/编辑/删除/可见切换
  - 5 集成 + 2 e2e 测试
- **/admin 仪表盘**: 8 卡片统计 + 最近 7d 流量 + 最近发布 + 最新小说
  - 2 e2e 测试
- **/admin/upload MD 上传**: type 区分 article/chapter, frontmatter 解析
  - 2 个 API: /api/admin/upload/article + /chapter
  - 2 e2e 测试 (页面加载 + 预览解析)

### 🔧 修复
- 老 dev.db schema 兼容: `posts` 缺 `series_id` 列 → migrateSchema 加 ALTER TABLE
- idx_posts_series 从 initSchema 移到 migrateSchema (避免老库 init 中断)
- Post /admin/(admin)/page.tsx formatDate 调用方式
- /admin/socials + /admin/upload 跨 server→client 边界 null prototype 序列化
- Login form input 选择器: `name=` → `type=`
- /admin dashboard 导航, 增 加 "系列" + "友链" 入口

### 🧪 测试覆盖 (verify:full)
- typecheck: 0 错误
- lint: No warnings or errors
- unit: 54/54
- integration: 111/111 (原 96 + 15 新: 7 series + 5 socials + 3 daily)
- e2e: 90/90 (原 81 + 9 新: 3 series + 2 socials + 2 dashboard + 2 upload)
- visual: 4/4
- **总计 259/259 通过**

### ⏭ Phase 3 继续 (v0.12+)
- 3.7 Page Builder v1 (Block 编辑, Q18 待拍)
- 3.8 站点设置 SiteConfig UI
- 3.9 用户管理 (含改密码踢 session)
- 3.10 部署加固 + 2c4g 压测 (Q20 待拍)
- 批 2: Block 渲染器 + 公开详情页 (novels/videos/pages/media)

## v0.10.0 (2026-06-26) — Phase 3.3 小说 + 卷 + 章节管理 ⭐

### 🎉 Phase 3.3 DoD 全部达成
- ✅ 三层 CRUD 完整闭环: Novel → Volume → Chapter
- ✅ 严守 v0.6.1 schema:
  - NovelStatus 仅 3 值 (ongoing|completed|hiatus), 软删走 `deleted_at` 字段
  - Chapter 无 status 字段, 用 `published Boolean`
  - Volume 软删走 `deleted_at` 字段
- ✅ 级联软删/恢复: Volume 软删时级联标记所有 chapters `deleted_at`
- ✅ slug 全局唯一 (chapter), per-novel 唯一 (volume order)
- ✅ 8 e2e tests 覆盖完整流 (列表/创建/编辑/软删/恢复/级联/未登录重定向)

### 📊 v0.7.0 → v0.10.0 增量
| 项 | 增量 |
|---|---|
| 远端 commit | 17 → 23 (+6) |
| 源代码 | +13 文件 (~1700 行) |
| 测试 | 133 → 220 (+87: +0 unit +63 integration +16 e2e +4 visual +12 novels integration +8 novels e2e) |
| 截图 | 18 → 24 (+6) |

### 🆕 v0.7.0 → v0.10.0 新增 (Phase 3.1 + 3.2 + 3.3)

**Phase 3.1 Auth + Admin 布局** (v0.8)
- Q17 修订: NextAuth → 自建 JWT + httpOnly cookie (jose + bcryptjs)
- `lib/auth.ts` (200 行: bcrypt + jose + sessions + 限流)
- `app/api/auth/{login,logout,me}/route.ts` (3 个 API)
- `middleware.ts` (Edge, JWT 验签)
- `app/admin/(admin)/` 路由组: AdminShell 布局 + 6 个子导航

**Phase 3.2 帖子 CRUD** (v0.9)
- `postRepo` 扩展: byId / listAll / slugExists / update / softDelete / restore
- `app/api/admin/posts/[id]/route.ts` (PUT/DELETE/PATCH)
- 列表/新建/编辑页 + PostForm (slug 自动生成)
- 软删除 + 恢复按钮

**Phase 3.3 小说三层 CRUD** (v0.10) ⭐ 本次
- `lib/db.ts`: novels/novel_volumes/chapters 加 `deleted_at INTEGER + index`
- `lib/repo.ts` 扩展:
  - `novelRepo`: byId / bySlug / listAll / slugExists / update / softDelete / restore
  - `volumeRepo`: byId / nextOrder / listByNovel / update / softDelete / restore / softDeleteWithChapters / restoreWithChapters (级联)
  - `chapterRepo`: byId / nextOrder / listByVolume / slugExists (全局唯一) / update / softDelete / restore
- `lib/types.ts`: Novel + NovelVolume + Chapter 加 `deleted_at: number | null`, Chapter 用 `published: boolean`
- API 路由 (5 个):
  - `/api/admin/novels` (POST 创建)
  - `/api/admin/novels/[id]` (PUT/DELETE/PATCH)
  - `/api/admin/novels/[id]/volumes` (POST 创建, order 自动 max+1)
  - `/api/admin/novels/[id]/volumes/[vid]` (PUT/DELETE/PATCH + 级联)
  - `/api/admin/novels/[id]/volumes/[vid]/chapters` (POST 创建, slug 全局唯一)
  - `/api/admin/novels/[id]/volumes/[vid]/chapters/[chid]` (PUT/DELETE/PATCH)
- Admin 页面 (10 个):
  - `/admin/novels` (列表 + 筛选 + 搜索 + archived 视图)
  - `/admin/novels/new` + `/admin/novels/[id]/edit` (NovelForm)
  - `/admin/novels/[id]` (详情 + 卷管理 + inline 创建)
  - `/admin/novels/[id]/volumes/[vid]` (章节管理 + 筛选 + 搜索 + inline 创建)
  - `/admin/novels/[id]/volumes/[vid]/chapters/new` + `/[chid]/edit` (ChapterForm, Markdown 编辑)
- 安全:
  - 所有写操作 requireUser (JWT 验签)
  - slug 唯一性 (DB 层 UNIQUE + 应用层 slugExists 排除自身)
  - 软删除不丢数据 (可恢复)
  - 输入长度限制 (slug/title ≤ 200)

### 🧪 测试覆盖 (verify:full)
- typecheck: 0 错误
- lint: No warnings or errors
- unit: 54/54 (utils + blocks + feed + seo)
- integration: 93/93 (repo 20 + search 11 + auth 16 + posts 16 + novels 30)
- e2e: 69/69 (home + feed + seo + search + auth + admin-posts + admin-novels)
- visual: 4/4 (home-light/dark/posts-list/post-detail)
- **总计 220/220 通过**

### 🐛 关键设计决策
- ⚠️ **status vs deleted_at 双字段设计**: 业务状态 (ongoing|completed|hiatus) 与删除维度 (deleted_at) 解耦
- ⚠️ **Chapter 无 status**: 严守 v0.6.1, 用 `published Boolean` + `deleted_at` 表达三态 (draft/published/archived)
- ⚠️ **级联软删**: Volume 软删时级联标记 chapters, 恢复时一并恢复 (避免孤儿章节)
- ⚠️ **slug 全局唯一 (chapter)**: 跨 volume 不能重名, 简化 URL 路由
- ⚠️ **published_at 自动管理**: 首次发布 (true) 自动写时间戳, 改回 false 清空

### ⏭ Phase 3 继续 (v0.11+)
- 3.4 视频系列管理 (黑推荐)
- 3.5 页面管理
- 3.6 媒体库 (本地先, R2 后) — Q19 待拍
- 3.7 Page Builder v1 — Q18 待拍
- 3.8 站点设置 (SiteConfig)
- 3.9 用户管理 (含改密码踢 session)
- 3.10 部署加固 + 2c4g 压测 — Q20 待拍

---

## v0.7.0 (2026-06-26) — Phase 2 完整收官 ⭐

### 🎉 Phase 2 DoD 全部达成
- ✅ 2.1 5 专栏详情页 + PostCategory 严守
- ✅ 2.2 FTS5 全文搜索 + Admin /admin/reindex (降级容错)
- ✅ 2.3 SEO (sitemap.xml / robots.txt / JSON-LD / OG / canonical)
- ✅ 2.4 RSS / Atom 双格式订阅
- ✅ 2.5 测试加固 (Q13-Q16 全激活: 35/30/25/10 + 75% 覆盖率 + 2% 视觉 + pre-push verify)
- ⏸ 2.6 Worker 独立仓库 (延后到 Phase 3 / 老板拍板后启动)
- ✅ 2.7 文档 + 截图 (本版本)

### 📊 v0.7 累计交付
| 项 | 数量 |
|---|---|
| 远端 commit | 17 (从 v0.1 init 到 v0.7 收官) |
| 源代码 | 14 文件 / ~1700 行 (app ×9 + lib ×6 + components ×1 + scripts ×1) |
| 测试 | 9 文件 / 133 case (54 unit + 31 integration + 44 e2e + 4 visual) |
| 截图 | 18 张入仓 |
| 文档 | 8 个 md (CHANGELOG / DESIGN / DECISIONS / DECISIONS-QUICK / DEPLOY / PHASE2_PLAN / ROADMAP / TESTING) |

### 🆕 v0.6.0 → v0.7.0 新增

**Phase 2.2 FTS5 搜索 (核心)**
- `lib/db.ts`: posts_fts virtual table + 3 triggers (AI/AD/AU 同步)
- `lib/repo.ts`: `postRepo.search({ q, status, limit })` — FTS5 优先, 失败降级 LIKE
- `lib/repo.ts`: `postRepo.reindexFts()` — 重建索引
- `app/posts/page.tsx`: `?q=` 参数支持 + 搜索框 UI
- `app/admin/reindex/route.ts`: POST 重建 FTS 索引 + 降级容错
- 搜索响应 < 100ms, unicode61 tokenize 支持中英文

**Phase 2.3 SEO**
- `app/sitemap.xml/route.ts`: sitemap 0.9 (静态页 + Post + Novel + Video)
- `app/robots.txt/route.ts`: 禁 /admin /api /_next, 互引 sitemap
- `lib/seo.ts`: jsonLdArticle / jsonLdBook / jsonLdVideo / jsonLdWebSite
- 全站 generateMetadata + canonical + OG + Twitter Card

**Phase 2.4 RSS/Atom**
- `app/feed.xml/route.ts`: Atom 1.0 (RFC 4287)
- `app/rss.xml/route.ts`: RSS 2.0
- `lib/feed.ts`: buildAtomFeed + buildRssFeed + helper
- layout.tsx 加 autodiscovery link (2 个)

**Phase 2.5 测试加固 (Q13-Q16 全激活)**
- 35/30/25/10 测试金字塔 (unit / integration / e2e / visual)
- lib 覆盖率 97.4% (远超 75% 阈值, c8 真实计算)
- 4 张视觉 baseline (Q15 ≤ 2% 像素差)
- simple-git-hooks: pre-commit lint + pre-push verify:fast

**Phase 2.a 主题切换**
- `components/ThemeToggle.tsx`: 3 模式 (☀️/🌙/🖥️) + localStorage
- `app/globals.css`: .dark CSS 变量
- FOUC 防御: head 内嵌 themeInitScript

### 🔧 工程修复
- 修 integration test 隔离 (`DATABASE_URL` 覆盖 → test.db 不污染 dev.db)
- 修 visual viewport 一致性 (1280x720 与 e2e config 对齐)
- 修 posts-list 视觉 baseline (新增搜索框后重生成)
- 修 home-dark 视觉 baseline (db 内容恢复后重生成)
- 修 search 提交 button click timing (改用 Enter + waitForURL)

### 🧪 测试覆盖 (verify:full)
- typecheck: 0 错误
- lint: No warnings or errors
- unit: 54/54 (utils + blocks + feed + seo)
- integration: 31/31 (repo 20 + search 11)
- e2e: 44/44 (home + feed + seo + search)
- visual: 4/4 (home-light/dark/posts-list/post-detail)
- **总计 133/133 通过**

### 🐛 关键风险与缓解
- ⚠️ **FTS5 中文分词**: unicode61 tokenize 对中文支持有限, 改用单字 / 词精确匹配 + LIKE 降级
- ⚠️ **visual baseline 漂移**: 任何 UI 变更后必须重生成 baseline
- ⚠️ **integration 污染 dev.db**: 强制 `process.env.DATABASE_URL` 覆盖
- ⚠️ **2c4g 内存紧张**: WAL + sharp=1 + heap=1.5G + swap=2G (v0.4 部署方案, 未实测)

### ⏭ Phase 3 计划 (v0.8+)
- Auth 完整闭环 (NextAuth login/logout/session)
- Admin CRUD (Post/Novel/Video/Social/Media/Page)
- MD 上传 + Page Builder
- MediaUsage 引用追踪 + 删除警告
- CustomHtml 开关 (SiteConfig.allowCustomHtml + DOMPurify)
- Worker 独立仓 (Q3/Q7/Q10, 需老板建仓决策)
- 站点设置 UI

---

## v0.6.0 (2026-06-24) — Phase 1 骨架实现版

[历史快照, 完整内容保留在 git history]

---

## v0.5.0 (2026-06-24) — 测试方案

[历史快照]

## v0.4.0 (2026-06-24) — 部署方案

[历史快照]

## v0.3.0 (2026-06-24) — 设计稿

[历史快照]

## v0.2.0 (2026-06-24) — 初版设计

## v0.1.0 (2026-06-24) — 项目立项
