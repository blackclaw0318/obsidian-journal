# v0.26.0 收官 — 复合 Block (v0.6.1 §21.2) P2-14 兑现

**日期**: 2026-07-02 19:55–20:15
**version**: 0.25.0 → 0.26.0
**触发**: 老板 19:55 命令"继续开发 B"
**P2-14 状态**: ⏳ → ✅ done

---

## 🎯 老板原话

> "继续开发 B"

兑现 v0.6.1 §21.2 设计的 7 种复合 Block,Page Builder 从"基础块编辑器"升级为"组件化页面搭建"。

---

## 📦 v0.25 → v0.26 新增 (8 文件 +889 -45)

### 1. 7 个复合 Block 类型 (`lib/blocks/index.ts`)

```ts
export type BlockType = ... | "hero" | "stats" | "skills" | "timeline" | "links" | "posts" | "videos";
```

7 个新 Block 数据结构 (flat 字段,与现有 13 种保持一致,不引入嵌套 data):

| Block | 字段 | 说明 |
|---|---|---|
| `HeroBlock` | title, subtitle?, ctaText?, ctaUrl?, bgImage? | 主页招呼区 |
| `StatsBlock` | items[{ label, value, suffix? }], columns? | 数字网格 (2/3/4 列) |
| `SkillsBlock` | items[{ name, level }] | 技能进度条 (level 0-100) |
| `TimelineBlock` | items[{ date, title, content? }] | 时间线 |
| `LinksBlock` | links[{ name, url, desc?, icon? }], columns? | 外链卡片网格 |
| `PostsBlock` | category?, limit?, sortBy? | **自动拉取** published posts |
| `VideosBlock` | limit? | **自动拉取** published videos |

**类型注册**:
- `BLOCK_TYPES`: 13 → **20** 项
- `COMPOSITE_BLOCK_TYPES`: 新增 7 项数组
- `BlockType` union: 13 → 20

### 2. 7 个 Block 渲染器 (`lib/blocks/render.tsx`)

每个复合 Block 一个 View 组件 + 在 `BlockRenderer` switch 中加 case:

- **HeroBlockView** — 标题 + 副标题 + CTA 按钮 + 可选背景图
- **StatsBlockView** — 数字网格 (4 种列数)
- **SkillsBlockView** — name + 水平进度条 (level 自动 0-100 裁剪)
- **TimelineBlockView** — 日期 + 标题 + 可选内容
- **LinksBlockView** — 卡片网格 (2/3 列), 含 hover 高亮
- **PostsBlockView** — 客户端 useEffect + fetch, 显示文章列表卡片
- **VideosBlockView** — 客户端 useEffect + fetch, 显示视频网格

**设计要点**:
- PostsBlock/VideosBlock 走 `/api/public/*`, 不依赖 admin auth
- 数据加载时显示 loading, 失败时显示错误信息
- 空数据时显示友好提示 "[Posts] 暂无文章"

### 3. Block Palette 加 7 项 (`lib/page-builder/palette.ts`)

新分类 `"composite"` (中文 label: "复合 (一键组合)"):

```
- hero        Hero 招呼区   标题 + 副标题 + CTA 按钮
- stats       数据统计      数字网格 (2/3/4 列)
- skills      技能进度条    name + 水平进度条 (level 0-100)
- timeline    时间线        按日期排列的事件列表
- links       链接卡片      外链卡片网格 (name/url/desc)
- posts       最新文章      自动拉取 published posts
- videos      最新视频      自动拉取 published videos
```

`BLOCK_PALETTE`: 13 → **20** 项
`BASIC_PALETTE` (排除 advanced): 11 → **18** 项 (复合默认可见,非 advanced)

### 4. PageBuilder 集成 (`PageBuilder.tsx`)

`createBlock()` switch 加 7 个 case,每个工厂返回合理的默认值:

