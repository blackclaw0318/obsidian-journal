# Obsidian Journal ⬛

> 个人博客平台 · 黑曜石日志
> 状态: **方案稿 (Phase 0)** — 老板审核中

## 这是什么

单站长个人博客, 极简黑白风, 大量微动态。
- 公开访客: 浏览文章/视频
- 站长 (登录后): 拖 MD 一键发布, 自定义页面

## 文档

**从 [`docs/DESIGN.md`](./docs/DESIGN.md) 开始读** — 一份文档看完整个项目。

| 文档 | 用途 |
|---|---|
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 总设计 (架构/技术栈/功能) |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 架构细节 (渲染策略/数据流/部署拓扑) |
| [`docs/TESTING.md`](./docs/TESTING.md) | **🆕 v0.5** 测试与可见性方案 (金字塔 + Tunnel + 阶段报告) |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | 路线图 (Phase 0-4) |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | 老板拍板项归档 |

## 技术栈 (一图)

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **SQLite**
- **Auth.js v5** + **bcrypt**
- **Framer Motion** + **Lenis** (动画)
- **Shiki** (代码高亮) + **gray-matter** (frontmatter) + **unified** (MD 编译)
- **pnpm** + **Vercel/自托管**

## 路线图

- **Phase 0** ✅ 立项 + 方案 (本阶段)
- **Phase 1** ⏳ 骨架 (Next.js + Auth + 首页)
- **Phase 2** ⏳ 内容展示 (5 专栏 + 详情)
- **Phase 3** ⏳ Admin (MD 上传 + 视频管理)
- **Phase 4** ⏳ 打磨 (性能 + 部署)

## 贡献

- **黑 (Hei)**: 架构/工程实现
- **老板 (上坤)**: 决策 + 内容

## 状态

🚧 暂停中 — 等老板审 12 决策 (Q1-Q12) + 测试方案 4 决策 (Q13-Q16)。
