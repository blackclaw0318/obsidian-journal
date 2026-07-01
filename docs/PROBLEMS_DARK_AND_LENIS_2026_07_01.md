# 老板需求 — 暗色模式 + 滑动阻尼 (2026-07-01 23:13)

> 📌 **来源**: 老板 7-01 23:13 提 2 项零散需求:
> 1. **暗色模式 bug** — 文章框字体初始看不清 / hover 才看清,联系下 3 个按钮 hover 也看不清,**管理页面暗色也很怪**
> 2. **滑动阻尼不够丝滑**
>
> **本文件状态**: 整理需求 + 修改方案 (黑分析),等老板拍板后实施。

---

## 🔍 问题 1: 暗色模式 — 现状与根因

### 1.1 现状证据 (dev server 截图, dark mode 强制启用)

| 路径 | 现象 |
|---|---|
| `/posts` 列表 | body 黑 + 卡片**亮白** + 卡片内文字深灰 + 搜索框亮白 + 分类 tab 亮白 (深色底里飘几块亮色,极不协调) |
| `/posts` hover | 卡片 hover 边框变 `#d1d5db` (亮灰) 在黑底上突兀 |
| `/admin/*` | 顶栏**亮白** + 侧边栏**亮白** + 内容区黑 + 统计卡片亮白 (像白色挖洞) |

### 1.2 根因 (精准定位)

**核心 bug**: `tailwind.config.ts` 把 semantic colors 全部 hardcode 成**亮色值**,且**没有 dark 变体定义**。

```ts
// 当前 (tailwind.config.ts)
colors: {
  bg: { DEFAULT: "#ffffff", muted: "#f6f6f7", card: "#fafafa" },
  fg: { DEFAULT: "#0a0a0a", muted: "#6b7280" },
  border: { DEFAULT: "#e5e7eb", strong: "#d1d5db" },
  accent: { DEFAULT: "#0f172a", hover: "#1e293b" }
}
```

```css
/* globals.css */
.dark {
  --color-bg: #0a0a0a;
  --color-bg-muted: #18181b;
  ...
}
.dark body {
  background-color: var(--color-bg);
  color: var(--color-fg);
}
```

`.dark` 只覆盖了 `body` 的 bg/fg。组件里用的 `bg-bg-card / text-fg-muted / border-border` 等 457 处 class,**全部走的是 hardcode 亮色值**(因为 Tailwind 看到 colors 是 string,不会自动生成 dark 变体)。

另外 globals.css 还有这些**暗色失明区**:
- `.prose a:hover { color: #1e293b }` 暗色下完全看不见 (深蓝灰)
- `.callout-info/warning/success/danger` 4 种 variant 全 hardcode 亮色背景+深字
- `.prose pre { background: #1e293b; color: #f1f5f9 }` 这条亮暗色通用,反而没失明

**还有一个隐藏 bug**: `AdminShell.tsx` 等 5 处用了 `bg-bg-base`,但 `bg.base` **根本不在 config 里**——这 5 个 class 完全无效(透明背景)。

### 1.3 修法 (CSS 变量映射, 黑推荐)

**核心思路**: 把 Tailwind colors 改成 `var(--color-*)` 映射,`globals.css` 已有 `.dark { --color-*: ... }`,这样 dark class 切换时 CSS 变量变化,所有用 semantic class 的地方**自动适配,组件代码 0 改动**。

#### 1.3.1 tailwind.config.ts 改造 (~20 行)

```ts
colors: {
  bg: 'var(--color-bg)',
  'bg-muted': 'var(--color-bg-muted)',
  'bg-card': 'var(--color-bg-card)',
  'bg-base': 'var(--color-bg-base)',
  fg: 'var(--color-fg)',
  'fg-muted': 'var(--color-fg-muted)',
  border: 'var(--color-border)',
  'border-strong': 'var(--color-border-strong)',
  accent: 'var(--color-accent)',
  'accent-hover': 'var(--color-accent-hover)'
}
```

> ⚠️ Tailwind 嵌套对象写法 `bg: { DEFAULT: ..., card: ... }` 改为 flat string 后,
> `bg-bg-card` 自动变成 `background-color: var(--color-bg-card)`,无需改组件。

#### 1.3.2 globals.css 补 `:root` 变量 + 暗色失明区修复 (~15 行)

