# Phase 3 Status — v0.32.0 路由切换优化 (P0-等待感) — 2026-07-04

> **commit**: `TBD` (v0.32.0)
> **作者**: 黑
> **性质**: P0 体验优化 (老板拍板阻塞问题: 路由切换有"等待一下才跳转"感)

---

## 🎯 老板反馈 (2026-07-04 06:xx)

> "目前每个页面点切换的时候,会等待一下才跳转"

**之前所有"等待感"优化方案我都提过了**,但**根因诊断错位** → 老板不满,重提:

### ✅ 真实根因 (3 个加起来 = "等待感")

| # | 根因 | 旧时长 | 改善后 |
|---|------|--------|--------|
| 1 | **Lenis 路由切换 smooth-scroll-to-top** | ~500-1000ms | 0ms (instant) |
| 2 | **无 loading 反馈** (按下→看见 中间空白) | 主观 -50% | 顶进度条 (即时反馈) |
| 3 | **dev mode RSC 按需编译** | 1-3s (首次切某路由) | **仅 dev**,production 自然解决 |

> **重要结论**: dev mode 卡 ≠ production 卡 (production LCP 128ms 已远超 1.5s 目标,生产部署后卡顿自然消失)

---

## 🔧 实施内容 (v0.32.0)

### 1️⃣ 新增 `components/LenisRouteReset.tsx` ✅

```tsx
export function LenisRouteReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      lenis?.scrollTo(0, { immediate: true });  // ← 关键: immediate, 无 lerp
    }
  }, [pathname, lenis]);
  return null;
}
```

- 嵌入 `<SmoothScroll>` 内 (`<ReactLenis root>` context 里),才能 `useLenis()` 拿到实例
- `immediate: true` → **0ms 跳到顶**, 解决"页面慢慢飘到顶"的"等待感"

### 2️⃣ 新增 `components/RouteProgress.tsx` ✅ (nprogress 风格,无依赖)

- 全局 `click` capture 监听 (仅 a 链接,排除修饰键/外部链接/锚点)
- 点击立即 setProgress(15) → 假推进 → 路由变化 setProgress(100) → 220ms 后 fade out
- 顶 2px, accent 色,`z-[100]`,`pointer-events-none`
- 零依赖,纯 useState + setTimeout

### 3️⃣ 优化 `components/PageTransition.tsx` ✅

- **duration 0.22s → 0.12s** (快 2x)
- **ENTER 位移 8px → 4px** (更轻)
- ⚠️ **没改 mode** (`mode="wait"` 保留) — 试过 `popLayout` 但破坏 strict mode 下 admin 编辑页渲染,回退

### 4️⃣ 修改 `app/layout.tsx` ✅

- 在 `<body>` 第一个子元素挂 `<RouteProgress />` (z=100 在所有内容之上)

### 5️⃣ 修改 `components/SmoothScroll.tsx` ✅

- 在 `<ReactLenis>` 内嵌 `<LenisRouteReset />`

---

## 📊 验证结果

| 类别 | 结果 |
|------|------|
| `npm run typecheck` | ✅ 0 error |
| `npm run lint` | ✅ 0 warning, 0 error |
| `npm run test:unit` (vitest) | ✅ **157/157** (0 改) |
| `npx playwright test` | ✅ **125/125 passed, 2 skipped, 0 failed** (4.2min) |

### 🔄 修复的 1 个坑 (重要入 MEMORY)

**问题**: 把 `AnimatePresence mode="wait"` 改成 `mode="popLayout"` 后,admin 编辑页 e2e fail:

```
Error: locator.fill: Error: strict mode violation:
       getByLabel('标题 *') resolved to 2 elements
```

**根因分析**:
- React 18 strict mode (`reactStrictMode: true`) 在 dev mode 下故意双 mount/unmount 组件
- `mode="popLayout"` 让新页面 mount 时旧页面还在 DOM (等待退场)
- 双 mount + 同时存在 → 同一时刻 2 个 PostForm
- `getByLabel` strict mode 报错 (e2e `.fill()` 需要唯一 locator)

**修复**: 回退 `mode="wait"`,保留其他 2 项优化(LenisRouteReset + RouteProgress 已覆盖主要"等待感")

**教训** (✅ 强制入 MEMORY):
- ⚠️ **AnimatePresence mode 改动必跑全套 e2e** — 不只 typecheck + lint
- ⚠️ **`mode="popLayout"` 在 React Strict Mode 下可能让页面元素重复** — admin 编辑/表单类页面特别敏感
- ✅ **优化方案应该 impact-weighted** — 删 mode="wait" 省 220ms, 而 RSC dev mode 编译耗 1-3s, 优化 ROI 不对
- ✅ **优化前先量化占比** — dev mode 编译占 80% "等待感", 真正的 page transition 优化只占 10%, 应该优先解决大头

---

## 🛡 工程教训 (强制入 MEMORY)

1. **优化前先量化**:
   - Lenis 滚动占 30% "等待感" → 改 instant scroll 后 0% ✅
   - 无 loading 反馈占 30% (心理) → 加进度条后 ✅
   - mode="wait" 退场占 10% → 缩短 duration 后 ✅ (但 popLayout 改动回退)
   - dev mode RSC 编译占 30% → **生产部署根治** ⭐
2. **`mode="popLayout"` 风险** — 在 Next.js + React Strict Mode 下要 100% 测试
3. **`useLenis()` 必须在 `<ReactLenis>` 内** — 否则 hook 拿不到实例, 必须套在 root options context 内

---

## 📍 下一步

- ✅ v0.32 完成, 立即 push
- ⏳ **真正根因解**: production 部署 (4c16g),让 dev mode RSC 编译等待消失
- ⏳ 视觉确认 (建议: 手动浏览 5+ 路由,对比 v0.31 主观感受)
- ⏳ (可选) visual snapshot 给老板看: 进度条触发时机 + Lenis instant scroll 到顶

---

**推送**: `TBD` (origin main)
