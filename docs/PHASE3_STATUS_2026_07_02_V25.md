# v0.25.0 收官 — Page Builder 模板化 v1 (Q18 拍板兑现)

**日期**: 2026-07-02 18:32–18:55
**version**: 0.24.0 → 0.25.0
**触发**: 老板 18:32 命令"完成 A" (5-6 套模板)
**Q18 拍板**: 模板化 v1 ✅ 兑现

---

## 🎯 老板原话

> "完成 A" (5-6 套模板)

按黑推荐**模板化 v1** 开干 (搭乐高版) — 5-6 套预设模板 + 空白选项,用户打开空页面不再迷茫。

---

## 📦 v0.24 → v0.25 新增 (5 文件 +762 -3)

### 1. 模板定义 `lib/page-builder/templates.ts` (180 行)

**6 套预设模板 + 1 套空白 = 7 项**,严守 v0.6.1 §21.4 模板化 v1 + §21.2 复合 Block 留 v0.26+ 实施:

| # | 模板 ID | 名称 | 描述 | block 数 |
|---|---|---|---|---|
| 1 | `blank` | 📄 空白页 | 从零开始,自己拖积木 | 0 |
| 2 | `about` | 👤 关于我 | heading + 几段文字 + 座右铭引用 | 5 |
| 3 | `links` | 🔗 友情链接 | heading + callout 提示 + 列表 | 4 |
| 4 | `home` | 🏠 首页 Hero | callout 招呼 + divider + heading + 行动号召 | 5 |
| 5 | `archive` | 📚 归档索引 | heading + divider + table 表格 | 5 |
| 6 | `project` | 🛠️ 项目展示 | heading + text + code + callout | 6 |
| 7 | `reading` | 📖 长文阅读 | heading + 段落 + 引用 + divider | 7 |

**设计原则**:
- 所有 block 用 `tpl_<key>_<n>` 静态 ID (避免与 `createBlock` 的 `b_*` 时间戳冲突)
- 严守 v0.6.1 §6.1 13 种基础 Block,**不引入新类型** (复合 Block 留 v0.26+)
- 文本占位用 "..." 或具体例子, 让用户看到"应该填什么"
- block 数控制在 0-7 之间, 用户上手后可任意加/删/改

**API 函数**:
- `TEMPLATES`: 静态数组
- `getTemplate(id)`: 返回深拷贝 (避免引用共享)
- `findTemplate(id)`: 返回原对象 (性能友好)

### 2. 模板选择 UI `TemplateGallery.tsx` (100 行)

全屏覆盖 UI (fixed inset-0 + z-50 + backdrop-blur),6 张卡片网格:

- 顶部: 标题 + 提示 (已有内容时显示"会覆盖现有 blocks"警告)
- 中部: 6 张模板卡片,每张含 icon + 名称 + 描述 + block 数
- 底部: 提示"选完模板后,你仍然可以拖拽 / 编辑 / 删除任何 block"
- 已有 blocks 时: 点击触发 `window.confirm` 二次确认

### 3. PageBuilder 集成 (修改)

`PageBuilder.tsx` 加 2 个 state:
- `showGallery`: 是否显示模板选择
- `initialized`: 是否完成首次加载 (避免初次渲染抖动)

**触发逻辑**:
- 初始 blocks 为空 → 自动显示 gallery
- 顶部新增"🎨 模板"按钮 → 重新打开 gallery
- 选完模板 → `load(template.blocks)` + 退出 gallery
- Gallery 关闭按钮: 用 `onClose` 回调,允许用户空白退出

### 4. 单元测试 (page-builder.test.ts +9)

新增 `page-builder/templates` describe 块,9 个测试:
- 7 项模板完整
- 必含 7 个具体 ID
- 每套有 name/description/icon/blockCount
- block 数量 0-7
- block id 用 `tpl_*` 前缀
- `blank` blocks 为空
- `getTemplate` 深拷贝
- 找不到返回 null
- serialize 往返不丢字段

### 5. E2E 测试 (admin-page-builder-templates.spec.ts)

新建 5 个测试,验证:
1. 空白页进入 builder → 自动显示 gallery
2. 选「关于我」→ 5 blocks 加载到 canvas + 退出 gallery
3. 选「空白页」→ 0 blocks
4. 顶部「🎨 模板」按钮重开 gallery
5. 已有 blocks 时重选 → confirm 弹窗 (dialog handler accept)

### 6. e2e cleanup 复用

e2e 测完用 `q=tpl-test` 模糊查询 + DELETE API 清理,跟 admin-posts/novels 套路一致。

---

## 🎨 用户体验变化

| 之前 | 现在 |
|---|---|
| 老板打开空白 page builder → 一片空白,不知道从哪开始 → 拖一个 heading 试水 → 摸 5 分钟才上手 | 打开空白 page builder → 7 套模板卡片陈列 → 点「关于我」→ 自动填好 heading + 几段 + 引用 → 改文字就行 |