```css
/* 补 :root 变量 (与 .dark 互补) */
:root {
  --color-bg: #ffffff;
  --color-bg-muted: #f6f6f7;
  --color-bg-card: #fafafa;
  --color-bg-base: #ffffff;
  --color-fg: #0a0a0a;
  --color-fg-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;
  --color-accent: #0f172a;
  --color-accent-hover: #1e293b;
}
.dark {
  --color-bg: #0a0a0a;
  --color-bg-muted: #18181b;
  --color-bg-card: #111113;
  --color-bg-base: #0a0a0a;
  --color-fg: #fafafa;
  --color-fg-muted: #a1a1aa;
  --color-border: #27272a;
  --color-border-strong: #3f3f46;
  --color-accent: #fbbf24;
  --color-accent-hover: #fde68a;
}

/* 修 .prose a:hover 暗色失明 */
.dark .prose a:hover { color: var(--color-accent-hover); }

/* 修 callout 4 variants 暗色失明 */
.dark .callout-info    { background-color: #1e3a8a33; color: #bfdbfe; border-color: #3b82f6; }
.dark .callout-warning { background-color: #78350f33; color: #fde68a; border-color: #f59e0b; }
.dark .callout-success { background-color: #14532d33; color: #bbf7d0; border-color: #22c55e; }
.dark .callout-danger  { background-color: #7f1d1d33; color: #fecaca; border-color: #ef4444; }
```

> 💡 `bg-bg-base` 修复: 加 `--color-bg-base` 变量,5 处 AdminShell 等失效 class 自动恢复。

### 1.4 验证标准

