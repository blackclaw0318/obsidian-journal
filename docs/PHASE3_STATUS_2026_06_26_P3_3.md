# Phase 3.3 小说 + 卷 + 章节管理 收官报告 (2026-06-26 16:50)

> 🎯 目标: 完整实现 Novel → Volume → Chapter 三层 CRUD, 严守 v0.6.1 schema
> ⏱ 时长: 2026-06-26 11:00 - 16:50 (~6 小时含 docs)
> 📦 增量: 13 新文件 + 9 改文件 (+1100 行 app + 525 行 test), 0 新依赖
> 🧪 测试: 220/220 全过 (54 unit + 93 integration + 69 e2e + 4 visual)

---

## 🎯 严守 v0.6.1 schema (核心约束)

| 字段 | v0.6.1 设计 | Phase 3.3 落地 |
|---|---|---|
| `Novel.status` | 3 值 (ongoing\|completed\|hiatus) | ✅ 严守 |
| `Novel.deleted_at` | 软删独立字段 | ✅ 新增 INTEGER NULL + idx |
| `NovelVolume.deleted_at` | 软删独立字段 | ✅ 新增 INTEGER NULL + idx |
| `Chapter.status` | **无此字段** | ✅ 严守, 用 `published Boolean` |
| `Chapter.published` | Boolean (替代 status enum) | ✅ INTEGER (DB) ↔ boolean (TS) 转换 |
| `Chapter.published_at` | INTEGER NULL | ✅ 自动管理 (首次 true 写时间戳) |
| `Chapter.deleted_at` | 软删独立字段 | ✅ 新增 INTEGER NULL + idx |

> 💡 **架构亮点**: 业务状态 (status) 与删除维度 (deleted_at) 解耦, 软删不影响业务流。
> 例: 连载中的小说可以"软删除"→ 业务状态保持 ongoing, 列表不显示, archived 视图可恢复。

---

## 📊 落地范围

### Repository 扩展 (lib/repo.ts + 280 行)

| Repo | 新增方法 | 说明 |
|---|---|---|
| `novelRepo` | byId / bySlug / listAll / slugExists / update / softDelete / restore | 7 方法 |
| `volumeRepo` | byId / nextOrder / listByNovel / update / softDelete / restore / softDeleteWithChapters / restoreWithChapters | 8 方法 (含**级联**) |
| `chapterRepo` | byId / nextOrder / listByVolume / slugExists (全局唯一) / update / softDelete / restore | 7 方法 |

#### 关键设计

1. **`toChapter()` 转换器**: DB 行 `published INTEGER (0/1)` → TS `published boolean`, 严守 schema
2. **`nextOrder()` 自动算**: per-volume/per-novel max+1, 排除 deleted (避免空洞)
3. **`listByNovel(volumeId, includeDeleted)`**: 双签名重载, 第二参默认 false
4. **`softDeleteWithChapters` / `restoreWithChapters`**: 事务级级联, 避免孤儿章节
5. **`slugExists` 全局唯一 (chapter)**: 跨 volume 感知, 排除自身

### API 路由 (5 个文件 + 350 行)

| 路径 | 方法 | 说明 |
|---|---|---|
| `/api/admin/novels` | POST | 创建 novel |
| `/api/admin/novels/[id]` | PUT/DELETE/PATCH | 更新/软删/恢复 |
| `/api/admin/novels/[id]/volumes` | POST | 创建 volume (order 自动) |
| `/api/admin/novels/[id]/volumes/[vid]` | PUT/DELETE/PATCH | 更新/级联软删/级联恢复 |
| `/api/admin/novels/[id]/volumes/[vid]/chapters` | POST | 创建 chapter (slug 全局唯一) |
| `/api/admin/novels/[id]/volumes/[vid]/chapters/[chid]` | PUT/DELETE/PATCH | 更新/软删/恢复 |

#### 验证清单 (所有 API)
- ✅ requireUser (JWT 验签)
- ✅ 路径参数校验 (novel/volume/chapter 存在 + 归属链)
- ✅ slug 唯一性 (409 on duplicate)
- ✅ order 唯一性 (409 on duplicate via UNIQUE)
- ✅ 业务字段长度限制 (≤ 200)
- ✅ 输入校验 (title/content 非空)

### Admin 页面 (10 个 + 950 行)