| 之前 (Q18 未拍板, 模板化 v1 缺失) | 现在 (Q18 兑现) |
|---|---|
| 只能从零拖积木 | 5-6 套场景模板 + 1 套空白可选 |
| 不知道有几种 Block | 模板演示常用 Block 组合,边用边学 |

---

## ✅ 测试验收

| 项 | v0.24 | v0.25 | delta |
|---|---|---|---|
| typecheck | 0 | **0** | — |
| lint | 0 | **0** | — |
| unit | 119/119 | **128/128** | +9 (templates) |
| integration | 12 套件全过 | 12 套件全过 | — |
| e2e | 105/105 + 2 skip | **110/110 + 2 skip** | +5 (page-builder-templates) |
| visual | 4/4 | 4/4 | — (本次无视觉变化,仅添 UI 元素) |
| **总计** | **240/240 + 2 skip** | **254/254 + 2 skip** | **+14** |

```
v0.20 BCDE:    90 e2e + 83 unit = ~200
v0.21.x:       92 e2e + 119 unit = ~210
v0.22:         99 e2e + 119 unit = ~218
v0.23:        100 e2e + 119 unit = ~219
v0.24:        105 e2e + 119 unit + 10 集成 = 234
v0.25:        110 e2e + 128 unit + 10 集成 = 254 ✨
```

---

## 📁 改动文件 (5 个, +762 -3)

| 文件 | 变化 |
|---|---|
| `lib/page-builder/templates.ts` | **新建** 180 行 — 6 套模板 + blank + 2 个查找函数 |
| `app/admin/(admin)/pages/[id]/builder/_components/TemplateGallery.tsx` | **新建** 100 行 — 模板选择 UI |
| `app/admin/(admin)/pages/[id]/builder/_components/PageBuilder.tsx` | +28 行 — showGallery/initialized state + onSelectTemplate + 顶部"🎨 模板"按钮 + 条件渲染 Gallery |
| `tests/unit/page-builder.test.ts` | +9 测试 (templates describe 块) |
| `tests/e2e/admin-page-builder-templates.spec.ts` | **新建** 175 行 — 5 e2e 测试 |
| `package.json` | version 0.24.0 → 0.25.0 |

---

## 🐛 修复的 2 个测试坑 (顺手)

| 坑 | 修法 |
|---|---|
| `ADMIN_PASSWORD = "***"` 占位符忘记替换 | 改 `admin123` (seed 默认密码) |
| Page API 返回 `body.page` 不是 `body.item` | 改 `body.page.id` |

---

## 🔗 远端

- 远端 commit 数: 27 → **28**
- 待 push: 本次 v0.25.0 commit

## ⏭ Q18 进度: 1/1 收口 🎉

```
✅ Q18 Page Builder v1 范围 (模板化 5-6 套)  (v0.25.0)
```

---

## 📝 工程教训 (强制入 MEMORY)

1. ⚠️ **新建 spec 文件时 ADMIN_PASSWORD 容易写成 `***` 占位符** — 必须用 `admin123` (seed 默认密码),这是 e2e 跑不起来的 #1 坑
2. ⚠️ **API 响应字段名不统一**: POST /api/admin/pages 返回 `body.page`, GET 列表可能返回 `body.items`,新写测试前先 curl 一下确认
3. ⚠️ **Playwright strict mode**: `getByText("空白页")` 命中 2 元素时 strict 模式会失败,UI 含"模板名"和"页面描述"含相同字串时要换 `getByRole("button", { name: ... })`
4. ✅ **深拷贝模板数据** (getTemplate 返回 JSON.parse(JSON.stringify(...))) — 避免后续修改 blocks 污染其他应用同一模板的页面
5. ✅ **static id 用前缀** (`tpl_about_1`) — 避免与 createBlock 的 `b_*` 时间戳冲突
6. ✅ **覆盖前 confirm** — 非空页面选模板时弹 confirm,防止误操作丢失内容

---

## ⏭ 下一项 (等老板拍 Q19 + Q20)

| 任务 | 状态 | 黑推荐 |
|---|---|---|
| B. 复合 Block (P2-14) — Hero/Stats/Skills/Timeline/Links/Posts/Videos | v0.6.1 §21.2 兑现 | ⭐ 强烈推荐 (用户最常用) |
| D. 2c4g 压测 (Q20) | 等 Q20 拍板 | 1 天 |
| E. Mobile/暗色细节 (P2-18) | v0.22 大修过, 剩小细节 | 1 天 |
| F. FTS5 中文分词 (P2-19) | 取决于内容规模 | 1 天 |
| G. favicon/og_image 上传 (P2-20/21) | 字段已有, 缺入口 | 0.5 天 |
| H. Worker 独立仓 (P2-16) | **需老板建仓决策** | 1 天 |
| I. 长期打磨 (Phase 4) | 性能/部署 | 5-10 天 |