# Phase 5 Plan V1 — 资源库 UI 改版 (图片分页 + 音/文档列表)

> 编制: 黑 (Hei) · 编制时间: 2026-07-29 14:43 GMT+8
> 触发: 老板 2026-07-29 14:43 反馈"图片要分页、音频文档列表展示、UI 与整体保持一致"
> 目标版本: v0.42 (Phase 5)
> 代码量预估: 0.5–1 天
> 前置: 老板拍 Q1–Q4

---

## TL;DR

把公开端 `/resources` 从"三类共用 4 列网格"拆成**按 category 分支渲染**:

| category | layout | 分页 |
|---|---|---|
| `image` | **分页网格** (4 列卡片, 含缩略图) | ✅ 每页 N 张, URL `?type=image&page=2` |
| `document` | **列表** (单列行, icon + 文件名 + 元数据 + 下载) | ❌ 全量展示 |
| `audio` | **列表** (单列行, icon + 文件名 + 元数据 + 预览 + 下载) | ❌ 全量展示 |
| 全部 (无 type) | 默认走 `image` 分页网格 (数量最多, 最常用) | ✅ 同 image |

UI 全部沿用现有 CSS 变量 + Tailwind class, **不引入新设计系统 / 新组件库 / 新色板**。

---

## 1. 现状与问题

### 1.1 公开端当前实现 (`app/resources/page.tsx` + `_components/ResourceGrid.tsx`)

```
- 单一 ResourceGrid: sm:2 / md:3 / lg:4 列网格
- 所有 category 共用同一种卡片
  - image: 缩略图
  - audio / document: 大 emoji icon + 右下角角标
- 顶部 tabs: 全部 / 图片 / 文档 / 音频 (GET ?type=)
- 搜索框 (GET ?q=)
- 单页 limit = 100
```

### 1.2 老板痛点 (2026-07-29 14:43)

- **图片**: 一次性铺 100 张, 没翻页 → 浏览体验单调, 找不到新旧
- **音频/文档**: 用 4 列网格 + emoji icon 强行凑 → 占空间且不像列表
- **UI**: 整体观感与 `/posts`、`/admin/resources` 不一致 (后者是 2 列卡片 + 表格感)

---

## 2. 改版方案

### 2.1 路由 & 数据流

```
GET /resources                    → image grid 第 1 页 (默认)
GET /resources?type=image         → image grid 第 1 页
GET /resources?type=image&page=2  → image grid 第 2 页
GET /resources?type=document      → document 列表 (全量)
GET /resources?type=audio         → audio 列表 (全量)
GET /resources?q=keyword          → 跨类搜索 (沿用 listAll, 不分页, 沿用当前 grid 形态)
```

**`page.tsx` 决策树** (server component):

```ts
const type = searchParams.type ?? "";
const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);

if (type === "image") {
  const PAGE_SIZE = 12; // Q1 拍板
  const offset = (page - 1) * PAGE_SIZE;
  const { items, total } = mediaRepo.listByCategory({ category: "image", limit: PAGE_SIZE, offset });
  // → 渲染 ResourceImageGrid + Pagination
}
else if (type === "document") {
  const { items, total } = mediaRepo.listByCategory({ category: "document", limit: 200 });
  // → 渲染 ResourceList (无分页)
}
else if (type === "audio") {
  const { items, total } = mediaRepo.listByCategory({ category: "audio", limit: 200 });
  // → 渲染 ResourceList (无分页)
}
else {
  // 全部: 默认走 image grid (数量最多, 也最常用)
  // 或保持当前 listAll 网格?  → Q3 拍
}
```

### 2.2 新组件

#### `app/resources/_components/ResourceImageGrid.tsx` (client, 仅 image)

```
┌──────┬──────┬──────┬──────┐
│ IMG  │ IMG  │ IMG  │ IMG  │  ← grid-cols-2 / 3 / 4 (沿用旧断点)
│ alt  │ alt  │ alt  │ alt  │
│ 1.2MB│ 800KB│ 2.4MB│ 340KB│
│ 7-28 │ 7-27 │ 7-25 │ 7-24 │
└──────┴──────┴──────┴──────┘
```

