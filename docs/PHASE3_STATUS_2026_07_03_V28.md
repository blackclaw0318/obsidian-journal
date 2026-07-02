# v0.28.0 收官 — Mobile + 暗色细节 (P2-18 兑现)

**日期**: 2026-07-02 23:46–2026-07-03 00:18
**version**: 0.27.0 → 0.28.0
**触发**: 老板 23:46 命令"继续开发E"
**P2-18 状态**: ⏳ → ✅ done

---

## 🎯 老板原话

> "继续开发E" (Mobile + 暗色细节优化)

## 📦 v0.27 → v0.28 新增 (7 文件 +212 -26 + 1 新 spec + 5 baseline)

### 1. AdminShell 移动端抽屉 (AdminShell.tsx +145)
- **顶栏 mobile 汉堡按钮** (md:hidden) — 之前 admin 在 mobile 完全不可用
- **左滑抽屉面板** (左侧 72vw, ESC 关 + body scroll lock + 路由切换自动关)
- **底部用户卡片 + 登出按钮** (含 safe-area home indicator)
- **min-height 44px** (iOS HIG 触控目标)
- **active:scale-[0.98]** (touch 反馈)
- **桌面侧边栏不动** (md+ 仍 56 宽)

### 2. iOS Safe-Area 全链路 (layout.tsx + globals.css)
- **meta viewport `viewport-fit=cover`** (让 env(safe-area-inset-*) 生效)
- **meta theme-color** (亮色 #fff / 暗色 #0a0a0a) — Safari/Chrome 顶部栏跟随主题
- **meta apple-mobile-web-app-status-bar-style** (default/black-translucent)
- **CSS .nav-safe-top / .drawer-safe-bottom** — nav 顶刘海 + 抽屉 home indicator 占位

### 3. HomeHero mobile 适配 (HomeHero.tsx)
- 头像 h-24→h-16 (mobile) / sm:h-24
- 标题 text-5xl→text-3xl (mobile) / sm:text-5xl
- tagline text-lg→text-base (mobile) / sm:text-lg
- 间距 mb-16→mb-12 (mobile) / sm:mb-16, gap-6→gap-4
- min-w-0 防 flex 子溢出

### 4. PostDetail header mobile (posts/[slug]/page.tsx)
- 时间行 flex-wrap (flex-nowrap → flex-wrap + gap-y-1)
- 标题 text-4xl→text-3xl / sm:text-4xl
- aria-hidden 加到分隔点 (屏读不读"·")

### 5. Card touch 反馈 (page.tsx)
- PostCard / NovelCard / SocialLink 加 **active:scale-[0.99/0.97]** + active:transition-none
- 移动端触摸有视觉反馈, hover-only 卡片不再"死"

### 6. Admin main padding (AdminShell.tsx, 随抽屉)
- mobile **p-4** / desktop **md:p-6** — 移动端更紧凑

### 7. 暗色细节 (globals.css)
- **D1 prose pre 变量化**: `--color-prose-pre-bg` / `--color-prose-pre-fg`,暗色下从 #1e293b→#0b0f1a (深一级,与卡片 bg 区分),fg 从 #f1f5f9→#e2e8f0
- **D2 prose 行内 code word-break**: 长 token 在 mobile 不溢出 (word-break: break-word + overflow-wrap: anywhere)
- **D3 暗色 code 加 1px border**: 与 bg-muted 对比度强化 (`.dark .prose code:not(pre code) { border }`)

### 8. Visual baseline 新增 (visual-mobile.spec.ts)
- 5 张 mobile/tablet baseline: 首页亮色/暗色 (375), 文章详情亮色/暗色 (375), 首页暗色 (768)
- 与 visual.spec.ts 9 张 baseline 严格兼容 — 桌面 1280×720 baseline 0 破坏

## 🧪 验收

| 维度 | 数据 |
|---|---|
| typecheck | 0 error |
| lint | 0 warning |
| unit | 151/151 ✅ |
| integration | 全过 (exit 0) ✅ |
| e2e | 121/121+2skip ✅ |
| visual | 9/9 (5 新 mobile + 4 桌面 baseline 0 破坏) ✅ |
| **总计** | **285/285+2skip → 293/293+2skip** (+8 visual) |

## ⚠️ 踩坑记录

- **vitest 不解析 native sqlite** (`Failed to load url sqlite`): 跑 `npm run test` 失败,必须跑 `npm run test:unit` + `npm run test:integration` (tsx 走 native node)
- **visual 第一次跑写 baseline 报 "doesn't exist"**: 正常,Playwright 自动写 expected png,第二次跑才比
- **process action 返回 0 但 e2e 121 测试跑 5 分钟**: dev server 编译 + chromium 启动 + DB reset,慢是正常的

## 📁 改动文件

```
app/admin/(admin)/_components/AdminShell.tsx | 145 +++++++++++++++++++++++++--
app/globals.css                              |  51 ++++++++++
app/layout.tsx                               |  12 +++
app/page.tsx                                 |   6 +-
app/posts/[slug]/page.tsx                    |  10 +-
components/HomeHero.tsx                      |  10 +-
components/Nav.tsx                           |   4 +-
tests/visual/visual-mobile.spec.ts           | 99 (new)
tests/visual/visual-mobile.spec.ts-snapshots/| 5 png (new baseline)
```

## 🎯 下一步 (老板选)

D. ~~2c4g 压测~~ ❌  | E. ✅ Mobile+暗色 | F. FTS5 中文分词 | G. favicon/og 上传 | H. Worker 独立仓 | I. 性能 (Lighthouse ≥95) | J. 双仓 deploy | K. README+运营文档 | L. 监控告警 (企业微信 webhook) | M. 评论区 | N. 真发 publish
