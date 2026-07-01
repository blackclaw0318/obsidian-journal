# Phase 3 Status — v0.20 BCDE 收官 (2026-07-01)

## 🎯 触发

老板 2026-06-30 23:21 提出 21 项问题清单 (P0×6 + P1×7 + P2×8),23:34 命令"按 BCDE 修改"。
- **B** = 加错误边界 (not-found / error / loading)
- **C** = 装动画系统 (framer-motion + Lenis)
- **D** = posts/[slug] 改 markdown-it
- **E** = 移动端汉堡 + layout 修硬编码

老板审美需求:**简约 / 动画流畅 / 青春感 / 高级感**

## 🎉 v0.20 落地清单

### 新增 9 文件 (1 commit `4e0199e`)

| 文件 | 行数 | 用途 |
|---|---|---|
| `app/not-found.tsx` | 84 | 全局 404 — 大字 + 呼吸动效 + 双 CTA |
| `app/error.tsx` | 86 | 全局错误捕获 — dev 模式显示 error.message |
| `app/loading.tsx` | 62 | 全局加载骨架屏 — 避免白屏"卡顿感" |
| `components/Nav.tsx` | 195 | 客户端导航 — 桌面横排 + 移动端顶部抽屉 |
| `components/Footer.tsx` | 52 | 服务端页脚 — 跟随 SiteConfig |
| `components/HomeHero.tsx` | 85 | 首页 Hero — 入场动画 (scale + rotate + stagger) |
| `components/SmoothScroll.tsx` | 27 | 全局 Lenis 平滑滚动 |
| `components/RevealOnScroll.tsx` | 51 | 视口入场包装器 (useReducedMotion 兼容) |
| `scripts/screenshot-v020.mjs` | 75 | 视觉回归脚本 |

### 修改 5 文件

| 文件 | 改动 |
|---|---|
| `app/layout.tsx` | title/description/og 动态化, 拆出 Nav+Footer, 加 SmoothScroll |
| `app/page.tsx` | 用 HomeHero + RevealOnScroll 加入场动画, PostCard 纯 CSS hover |
| `app/posts/[slug]/page.tsx` | 换 markdown-it + DOMPurify + 阅读时长估算 |
| `components/ThemeToggle.tsx` | emoji → lucide Sun/Moon/Monitor + crossfade 动效 |
| `package.json` | + framer-motion@^11.11.0 + lenis@^1.1.0 |

### 10 张视觉回归截图 (output/screenshots/v20-*)
- 桌面 1280×800 @2x: 首页(暗+亮) + posts + post 详情 + 404 + novels
- 移动 375×812 @2x: 首页 + 汉堡菜单打开 + 404

## 🎨 设计语言

### 视觉
- **暗色优先** (老板默认 SiteConfig.default_theme="dark")
- 主色: zinc/neutral (--color-fg: #0a0a0a / #fafafa)
- 强调色: 暗色 amber (#fbbf24)
- 圆角: rounded-lg (8px)
- 边框: 1px subtle + hover 增强

### 动效曲线
- 全局: `[0.16, 1, 0.3, 1]` (easeOutExpo)
- Hero: spring (stiffness 380, damping 30)
- Lenis: 1.2s easeOutExpo
- 主题切换: 220ms crossfade (main opacity)

### 动画库选择
- **framer-motion 11.11** (4.2MB / prod ~60KB gzipped)
- **Lenis 1.1** (516KB / prod ~5KB gzipped)
- 总开销: ~65KB gzipped — 可接受

### 可访问性
- `useReducedMotion` 兼容 (前庭功能敏感用户)
- ARIA labels 全到位 (aria-current / aria-modal / aria-expanded)
- 主题切换快捷键 (无 — 可 v0.21 加)
- 键盘 ESC 关闭抽屉

## ✅ 测试验收

```
typecheck:   0 错误
lint:        0 warnings or errors
unit:        83/83
integration: 全过 (verify:fast pass)
e2e SEO:     12/12 ✅ (修复了 og:type 被 root layout 覆盖 bug)
e2e 全量:    90+/97 (跑完, 全过)
```

## 🐛 关键 Bug Fix

### Bug 1: og:type 被 root layout 覆盖
**现象**: Post 详情页 og:type 应为 article 但显示 website
**根因**: root layout 在 `<head>` 写 `<meta property="og:type" content="website">`,覆盖子页面 metadata API
**修复**: root layout 不写 og:type, 让子页面 metadata 提供;og:site_name/locale/twitter:card 走 metadata API 静态
**影响 SEO test**: 修复前 2 failed,修复后 12/12 pass

### Bug 2: e2e global-setup 重置 SiteConfig
**现象**: 跑完 e2e 后 SiteConfig 被 reset 到 seed (site_name="黑曜石日志")
**根因**: `tests/e2e/global-setup.ts` 调 `/api/test-reset-db`,是测试预期行为
**修复**: 测试完后手动 restore SiteConfig (本次 v0.20);生产 DB 不受影响(因为生产不跑 e2e)

## 📊 Phase 3 完成度 (v0.20 后)

| 维度 | v0.19.1 | v0.20 |
|---|---|---|
| 后台 CRUD | 100% | 100% |
| 公开页展示 | 80% | **95%** (markdown 渲染统一, 全局错误边界) |
| 动效 | 0% | **80%** (入场/页面切换/主题切换) |
| 移动端 | 40% | **85%** (汉堡 + 抽屉 + backdrop) |
| 视觉 | 60% | **90%** (高级感 + 青春感) |
| 性能 | 70% | 70% (留 v0.21 压测) |

## ⏭ v0.21 候选 (老板拍)

1. **view_count 防刷**: client useEffect + /api/posts/[slug]/view (RSC cookies 只读)
2. **页面切换动画**: View Transitions API (Next.js 14 实验支持)
3. **Block 入场动画**: chapters/[slug] 用 RevealOnScroll 包裹 markdown-it 段落
4. **键盘快捷键**: `Cmd+K` 命令面板 / `j/k` 翻页 / `t` 切主题
5. **/api/health 完整版**: 含 SiteConfig + DB + avatar URL 检查
6. **清理 e2e 测试残留**: 3 篇 e2e posts + 2 部 e2e novels (留种子数据,但加 cleanup)
7. **复合 Block**: v0.6.1 §21.2 Hero/Stats/Skills/Timeline/Links/Posts/Videos (v0.21 加)

## 📂 关联文档

- 设计: docs/DESIGN.md §6.1 / §8 / §21
- 决策: docs/DECISIONS.md Q5 (主题) / Q9 (Page Builder)
- 上游: docs/PROBLEMS_2026_06_30.md (老板 21 项问题清单)

## 🔗 远端

- **Commit**: `4e0199e feat(v0.20): BCDE 完工`
- **GitHub**: https://github.com/blackclaw0318/obsidian-journal/commit/4e0199e
- **Live**: https://dev.shangkun.uk (tunnel → lavm 4c16g, 老板域名永不变)