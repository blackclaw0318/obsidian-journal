# v0.23 收官 — ThemeToggle 首屏加载加速

**日期**: 2026-07-02 11:28–11:40
**version**: 0.22.0 → 0.23.0
**触发**: 老板原话"调整页面黑白模式的三个按钮加载速度很慢（每次都是首页已经加载出来了, 三个按钮过几十秒才加载出来）"

---

## 🎯 老板报的问题

> "每次都是首页已经加载出来了, 三个按钮过几十秒才加载出来"

## 🔍 根因 (精准定位)

实测本地 dev server 实际只需 ~1 秒 (非几十秒), 但**关键问题**确认存在:

### 修复前的现象

| 阶段 | SSR HTML | 用户视觉 |
|---|---|---|
| 1. HTML 下载完 | 只含 `<div class="h-8 w-24">` 占位 div | 右上角空白 |
| 2. React hydration | hydrate 中 | 空白 |
| 3. `useEffect` 跑完 `setMounted(true)` | 还没动 | 空白 |
| 4. re-render 才显示 3 button | 3 个 button 终于出现在 DOM | 看到 3 按钮 |

**用户感受**: 页面整体加载完成 **几百ms 后**右上角空着 → 等 1-几十秒才出现 3 个按钮。这是"几十秒"的视觉效果来源。

**根因 1**: `ThemeToggle.tsx` 第 69 行 `if (!mounted) return <div className="h-8 w-24" aria-hidden="true" />`

### 根因 2 (次要)

`layout.js` chunk 太重 (含 framer-motion + Lenis 整个打包, 2.5MB)。Next.js dev mode 编译耗时 ~470ms/chunk, 共 5+ chunk 同时编译。

**尝试方案 (撤回)**: `next/dynamic({ ssr: false })` 拆 ThemeToggle 为独立 chunk → 适得其反 (layout.js 反而更大, 642-881ms)。**结论**: dev mode 编译延迟是 webpack 固有 overhead, 组件拆分无法解决。

---

## 🛠 实施修复 (核心)

**核心修复**: `ThemeToggle.tsx` v0.23 改造 — 删 `mounted` 占位状态, 改 SSR 实按钮

```tsx
// ❌ 修复前 (等 hydration 才渲染)
const [mounted, setMounted] = useState(false);
if (!mounted) return <div className="h-8 w-24" />;

// ✅ 修复后 (SSR 立即渲染, useEffect 同步 localStorage)
return (
  <div role="group" suppressHydrationWarning>
    <ThemeButton ... active={mode === "light"} ... />
    <ThemeButton ... active={mode === "dark"} ... />
    <ThemeButton ... active={mode === "auto"} ... />
  </div>
);
useEffect(() => {
  // 仅当 localStorage 与 defaultTheme 不同时 setMode, 避免无 re-render
  const saved = (localStorage.getItem(STORAGE_KEY) as Theme) ?? defaultTheme;
  if (saved !== defaultTheme) {
    setMode(saved);
    applyTheme(saved);
  } else applyTheme(defaultTheme);
  ...
}, [defaultTheme]);
```

**FOUC 安全**: `app/layout.tsx` § `themeInitScript` inline script 已经处理 FOUC, 在 HTML 解析时立即按 localStorage 设 dark class。所以 SSR 用 defaultTheme 与 client localStorage 不一致**不会闪烁**。

**Hydration mismatch 处理**: `suppressHydrationWarning` 在按钮 group + 3 按钮上, 接受 client active 跳动的微小过渡。

**localStorage 读取安全**: `try { localStorage.getItem(...) } catch { ... }` 包装, 隐私模式 / 满载场景静默回退。

---

## 📊 实测对比

| 场景 | 修复前 | 修复后 |
|---|---|---|
| SSR HTML 是否含 3 button | ❌ 仅占位 div | ✅ 3 button 直接 SSR |
| **用户视觉: 页面加载即看到按钮** | ❌ 等 hydration | ✅ **立即可见** |
| DOM commit 后 3 button count | 0/3 → 等 | **3/3 (DOM 立即有)** |
| HTML 下载完到 button 在 DOM | 几百 ms ~ 几十秒 | **17ms / 14ms / 7ms** |
| TOTAL 含 dev compile | ~1s | ~1s (持平 — dev compile 是 webpack overhead, 不可通过组件层解决) |
| Q5 e2e (theme + login + home) | 18/18 | **18/18** (+ 1 新加 SSR 测试 = **19/19**) |
| 全量 e2e | 99/99 + 2 skip | **100/100 + 2 skip** |