```ts
case "hero":        return { id, type, theme, title: "你的大标题", subtitle: "一句话介绍", ctaText: "了解更多", ctaUrl: "/" };
case "stats":       return { id, type, theme, items: [{ label: "项目数", value: 12, suffix: "+" }, ...], columns: 4 };
case "skills":      return { id, type, theme, items: [{ name: "TypeScript", level: 90 }, ...] };
// ... 等等
```

### 5. 7 个 Inspector 表单 (`BlockInspector.tsx`)

| Inspector | 字段 |
|---|---|
| HeroInspector | title / subtitle / ctaText / ctaUrl / bgImage |
| StatsInspector | columns + items 数组 (可增删, 含 value/suffix) |
| SkillsInspector | items 数组 (可增删, level 自动 0-100 裁剪) |
| TimelineInspector | items 数组 (date + title + content) |
| LinksInspector | columns + links 数组 (name + url + desc) |
| PostsInspector | category (全部/tech/life) + limit (1-50) + sortBy (new/hot) |
| VideosInspector | limit (1-50) |

所有数组 Inspector 支持 +/− 增删单条 (实时反映到 canvas)。

### 6. 2 个公开端 API

| 端点 | 用途 |
|---|---|
| `GET /api/public/posts?category=&limit=&sortBy=` | PostsBlock 数据源 |
| `GET /api/public/videos?limit=` | VideosBlock 数据源 |

**返回字段最小化** (不暴露 author_email 等),**不需 auth**,仅返回 published 内容。

### 7. 1 个新模板 ("作品展示页")

8 套模板 (7 + showcase),showcase 演示 5 个复合 Block 组合:
- Hero (招呼)
- Stats (4 个数字)
- Skills (4 个技能)
- Timeline (3 个事件)
- Posts (自动拉取)

`showcase` 是**复合 Block 最佳实践演示**,用户点开即看到"原来可以这样搭"。

### 8. 测试更新

| 文件 | 变化 |
|---|---|
| `tests/unit/blocks-render.test.tsx` | BLOCK_TYPES 13→20, +9 复合 Block 渲染测试 |
| `tests/unit/blocks.test.ts` | 13→20 |
| `tests/unit/page-builder.test.ts` | palette/tempaltes 数量更新 + showcase 模板断言 + composite category |
| `tests/e2e/admin-page-builder-composite.spec.ts` | **新建** 6 个测试 |

---

## ✅ 测试验收

| 项 | v0.25 | v0.26 | delta |
|---|---|---|---|
| typecheck | 0 | **0** | — |
| lint | 0 | **0** | — |
| unit | 128/128 | **140/140** | +12 (9 复合 render + 3 palette) |
| integration | 12 套件全过 | 12 套件全过 | — |
| e2e | 110/110 + 2 skip | **116/116 + 2 skip** | +6 (composite) |
| visual | 4/4 | 4/4 | — (本次 UI 元素多但视觉测试无 diff) |
| **总计** | **254/254 + 2 skip** | **270/270 + 2 skip** | **+16** |

```
v0.20 BCDE:    90 e2e + 83 unit = ~200
v0.21.x:       92 e2e + 119 unit = ~210
v0.22:         99 e2e + 119 unit = ~218
v0.23:        100 e2e + 119 unit = ~219
v0.24:        105 e2e + 119 unit + 10 集成 = 234
v0.25:        110 e2e + 128 unit + 10 集成 = 254
v0.26:        116 e2e + 140 unit + 10 集成 = 270 ✨
```

---

## 🐛 修复的 3 个 typecheck/lint 坑 (顺手)

1. **PostCategory 重复定义** — `lib/types.ts` 已定义,直接在 `lib/blocks/index.ts` 用 `import type` 而非重新 `export type`
2. **LinksBlock columns 类型** — `columns?: 2 | 3` 写成 `2 | 3 | 4` 多余,删除 `grid-cols-1` 分支
3. **getByText strict mode** — `"TS"` 命中 3 个元素 (span + Dnd a11y), 改 `{ exact: true }`

---

## 📁 改动文件 (8 个, +889 -45)