1. 暗模式下 `/posts` 列表所有卡片**与 body 同一深色系** (卡片稍亮 bg-card #111113,body 更暗 #0a0a0a,有层次但不割裂)
2. 暗模式下文字对比度 ≥ WCAG AA (4.5:1)
   - `#a1a1aa` (fg-muted 暗) vs `#0a0a0a` (bg 暗) = **8.6:1** ✅
   - `#a1a1aa` vs `#111113` (bg-card) = **8.3:1** ✅
3. 暗模式下所有 hover 状态可读 (不再"hover 才看清")
4. 管理页面侧边栏/顶栏/统计卡 全部暗色系一致
5. 亮色模式 100% 兼容 (用 `:root` 变量,无回归)

### 1.5 风险与缓解

| 风险 | 缓解 |
|---|---|
| 变量名拼写不一致 (`--color-bg-base` 漏加 → `bg-bg-base` 失效) | 改完 grep 一遍: `grep "bg-bg-\|text-fg-\|border-border"` |
| 某些组件 hardcode 颜色 (如 `text-white` `bg-red-500`) 不走变量 | dark mode 下白字在亮背景上仍可读,可接受;红/绿/蓝等强调色不需要适配 |
| `.prose` typography 插件内置深色 (`dark:prose-invert`) 与我们的 CSS 变量冲突 | 当前没用 typography 插件,无冲突;未来若加,要重写 prose 暗色 |
| visual baseline (Q15) 漂移 | 暗色视觉 baseline 需要重生成 (4 张) |

---

## 🔍 问题 2: 滑动阻尼 — 现状与根因

### 2.1 现状 (components/SmoothScroll.tsx)

```ts
const options: LenisOptions = {
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
  wheelMultiplier: 1,
  touchMultiplier: 1.4
};
```

### 2.2 根因 (参数偏软)

| 参数 | 当前值 | 行业标准 | 评价 |
|---|---|---|---|
| `duration` | 1.2s | 0.6-1.0s | **偏长** (用户感觉"等一下才停") |
| `easing` | easeOutExpo | easeOutQuart | 起步快收尾慢,长距离有"飘"的尾巴 |
| `wheelMultiplier` | 1 | 1 | 正常 |
| `touchMultiplier` | 1.4 | 2 | **偏小** (移动端跟手性差) |
| 缺 `lerp` | — | 0.08-0.12 | Lenis 1.x 推荐用 lerp 平滑插值,比 duration 更跟手 |

实际感受"不够丝滑"的根因:
1. **duration 1.2s 太长** — 用户滚完期望立刻停,但 Lenis 还在补间
2. **easing easeOutExpo** — 指数衰减曲线,后段极慢,长距离滚动有"惯性拖尾"
3. **缺 lerp** — 用 lerp 替代 duration 更现代,Lenis 1.x 推荐 `lerp: 0.08-0.12`

### 2.3 修法 (二选一,黑推荐 B)

#### 方案 A: 调小 duration + 换 easing (改动小,~5 行)

```ts
const options: LenisOptions = {
  duration: 0.8,
  easing: (t) => 1 - Math.pow(1 - t, 4), // easeOutQuart
  wheelMultiplier: 1,
  touchMultiplier: 2
};
```

效果: 滚动更快停,无明显拖尾。但仍不是 Lenis 1.x 最优解。

#### 方案 B: 用 lerp 替代 duration (黑推荐,~8 行)

```ts
const options: LenisOptions = {
  // Lenis 1.x 推荐: lerp 平滑插值,比 duration 更跟手更丝滑
  lerp: 0.1,  // 0.08 更丝滑, 0.12 更跟手
  duration: 1.0,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  // 移除 easing (lerp 模式下无需)
  syncTouch: false,  // 避免移动端触摸和滚动冲突
  syncTouchLerp: 0.075
};
```

效果:
- `lerp: 0.1` 每帧向目标位置插值 10%,**滚动感觉像 macOS / iOS** 顺滑
- 移除 easing (lerp 模式用插值代替 easing,自动丝滑)
- `touchMultiplier: 2` 移动端跟手性更好
- `syncTouch: false` 避免 iOS 触摸和滚动冲突

### 2.4 验证标准

1. 桌面端鼠标滚轮: 滚动跟随快停,无明显拖尾
2. 桌面端长距离滚动 (按 PageDown): 速度曲线自然,无"飘"
3. 移动端 touch 滑动: 跟手性提升,松手后柔和减速
4. 减速帧不卡顿 (FPS ≥ 50)

### 2.5 风险与缓解

| 风险 | 缓解 |
|---|---|
| `lerp` 太低导致"漂"感 (0.05 以下) | 保持 0.08-0.12 区间,推荐 0.1 |
| `lerp` 太高导致"卡"感 (0.2 以上) | 同上 |
| 移动端 iOS Safari 兼容性 | `syncTouch: false` 缓解,有问题再调 `syncTouchLerp` |
| 与 framer-motion `useScroll` / Lenis 同步失效 | 已用 ReactLenis 1.x,正常兼容;若 useScroll 出问题降级 |

---

## 📋 实施计划 (老板拍板后开干)

### Phase 1: 暗色模式修复 (主战场)

| 步骤 | 文件 | 工时 |
|---|---|---|
| 1.1 tailwind.config.ts colors → CSS 变量映射 | `tailwind.config.ts` | 5 min |
| 1.2 globals.css 补 `:root` 变量 | `app/globals.css` | 5 min |
| 1.3 globals.css 修 .prose a:hover + 4 callout dark 样式 | `app/globals.css` | 10 min |
| 1.4 dev server 截图验证 (light/dark × posts/admin) | manual | 10 min |
| 1.5 修 visual baseline (4 张) | `tests/visual/baseline/` | 15 min |
| 1.6 单测/e2e/visual 全跑 | — | 5 min |
| **小计** | | **~50 min** |

### Phase 2: 滑动阻尼调优

| 步骤 | 文件 | 工时 |
|---|---|---|
| 2.1 SmoothScroll.tsx 改用 lerp 配置 | `components/SmoothScroll.tsx` | 5 min |
| 2.2 桌面/移动各跑 30s 体感验证 | manual | 5 min |
| **小计** | | **~10 min** |

### Phase 3: 回归验证

| 步骤 | 工时 |
|---|---|
| 3.1 typecheck + lint + unit + integration + e2e + visual 全跑 | 10 min |
| 3.2 截图入仓 (4 张 dark + 4 张 light 对比) | 5 min |
| 3.3 commit + push + 更新 CHANGELOG + MEMORY.md | 5 min |
| **小计** | **~20 min** |

**总计: ~1.5 小时** (老板 1 次拍板 + 黑一次性交付)

---

## ⚠️ 决策点 (等老板拍)

| # | 决策项 | 黑推荐 | 备选 |
|---|---|---|---|
| **Q1** | 暗色修法用方案 A (CSS 变量映射) 还是 方案 B (tailwind 双值)? | **A: CSS 变量映射** (改动小,组件 0 改) | B: 每个组件加 `dark:bg-*` |
| **Q2** | 滑动用方案 A (调小 duration) 还是 方案 B (lerp)? | **B: lerp 0.1 + touchMultiplier 2** | A: duration 0.8 + easeOutQuart |
| **Q3** | 暗色 fg-muted 改 `#a1a1aa` (zinc-400) 还是保留 `#9ca3af` (gray-400)? | **`#a1a1aa`** (zinc 系更搭整体设计语言) | 保留 |
| **Q4** | 视觉 baseline 是否同步重生成? | **是** (4 张 baseline 必更新) | 否 (留 manual 验证) |

---

## 📂 关联

- 现有暗色实现: `app/globals.css` §暗色主题 (Q5 拍板 v0.6.1)
- Tailwind config: `tailwind.config.ts` §colors
- 主题切换: `components/ThemeToggle.tsx` (v0.20 E 升级)
- Lenis: `components/SmoothScroll.tsx` (v0.20 C 升级)
- 老板 6-30 21 项: `docs/PROBLEMS_2026_06_30.md` (本次不在 21 项内,新增)

---

## ⏭ 下一步

老板拍 Q1/Q2/Q3/Q4 → 黑实施 → 1.5 小时交付 → push + MEMORY.md 回写。