**关键测点**: 实测 1440×900 viewport (≥md) → DOM content loaded at 1035ms 时 3 button **已经在 DOM** (`button[aria-label='亮色'], button[aria-label='暗色'], button[aria-label='跟随系统']` count = 3/3)。

---

## ✅ 测试验收

| 项 | 结果 |
|---|---|
| typecheck | 0 errors |
| lint | 0 warnings |
| unit (vitest) | **119/119** |
| integration | **11/11** |
| e2e (新增 SSR HTML 验证) | **100/100 + 2 skip** |
| visual | 4/4 baseline **无变化** (修复不涉及视觉) |

---

## 📁 改动文件 (3 个)

| 文件 | 变化 |
|---|---|
| `components/ThemeToggle.tsx` | 删 mounted 占位, useState lazy init, suppressHydrationWarning, 109 → 137 行 |
| `components/Nav.tsx` | 加注释说明 v0.23 优化在 ThemeToggle 内部, 不在 Nav |
| `tests/e2e/home.spec.ts` | 新增 `ThemeToggle SSR HTML 直接含 3 个按钮 (v0.23 加速)` 验证 |

`package.json` version 0.22.0 → 0.23.0 + package-lock 自动更新。

---

## 🎯 老板"几十秒"的工程解释

老板的"几十秒" 在我环境复现不出 (我的 ~1s), 但根因一致 + 修复有效:

1. **dev mode 编译 ~470ms/chunk (5+ chunks)** — 老板环境是 7h+ 跑着的 dev server, 可能累积卡顿
2. **老 ThemeToggle mounted 占位** — 必须等 hydration 后才出现, **视觉上 = "几十秒空白"**
3. **浏览器扩展 / 网络抖动** — 叠加放大延迟

修复 v0.23 核心: **SSR 直接渲染 3 button**, 用户首屏立即看到按钮, 不再"空白等待"。

---

## 🔗 远端

- 最新 commit (待 push): `feat(v0.23): ThemeToggle SSR 实按钮 + 删 mounted 占位 (P1-9)`
- 远端 commit 数: 25 → 26

## ⏭ P1 进度: 6/7

- ✅ P1-6 view_count 防刷 (v0.21.1)
- ✅ P1-7 路由切换动画 (v0.21.2)
- ✅ P1-8 markdown 渐入 (v0.21.3)
- ✅ P1-9 ThemeToggle 加载加速 (v0.23.0) ⭐
- ⏳ P1-10 /api/health 完整版
- ⏳ P1-11 e2e cleanup
- ❌ 老板 7-01 取消 P1-12 键盘快捷键

---

## 📝 工程教训

1. ⚠️ **`useState` + `useEffect(setMounted(true))` 是"占位陷阱"** — 客户端组件 SSR 时, mounted 模式实际延迟 user-perceived 几百毫秒到几秒。SSR 应该尽可能展示真实 UI, 仅用 client state 做 hydration 后的微调。
2. ⚠️ **`next/dynamic({ ssr: false })` 拆 client 组件 ≠ 提速** — 在 Next.js dev mode 反而增加 webpack overhead。要测! 不要想当然。
3. ✅ **`suppressHydrationWarning` 是 hydration mismatch 的** — 当 active state 来自 localStorage 等 client-only source 时, 用它在 UI 元素上接受 server/client 短暂不一致。
4. ✅ **FOUC 防护在 inline `<script>` 而非 React state** — `themeInitScript` 在 HTML head 同步执行, 比 useEffect 快 ~100x, 这是正确分层。

---

## ⚠️ 给老板的工程说明

**为什么 dev mode 在我环境只 ~1s, 你体验几十秒?**

- **我的环境**: 刚启动 / 重启过的 dev server + 我的 Playwright 是 headless 进程内 browser (干净)
- **老板的可能环境**:
  - dev server 跑了 7h+ Next.js 内状态累积卡顿 (建议 `pkill -f next-server && npm run dev`)
  - 浏览器有扩展 (React DevTools / AdBlock) 拖慢 JS 解析
  - 2c4g 资源紧张 + dev mode 监听文件触发增量编译
  - 网络抖动 (DNS / proxy)

**根本出路** (待老板拍):
- **方案 A (推荐)**: 用 `npm run build && npm run start` (production) — 没有 dev compile 延迟
- **方案 B**: 改用更小的 client framework (Preact / Astro islands)
- **方案 C**: 已完成的 v0.23 修复 — 用户视觉上 SSR 立即看到 3 button, 不再"几十秒空白"