- 完全复用现有 ResourceGrid 中 image 分支的卡片实现 (不重写)
- 加 `Pagination` 组件放在 grid 下方

#### `app/resources/_components/ResourceList.tsx` (client, document + audio)

```
┌──────────────────────────────────────────────────────────┐
│ 🎵  youkei_ep05_script.md                  45.2 KB  · md  │
│     短剧《上坤×YouKei》第 5 集脚本     7-28  [⬇ 下载]    │
├──────────────────────────────────────────────────────────┤
│ 📄  黑色月报-2026Q3.pdf                    1.8 MB  · pdf │
│     季度项目进度报告                   7-26  [👁 预览]    │
├──────────────────────────────────────────────────────────┤
│ 🎵  ambient-loop-v3.mp3                   8.4 MB  · mp3 │
│     环境音轨 v3                        7-22  [▶ 试听]    │
└──────────────────────────────────────────────────────────┘
```

每行结构 (沿用 `/posts` 列表 + `/admin/resources` 表格风格):

```
<div className="flex items-center gap-4 border-b border-border bg-bg-card px-4 py-3 hover:bg-bg-muted transition">
  <div className="text-2xl">{icon}</div>            {/* 32px fixed width */}
  <div className="min-w-0 flex-1">
    <div className="truncate text-sm font-medium">{filename}</div>
    <div className="truncate text-xs text-fg-muted">{alt ?? mime}</div>
  </div>
  <div className="hidden sm:block text-xs text-fg-muted w-20 text-right">{size}</div>
  <div className="hidden md:block text-xs text-fg-muted w-24 text-right">{date}</div>
  <div className="flex gap-2">
    [试听/预览 button] + [下载 button]
  </div>
</div>
```

**操作按钮区分** (避免 audio document 都一个样):

| category | 主操作 | 次操作 |
|---|---|---|
| `image` | 卡片点击 → `ResourcePreviewModal` (已有, 不动) | — |
| `document` | 点击文件名 → `ResourcePreviewModal` | ⬇ 下载 |
| `audio` | ▶ 试听 (内嵌 `<audio controls>` 行内展开) | ⬇ 下载 |

audio 试听方案 A (推荐, 黑视角): 点击行 → 行下方就地展开 `<audio controls src={url}>` 横条, 不开 modal (modal 太大, audio 一行内就能播)

#### `app/resources/_components/Pagination.tsx` (server, 纯渲染)

```
                    «  ‹  1  2  3  …  7  ›  »
```

- 简单数字按钮 + 首/末/上下页
- 当前页禁用 + accent 高亮
- URL = `?type=image&page=N` (Link 拼接, 不引第三方分页库)
- 总页数 = `Math.ceil(total / PAGE_SIZE)`
- 总数 ≤ 1 页时不渲染

### 2.3 UI 一致性承诺 (✅ 老板硬要求)

**全部沿用现有资产, 0 新设计**:

| 项 | 沿用自 |
|---|---|
| 颜色变量 | `bg-bg` `bg-bg-card` `bg-bg-muted` `text-fg` `text-fg-muted` `border-border` `accent` (globals.css §:root / .dark) |
| 圆角 | `rounded-lg` (沿用 /posts / admin) |
| Hover | `hover:bg-bg-muted` 或 `hover:border-accent/40` |
| 间距 | `px-6 py-12` (顶层容器) / `p-4 / p-5` (卡片) |
| 字体 | 沿用 globals.css body font (无独立 font-family) |
| Tabs | 沿用 `app/resources/page.tsx` 现有 tabs (active=`bg-accent text-white`, inactive=`border border-border bg-bg`) |
| 搜索框 | 沿用现有 form (input `border border-border bg-bg px-3 py-1.5`) |

**绝对不做**:
- ❌ 引入 shadcn / Radix / 任何新组件库
- ❌ 引入新色板或新 CSS 变量
- ❌ 引入新字体
- ❌ 改 globals.css
- ❌ 改 layout.tsx / Nav.tsx / Footer.tsx

---

## 3. 老板决策清单 (Q1–Q4, 拍完才动代码)

### Q1 — 图片每页多少张?

