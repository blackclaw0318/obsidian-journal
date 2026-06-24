# Changelog

## v0.6.0 (2026-06-24) — Phase 1 骨架实现版 ⭐

### 🎉 首个可运行版本
- **Next.js 14 + TypeScript + Tailwind** 项目骨架
- **Prisma schema (14 model)** — v0.3 设计稿落地
- **SQLite WAL + 7 PRAGMA** — v0.4 部署方案
- **Block 类型注册表 (13 种)** — TypeScript 严格类型
- **首页 + 文章列表 + 文章详情 + 小说列表 + Admin 占位**
- **Seed 数据** — 1 admin + 1 siteConfig + 3 socials + 3 posts + 1 novel + 1 volume + 2 chapters + 1 video series + 1 video
- **测试基线** — Vitest (单元 + 集成) + Playwright (E2E)
- **Cloudflare Tunnel 一键拉起** — `npm run dev:tunnel`

### 📦 代码统计
| 项 | 数量 |
|---|---|
| 配置文件 | 11 (package.json, tsconfig, next.config.js, tailwind, postcss, vitest, playwright, .env*, .eslintrc, .prettierrc) |
| 源代码文件 | 11 (app/×6, lib/×2, prisma/×1, scripts/×1, components/×1) |
| 测试文件 | 3 (2 unit + 1 e2e) |
| 代码总行数 | ~1400 行 (含配置) |

### ✅ 决策落地
- Q1=A obsidian-journal
- Q3=B 百度真直接播 (SiteConfig.baiduPushEnabled = true)
- Q5=A 默认亮色主题 (SiteConfig.defaultTheme = 'light')
- Q9=B Page Builder 自由搭建 (Phase 3 实现, P1 占位)
- Q9b=默认禁 CustomHtml (SiteConfig.allowCustomHtml = false)
- Q10=独立 Worker 仓 (Phase 5 实现)
- Q11=A Novel 双层 (Novel + NovelVolume)
- Q12=A 默认支持 2c4g (DEPLOY_MODE=prod-4g)
- Q13=35/30/25/10 测试金字塔
- Q14=总 75% / 核心 90% 覆盖率门禁
- Q15=2% 视觉回归容差 (Playwright screenshot diff)
- Q16=Pre-push verify (CI/Phase 4 实现)

### 🧪 测试覆盖
- Unit: blocks 类型注册表 (3 case) + utils 工具 (5 case)
- E2E: 首页 (4 case) + 文章页 (2 case) + 小说页 (1 case) + Admin (1 case) = 8 case
- 集成测试: P1.6 补 (Prisma 查询)

### 🔧 一键命令
```bash
npm run db:reset     # 重置 + seed
npm run dev          # 本地开发
npm run verify       # 全量验证
npm run dev:tunnel   # 老板 Tunnel 访问
```

---

## v0.5.0 (2026-06-24) — 测试方案

### 📋 新增文档
- `docs/TESTING.md` (16KB) — 测试金字塔 4 层比例 35/30/25/10
- 工具栈: Vitest 2.1 + Playwright 1.49 + Prisma 5.22 + LHCI 0.14 + k6 0.50
- 决策项 Q13-Q16
- CI/自动化: simple-git-hooks pre-commit + pre-push verify

---

## v0.4.0 (2026-06-24) — 部署方案

### 📋 新增文档
- `docs/DEPLOY.md` — 三档部署模式
  - `dev` (4c16g 开发): PM2 fork / heap 4G / sharp=4
  - `prod-16g` (4c16g 生产): PM2 cluster=2 / heap 2G / WAL
  - `prod-4g` (2c4g 降级): PM2 fork / heap 1.5G / sharp=1 / swap 2GB 必备
- SQLite WAL + 7 PRAGMA 配置 (cache_size=64MB, mmap_size=256MB, busy_timeout=5s)
- 决策项 Q12

---

## v0.3.0 (2026-06-24) — 设计稿

### 📋 重大重写
- 14 model 数据模型 (新增 Novel / NovelVolume / Social / VideoSeries / MediaUsage)
- 13 Block 类型 (新增 Callout 替代 Marquee, Music 标 advanced)
- v0.3 §14.1 CustomHtml 双重开关 + DOMPurify
- v0.3 §22 Worker 独立仓规划 (Q10)
- v0.3 §23 view 计数防刷方案
- v0.3 §6.2 FTS5 同步降级 + Admin /admin/reindex
- 11 决策项 (Q1-Q11)

---

## v0.2.0 (2026-06-24) — 初版设计

### 📋 9 model + 13 Block

---

## v0.1.0 (2026-06-24) — 项目立项

- 创建 `blackclaw0318/obsidian-journal` 仓库 (public)
- 项目名 obsidian-journal (黑曜石日志)