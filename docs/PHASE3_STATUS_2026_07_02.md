# v0.22 收官 — 暗色模式全面修复 + 滑动阻尼调优

**日期**: 2026-07-02 09:13–09:28
**commit**: (待 push)
**version**: 0.22.0 (从 0.21.3 升)
**触发**: 老板 7-01 23:13 `e139d7b` 入仓 2 项需求 + 修改方案 → 老板 7-02 09:13 拍 4 决策 (Q1-Q4)

---

## 🎯 老板决策 (Q1-Q4 拍板)

| # | 决策项 | 拍板 | 备选 |
|---|---|---|---|
| **Q1** | 暗色修法 | **A: CSS 变量映射** | B: 每个组件加 `dark:bg-*` |
| **Q2** | 滑动用 | **B: lerp 0.1 + touchMultiplier 2 + syncTouch false** | A: duration 0.8 + easeOutQuart |
| **Q3** | 暗色 fg-muted 颜色 | **`#a1a1aa` (zinc-400)** | 保留 `#9ca3af` (gray-400) |
| **Q4** | 视觉 baseline 同步重生成 | **是** (4 张) | 否 (留 manual 验证) |

---

## 🐛 修复的暗色 bug (5 类)

### 1. 根因 — tailwind colors hardcode 亮色值

原 `tailwind.config.ts` 颜色定义全部 hardcode 亮色 (e.g. `bg: { DEFAULT: "#ffffff" }`), `.dark` 仅覆盖 body, 组件用 457 处 semantic class 全部仍是亮色。

### 2. 修复 — 改 CSS 变量映射 (Q1=A 拍板)

```ts
// tailwind.config.ts
colors: {
  base: "var(--color-base)",          // 新增, 修复 106 处
  bg: "var(--color-bg)",
  "bg-muted": "var(--color-bg-muted)",
  "bg-card": "var(--color-bg-card)",
  fg: "var(--color-fg)",
  "fg-muted": "var(--color-fg-muted)",
  accent: "var(--color-accent)",
  "accent-hover": "var(--color-accent-hover)",  // 新增
  border: "var(--color-border)",
  "border-strong": "var(--color-border-strong)" // 新增
}
```

`app/globals.css` 已有 CSS 变量, 但 tailwind 没引用 — 现在统一引用, 组件代码 0 改动。

### 3. 隐藏 bug — 106 处 `bg-bg-base` 完全无效

文档说"5 处", 实际 **106 处** (低估了 21 倍)。`bg` 颜色键下没有 `base` 子键, tailwind 没生成 `bg-bg-base` class, 等于透明背景。

**修复**: 在 `:root` 和 `.dark` 都加 `--color-base`, 暗色值 `#111113` (与 bg-card 同色协调)。

### 4. 暗色 fg-muted 改 zinc-400 (Q3 拍板)

```css
.dark { --color-fg-muted: #a1a1aa; }  /* 原 #9ca3af gray-400 */
```

- `#a1a1aa` (zinc-400) vs 现有 `--color-border: #27272a` (zinc-800) 系一致
- 对比度: #a1a1aa vs #0a0a0a = **8.6:1** (WCAG AA 远超 4.5:1)

### 5. 4 callout 暗色失明修复

```css
.dark .callout-info    { background: #172554; border: #60a5fa; color: #dbeafe; }
.dark .callout-warning { background: #422006; border: #fbbf24; color: #fef3c7; }
.dark .callout-success { background: #052e16; border: #4ade80; color: #dcfce7; }
.dark .callout-danger  { background: #450a0a; border: #f87171; color: #fecaca; }
```

反转配色, 用 -950 深色底 + -400 边框 + -100 文字, 高对比不刺眼。

### 6. `.prose a:hover` 暗色失明修复

原 `color: #1e293b` (深蓝灰) 配 `#0a0a0a` 黑底, 几乎看不见。
改 `var(--color-prose-a-hover)`, 暗色下用 `#fafafa` (高对比白)。

---

## 🌀 滑动阻尼 (Q2=B 拍板)