| 候选 | 说明 | 黑推荐 |
|---|---|---|
| **A: 12 张** (4×3, 桌面 4 列 3 行) | 与 /posts 2 列卡密度一致, 单页不滚太多 | ⭐ |
| B: 8 张 (4×2) | 滚动最少, 但视觉空 | — |
| C: 16 张 (4×4) | 单页信息密, 但要滚 | — |
| D: 24 张 (4×6) | 信息密度过大, 不推荐 | — |

**默认 12** (代码先按 12 写, 老板拍后不改代码)。

### Q2 — audio/document 列表要不要分页?

| 候选 | 说明 | 黑推荐 |
|---|---|---|
| **A: 不分页, 全量展示** (上限 200) | audio/document 数量本身少 (推算 < 50), 全量展示更直观 | ⭐ |
| B: 50/页 分页 | 与 image 一致, 但当前数量用不上 | — |
| C: 100/页 分页 | 同上 | — |

**默认 A**。若老板实际数量 > 100, 后期再加 limit + 分页不迟。

### Q3 — "全部" tab 默认走什么 layout?

| 候选 | 说明 | 黑推荐 |
|---|---|---|
| **A: 跳到 image 分页网格** (推荐) | image 数量最多, 最常用; "全部" 实际只剩 image 体感 | ⭐ |
| B: 维持当前 listAll 网格 (三类混合) | 老行为, 但体感割裂 (image 是图, 其它是 emoji icon) | — |
| C: "全部" = 三块独立 section (image grid + document list + audio list 顺序展示) | 信息最全, 但单页过长 | — |

**默认 A** (URL `/resources` 直接等价 `/resources?type=image`)。

### Q4 — 列表行展示哪些字段?

| 候选 | 字段 | 黑推荐 |
|---|---|---|
| **A: 标准 5 字段** | icon + filename + (alt / mime) + size + date + 试听/下载 | ⭐ |
| B: 极简 3 字段 | icon + filename + 下载按钮 | — |
| C: 全字段 | + width/height + uploaded_at timestamp + storage_type | 信息过载, 不推荐 |

**默认 A**:
- `< md`: icon + filename + 下载按钮 (3 项)
- `md+`: 加 size + date (5 项)
- mobile 不显示 size/date (空间不够, 看老板截图测)

---

## 4. 任务拆解 (老板拍完 Q1–Q4 后启动)

### P0 — Schema / Repo (0 改, 复用现成)

- 0 commit: `mediaRepo.listByCategory({ category, limit, offset })` 已支持 limit/offset, 不动

### P1 — `ResourceList.tsx` 新建 (audio + document 共用) (~1.5h)

| 文件 | 操作 |
|---|---|
| `app/resources/_components/ResourceList.tsx` | 新建 (client) — 列表行渲染 + audio 行内 `<audio>` 展开 |
| `app/resources/_components/ResourceList.test.tsx` | 单测 (3 用例: 渲染 / 点击展开 / 下载按钮) |

### P2 — `Pagination.tsx` 新建 (~1h)

| 文件 | 操作 |
|---|---|
| `app/resources/_components/Pagination.tsx` | 新建 (server) — `« ‹ 1 2 3 › »` 数字按钮 |
| `app/resources/_components/Pagination.test.tsx` | 单测 (3 用例: 边界 / 当前页 / 总数 ≤ 1 不渲染) |

### P3 — `page.tsx` 改版 (~1.5h)

| 文件 | 操作 |
|---|---|
| `app/resources/page.tsx` | 改 — 加 type/page searchParams; 按 type 走分支渲染; image 走 `ResourceImageGrid` + `Pagination`; document/audio 走 `ResourceList` |
| `app/resources/_components/ResourceImageGrid.tsx` | 新建 (client) — 沿用 ResourceGrid 中 image 分支卡片 (不改卡片, 只换名字/拆出) |
| `tests/e2e/resources-page.spec.ts` | e2e 新建 — 3 类切换 + 分页 + audio 试听展开 + 下载按钮 |
| `tests/integration/resources-page.test.mts` | 集成 — 4 用例: image 第 2 页 / document 全量 / audio 全量 / 默认 image |

### P4 — 自验 (~30min)

```bash
pnpm test:unit              # 单测
pnpm test:integration       # 集成
pnpm test:e2e:resources     # e2e (新)
pnpm typecheck && pnpm lint
curl -s http://localhost:3000/resources?type=image\&page=1 | grep -E 'data-testid|page='
```

