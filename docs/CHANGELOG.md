# Changelog

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