| 路径 | 文件 | 说明 |
|---|---|---|
| `/admin/novels` | `page.tsx` | 列表 + 状态筛选 + 搜索 + archived 视图 |
| `/admin/novels/new` | `new/page.tsx` | 新建表单 (复用 NovelForm) |
| `/admin/novels/[id]` | `[id]/page.tsx` | 详情 + 卷管理 + inline 添加 |
| `/admin/novels/[id]/edit` | `[id]/edit/page.tsx` | 编辑表单 |
| `/admin/novels/[id]/volumes/[vid]` | `[id]/volumes/[vid]/page.tsx` | 章节列表 + 状态筛选 + 搜索 + inline 添加 |
| `/admin/novels/[id]/volumes/[vid]/chapters/new` | `.../chapters/new/page.tsx` | 备用入口 (推荐 inline) |
| `/admin/novels/[id]/volumes/[vid]/chapters/[chid]/edit` | `.../chapters/[chid]/edit/page.tsx` | 编辑 (Markdown) |
| _components | 5 个 | NovelForm / NovelListActions / VolumeInlineCreate / VolumeListActions / ChapterForm / ChapterInlineCreate / ChapterListActions |

#### 关键 UI 决策
- **状态筛选 UI**: NovelStatus 3 值 + `archived` (查询别名, 查 `deleted_at IS NOT NULL`)
- **Chapter 状态**: 用 checkbox (published/draft) + 已归档 badge, 无 select (符合 schema)
- **slug 自动生成**: 标题输入时, slug 留空则自动从标题生成 (英文/数字/中文/连字符)
- **inline 创建**: 卷/章节用内嵌表单, 完成后 `router.refresh()` 自动重渲染
- **删除确认**: 两段式 (删除 → 确认删除 → 取消), 避免误删

### 测试 (220/220)

| 类型 | 数量 | 详情 |
|---|---|---|
| Unit | 54 | utils + blocks + feed + seo (无新增, 严守 utils) |
| Integration | 93 | repo 20 + search 11 + auth 16 + posts 16 + **novels 30 (新增)** |
| E2E | 69 | home + feed + seo + search + auth + admin-posts + **admin-novels 8 (新增)** |
| Visual | 4 | home-light/dark/posts-list/post-detail (Phase 3.3 UI 未影响公共页) |
| **总计** | **220** | **全过** |

#### novels.test.mts (30 tests) 覆盖
- novelRepo: byId / bySlug / listAll (status 筛选 + q 搜索 + 分页) / slugExists (含 excludeId) / update / softDelete / restore
- volumeRepo: byId / nextOrder / listByNovel (含 chapter_count) / update / softDeleteWithChapters (级联) / restoreWithChapters (级联)
- chapterRepo: byId / nextOrder (跳过 deleted) / listByVolume (published/q/archived 筛选 + includeDeleted) / slugExists (全局唯一 + 排除软删) / update (published 自动管理 published_at) / softDelete / restore

#### admin-novels.spec.ts (8 e2e) 覆盖
1. 列表页展示 seed 数据 + 新建按钮
2. 新建小说 → 进入详情页
3. slug 重复应报错
4. 详情页 inline 添加卷
5. 卷详情页 inline 添加章节 → 跳编辑页
6. 编辑章节 → 改状态为已发布
7. 软删小说 → 状态 archived → 恢复
8. 未登录访问应重定向到 login

---

## 🐛 关键设计决策与坑

### 1. status vs deleted_at 双字段设计
- **设计**: NovelStatus 业务状态 (ongoing/completed/hiatus) 与 deleted_at 删除维度解耦
- **理由**: 业务状态独立于"是否展示", 软删不改业务字段, 恢复后业务状态保持
- **例**: 连载中 → 软删 → archived 视图 → 恢复 → 状态仍是"连载中" ✅

### 2. Chapter 无 status 字段
- **设计**: Chapter 用 `published Boolean` + `deleted_at` 表达三态
  - draft: `published=0, deleted_at=null`
  - published: `published=1, deleted_at=null, published_at=...`
  - archived: `published=* (任意), deleted_at=...`
- **UI 映射**:
  - `<select status>` ❌ (违反 schema)
  - `<input type="checkbox" checked={published}>` ✅
  - 已归档 = badge "已归档" (gray)

### 3. slug 全局唯一 (chapter) vs per-parent 唯一 (volume order)
- **chapter.slug**: 全局唯一 (跨 volume), 简化 URL 路由 `/chapters/[slug]`
- **volume.order**: per-novel 唯一, `UNIQUE(novel_id, "order")`
- **novel.slug**: 全局唯一 (无 parent), `UNIQUE(slug)`
- **chapters 软删与 slug**: `slugExists` 默认排除 `deleted_at IS NOT NULL`, 允许恢复后 slug 仍可用