| 文件 | 变化 |
|---|---|
| `lib/blocks/index.ts` | +93 行 — 7 个 Block 类型 + COMPOSITE_BLOCK_TYPES + BlockType union 扩展 |
| `lib/blocks/render.tsx` | +196 行 — 7 个 View 组件 + dispatch |
| `lib/page-builder/palette.ts` | +14 行 — 7 个 palette 项 + composite category |
| `lib/page-builder/types.ts` | +1 行 — category union 扩展 |
| `app/admin/(admin)/pages/[id]/builder/_components/PageBuilder.tsx` | +10 行 — createBlock 7 case |
| `app/admin/(admin)/pages/[id]/builder/_components/BlockInspector.tsx` | +170 行 — 7 个 Inspector + INSPECTORS 注册 |
| `app/api/public/posts/route.ts` | **新建** 60 行 |
| `app/api/public/videos/route.ts` | **新建** 36 行 |
| `lib/page-builder/templates.ts` | +14 行 — showcase 模板 |
| `tests/unit/blocks-render.test.tsx` | +9 测试 (复合 Block 渲染) |
| `tests/unit/blocks.test.ts` | +1 行 — 13→20 |
| `tests/unit/page-builder.test.ts` | +5 测试 (palette/tempaltes 适配) |
| `tests/e2e/admin-page-builder-composite.spec.ts` | **新建** 175 行 |
| `package.json` | version 0.25.0 → 0.26.0 |

---

## 🎨 用户体验变化

| 之前 | 现在 |
|---|---|
| 想做"主页招呼区" → 拖 1 heading + 1 text + 1 button = 3 个 block 拼 | 拖 1 个 Hero block → 填 5 个字段搞定 |
| 想做"项目数据" → 拖 6 个 callout 或 text,手动对齐 | 拖 1 个 Stats block → 数组 items 自动 4 列网格 |
| 想做"友情链接" → 拖 6 个 link card(text + image), 一个个调 | 拖 1 个 Links block → 数组 items 自动卡片 |
| 想做"最新文章" → 手动写 list + 链接,文章变了不更新 | 拖 1 个 Posts block → **自动** 拉取 published 文章,新文章自动出现 |

---

## 📝 工程教训 (强制入 MEMORY)

1. ⚠️ **PostCategory 等共享类型已在 lib/types.ts 定义** — `lib/blocks/index.ts` 用 `import type` 而非重新 `export type`,避免重复定义
2. ⚠️ **复合 Block 走公开端 API (`/api/public/*`)** — 不依赖 admin auth,公开页 + 后台预览都用同一接口
3. ⚠️ **数组型 Inspector 的 level 越界** — UI 渲染时 `Math.max(0, Math.min(100, ...))` 裁剪,即使 Inspector 输入 200 也只显示 100%
4. ⚠️ **dynamic data 的 loading/error 状态** — PostsBlock/VideosBlock 必须在 useEffect 内捕获 error,显示 `加载失败: ...`,避免白屏
5. ✅ **useEffect + fetch 是最简单的"客户端拉取"模式** — 不需要 SWR/React Query 等额外依赖,够用即可
6. ✅ **category union type 集中** — `lib/page-builder/types.ts` 改了 1 处,所有 palette 自动获得新 category 支持
7. ✅ **新增 palette category 时同步更新 CATEGORY_LABELS** — 否则分组渲染时缺失中文 label

---

## ⏭ 下一项 (等老板拍)

| 任务 | 黑推荐 |
|---|---|
| **C. 撤销/重做** (P2-15, Cmd+Z) — Page Builder 内 | 1d, ⭐ 用户最常用,补完 Page Builder UX |
| D. 2c4g 压测 (Q20) | 等 Q20 拍板, 1d |
| E. Mobile/暗色细节 (P2-18) | 1d |
| F. FTS5 中文分词 (P2-19) | 1d |
| G. favicon/og_image 上传 (P2-20/21) | 0.5d |
| H. Worker 独立仓 (P2-16) | **需老板建仓决策**, 1d |
| I. 长期打磨 (Phase 4 性能/部署) | 5-10d |