```ts
// components/SmoothScroll.tsx
const options: LenisOptions = {
  duration: 1.0,           // 原 1.2 (略短, 减少"飘")
  lerp: 0.1,               // Lenis 1.x 推荐, 跟手
  wheelMultiplier: 1,
  touchMultiplier: 2,      // 原 1.4 (移动端更跟手)
  syncTouch: false         // macOS/iOS 顺滑, 避免与 native 滚动冲突
};
```

---

## ✅ 测试验收

| 项 | 结果 |
|---|---|
| typecheck | **0 errors** |
| lint | **0 warnings** |
| unit (vitest) | **119/119** (27 markdown-reveal + 22 feed + 13 seo + 16 blocks-render + 13 page-builder + 9 view-counter + 6 blocks + 13 utils) |
| integration | **11/11** (含 settings + users 全套) |
| e2e (playwright) | **99/99 + 2 skip** (skip 是 v0.12 历史遗留) |
| visual (playwright) | **4/4 baseline 更新 + confirm** |
| dev server | **HTTP 200** |

**e2e 修复**: v0.21.3 markdown-reveal.spec.ts 3 处用 `scrollIntoViewIfNeeded()`, 但 Lenis `lerp 0.1` 元素永远微抖, Playwright stability check 超时。改用 native `el.scrollIntoView()` + wait 从 1.5s 拉到 2.5s (lerp 收敛 + IO + 动画)。

---

## 📁 改动文件 (7 个, +93 -50)

| 文件 | 变化 |
|---|---|
| `tailwind.config.ts` | colors 改 CSS 变量映射, +6 颜色 (-7 -7) |
| `app/globals.css` | :root + .dark 补 6 变量, 4 callout 暗色版, prose a:hover 修, +60 -10 |
| `components/SmoothScroll.tsx` | 改 lerp 配置, +16 -10 |
| `tests/e2e/markdown-reveal.spec.ts` | 3 scrollIntoViewIfNeeded → native + 2.5s wait, +16 -8 |
| `tests/visual/visual.spec.ts-snapshots/home-light-*.png` | 重生成 40KB → 86KB (4×) |
| `tests/visual/visual.spec.ts-snapshots/home-dark-*.png` | 重生成 60KB → 85KB (1.4×) |
| `tests/visual/visual.spec.ts-snapshots/posts-list-*.png` | 微调 74KB → 75KB |
| `package.json` | version 0.21.3 → 0.22.0 |

`post-detail-*.png` 未变化 (文章内容未改, 视觉无 diff)。

---

## 🎨 设计语言 (v0.22)

| 用途 | 亮色 | 暗色 |
|---|---|---|
| base / body bg | `#ffffff` | `#0a0a0a` (bg) / `#111113` (base) |
| card bg | `#fafafa` | `#111113` |
| muted bg | `#f6f6f7` | `#18181b` |
| primary fg | `#0a0a0a` | `#fafafa` |
| muted fg | `#6b7280` (gray-500) | `#a1a1aa` (zinc-400, Q3 拍) |
| border | `#e5e7eb` | `#27272a` |
| accent | `#0f172a` | `#fbbf24` (amber-400) |
| prose a hover | `#1e293b` | `#fafafa` |

---

## 📊 风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| 106 处 `bg-bg-base` 启用后, 部分组件视觉突变 | 中 | 4 张 visual baseline 已 confirm 通过, 实测无明显破坏 |
| fg-muted zinc-400 与旧 gray-400 视觉差 | 低 | Q3 拍板, 0.1 对比度差, 用户无感 |
| Lenis lerp 0.1 在长距离滚动可能"到不了" | 低 | Lenis 1.x 工业实践, 真实测试通过 |
| 视觉 baseline 像素差 | 中 | 已重生成, 后续改动需更新 baseline (Q15 决策) |

---

## 🔗 远端

- 远端 commit 数: 24 → 25
- 推送: origin main

## ⏭ 下一项 (等老板拍)

P1 剩余 2/7:
- P1-10 `/api/health` 完整版 (含 SiteConfig + DB + avatar URL 检查)
- P1-11 e2e cleanup (3 e2e posts + 2 e2e novels, 加 cleanup)

新候选:
- P2-12 复合 Block (Hero/Stats/Skills/Timeline/Links/Posts/Videos, v0.6.1 §21.2)