### 4. 级联软删/恢复 (volume)
- **设计**: Volume 软删时, 级联写所有 chapters `deleted_at = ?`, 恢复时一并清
- **理由**: 避免孤儿章节 (chapter.volume_id 指向 archived volume 仍可见的尴尬)
- **实现**: 单事务内先 chapters 后 volume, 计数返回

### 5. published_at 自动管理
- **首次发布** (true + 原 published_at null) → 写当前时间戳
- **改回 draft** (false) → 清 published_at
- **重复发布** (true + 已有 published_at) → 保持原时间戳 (不覆盖)

### 6. 路由目录陷阱 (Next.js 14)
- ❌ `_components` 没问题 (下划线开头是组件目录约定, 但在 routes 下会被忽略)
- ❌ 路由目录不能用 `_` 开头 (那是 private folder, 不注册)
- ✅ 用 `(admin)` route group 区分公开/管理

### 7. slug 自动生成正则
- 旧: `replace(/[^a-z0-9\s-]/g, "")` — 不支持中文
- 新: `replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")` — 支持中文 unicode
- 用 `\s+` → `-` 转换, 截 80 字符

---

## 🆚 与 3.2 帖子 CRUD 的设计差异

| 维度 | Post (3.2) | Novel/Volume/Chapter (3.3) |
|---|---|---|
| 业务状态 | `status enum` (draft/published/archived) | **双字段**: status enum + deleted_at |
| archived 实现 | 写 `status='archived'` | 写 `deleted_at=time` (status 不动) |
| 恢复 | `status='draft'` | 清 `deleted_at` (status 保持原业务状态) |
| 唯一性 | slug 全局 | chapter.slug 全局 / volume.order per-novel |
| 层级 | 1 层 | **3 层** (parent-child-grandchild) |
| 级联 | 无 | Volume 软删级联 chapters |
| 列表筛选 | status select | status select + archived (查 deleted_at) |
| Markdown 编辑 | 无 | Chapter 支持 (20 行 textarea) |
| 自动 order | 无 | Volume/Chapter 自动 max+1 |

---

## 📸 截图 (6 张入仓)

| 文件 | 路径 |
|---|---|
| 22-admin-novels-list.png | `/admin/novels` 列表 (含筛选 + 元界 seed) |
| 23-admin-novels-new.png | `/admin/novels/new` 新建表单 (slug 自动生成) |
| 24-admin-novels-detail.png | `/admin/novels/[id]` 详情 + 卷管理 (含 inline 添加按钮) |
| 25-admin-volume-detail.png | `/admin/novels/[id]/volumes/[vid]` 章节列表 + 筛选 |
| 26-admin-chapter-edit.png | `/admin/novels/[id]/volumes/[vid]/chapters/[chid]/edit` Markdown 编辑器 |
| 27-admin-novels-archived.png | `/admin/novels?status=archived` archived 视图 |

---

## 🚀 启动 / 测试 / 部署

```bash
# 本地 dev (port 3000, 已运行)
npm run dev

# 测试 (Phase 3.3 全套)
npm run test:integration  # 93/93 (含 novels 30)
npm run test:e2e          # 69/69 (含 admin-novels 8)
npm run test:visual       # 4/4
npm run verify:full       # 220/220 全过
```

---

## ⏭ Phase 3.4 计划 (黑推荐下一站: 视频系列管理)

- 3.4 VideoSeries + Video CRUD (复用 postRepo 模式)
  - VideoSeries: title / slug / description / order / cover_image
  - Video: series_id / slug / title / description / video_url / duration / order
  - 同 3 层关系 (Series → Video), 可参考 Novel → Volume → Chapter 的级联设计
- 风险: video_url 外链 (YouTube/B站) vs 自托管 (Q19 媒体库决策后)
- 预计 1-2 天, ~150 行 app + ~250 行 test

---

## 📝 待办 (跨 Phase 3)

- ⏳ Q18 Page Builder 决策 (模板化 v1 vs 自由)
- ⏳ Q19 媒体库存储 (本地先 vs S3/R2)
- ⏳ Q20 部署目标 (2c4g 直接 vs 先 4c16g 跑通)
- ⏳ 3.4-3.10 子任务 (7 个, 黑推荐 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10)
- ⏳ 百度 Worker 独立仓库 (老板建仓决策)