---

## 5. 风险 & 黑视角防爆雷

| 风险 | 缓解 |
|---|---|
| 公开端 SSR 渲染 + 分页 URL 直跳 | `searchParams.page` 严格 parseInt 兜底 (NaN → 1) |
| audio 行内 `<audio>` 展开同时多开 | `useState<activeId>` 只存一个, 点同一行收起 |
| audio 试听不暂停上一首 | `onPlay` 暂停其它 `<audio>` (event delegation) |
| 列表 mobile 横向溢出 | size/date `hidden sm:block`, 单文件 32 字符截断 |
| "全部" tab 改名 (跳 image) 引老用户 URL 404 | `?type=` 兼容, 旧 `?q=` 搜索仍保留旧 grid 形态 |
| 计数删除回潮 | preview modal 不动, 不加计数, 不加种子, 不加 dedup — 严守 v0.35 老板决策 |
| audio document 数量 > 200 | 上限 200, 超出截断 + footer 提示"仅展示前 200, 搜索请用 ?q=" |
| dev server cache 老 page.tsx | `export const dynamic = "force-dynamic"` (已有) 保留 |

---

## 6. 不做的事 (强约束)

- ❌ **不引入新组件库** (shadcn/Radix/MUI 全禁)
- ❌ **不引入新色板 / 新 CSS 变量**
- ❌ **不改 globals.css / layout.tsx / Nav.tsx / Footer.tsx**
- ❌ **不加任何计数 / 种子 / 透明访客 / dedup** (v0.35 教训: 3 轮失败删库)
- ❌ **不改 admin 资源页** (admin 维持原 grid + 表格混合, 不动)
- ❌ **不改 ResourcePreviewModal** (图片点开预览已好用, 不动)
- ❌ **不引入新 npm 依赖**
- ❌ **不改 database schema**

---

## 7. 验收 (老板拍 Q 后启动, 验收标准)

- [ ] `pnpm test:unit` 全过 (含新 Pagination / ResourceList 单测)
- [ ] `pnpm test:integration` 全过 (含新 resources-page.test.mts)
- [ ] `pnpm test:e2e:resources` 3 类切换 + 分页 + audio 试听 全过
- [ ] `pnpm typecheck && pnpm lint` clean
- [ ] dev server (port 3000) 跑通: 截图 `/resources` (默认 image grid) + `/resources?type=image&page=2` + `/resources?type=document` (列表) + `/resources?type=audio` (列表, 点行展开 audio)
- [ ] 视觉与 `/posts` 列表 + `/admin/resources` 表格风格一致
- [ ] 老板截图确认 UI 与整体网页保持一致后, 再 commit + push

---

## 8. 推送计划

```bash
cd /root/.openclaw/workspace/projects/obsidian-journal

# 1. 老板拍 Q1-Q4 后, 按上面 P1-P3 动代码
git add app/resources/_components/{ResourceList,ResourceImageGrid,Pagination}.tsx \
        app/resources/page.tsx \
        app/resources/_components/ResourceList.test.tsx \
        app/resources/_components/Pagination.test.tsx \
        tests/integration/resources-page.test.mts \
        tests/e2e/resources-page.spec.ts

git commit -m "feat(phase5): v0.42 资源库 UI 改版 — 图片分页 + 音/文档列表"

git push origin main
```

公仓 commit: `blackclaw0318/obsidian-journal` (public)

---

## 9. 时间线

| 阶段 | 工作量 | 依赖 |
|---|---|---|
| 老板拍 Q1–Q4 | — | 老板 |
| P1 + P2 新组件 | 2.5h | Q1–Q4 |
| P3 page.tsx 改版 + e2e/集成 | 1.5h + 测试 30min | P1 + P2 |
| P4 自验 + dev 截图 | 30min | P3 |
| commit + push | 5min | P4 |
| **总计** | **0.5–1 天** | — |

---

**详细跨项目综合**: 读 `/root/.openclaw/workspace/memory/2026-07-28-0949-projects-dev-progress.md`
**当前项目状态**: 读 `/root/.openclaw/workspace/projects/obsidian-journal/docs/STATUS_2026_07_28.md`