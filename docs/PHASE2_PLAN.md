# Phase 2 实施计划 — v0.6.1 启动版

> 老板 2026-06-25 09:56 指令 "开 Phase 2", Q1-Q16 全拍板后立即启动。
>
> 详细决策: [DECISIONS.md](DECISIONS.md) · 设计稿: [DESIGN.md](DESIGN.md)

## 🎯 Phase 2 目标

**5 专栏详情页 + FTS5 全文搜索 + SEO + RSS** — 让博客内容丰满、可被搜到、可被订阅。

## 📋 子任务清单 + 时间预算

| # | 子任务 | 预计时长 | 验收 | 风险 |
|---|---|---|---|---|
| **2.1** | 5 专栏详情页 (Tech/Life/Novel/Video/Media) | 4-6h | 每专栏可访问 + 列表筛选 | 低 (Phase 1 模板已有) |
| **2.2** | FTS5 全文搜索 + Admin /admin/reindex | 3-4h | 搜索响应 < 100ms · 降级容错 | 中 (FTS5 中文分词) |
| **2.3** | SEO (sitemap.xml + robots.txt + Open Graph) | 2-3h | Lighthouse SEO ≥ 95 | 低 |
| **2.4** | RSS / Atom 订阅 (feed.xml) | 1-2h | feed validator 通过 | 低 |
| **2.5** | 测试加固 (Q13-Q16) | 2-3h | 覆盖率 ≥ 75% + e2e 全过 + pre-push verify | 中 |
| **2.6** | Worker 仓库 (Q3/Q7/Q10) | 2-3h | 独立仓 + Cloudflare Worker 跑通 | 中 (新建仓) |
| **2.7** | Phase 2 截图 + 文档 | 1-2h | 10+ 张新截图 + README 更新 | 低 |
| **合计** | | **15-23h** | | |

## 🚀 第一 milestone: Phase 2.1 (5 专栏详情页)

**预计: 4-6 小时, 1 个 commit + 1 张新截图**

### 验收标准

| 项 | 标准 |
|---|---|
| 5 专栏列表 | `/category/tech`, `/category/life`, `/category/novel`, `/category/video`, `/category/media` |
| 列表筛选 | 按 category 显示对应 posts |
| 详情页 | `/posts/[slug]` 已存在, 增强: 显示所属分类徽章 + 关联推荐 |
| E2E | 5 个专栏页访问测试全过 |
| 截图 | 5 张新专栏列表图入仓 |

### 实现要点

```typescript
// 新路由
app/category/[slug]/page.tsx   // 5 个专栏页
// 复用 Phase 1 组件
lib/repo.ts: postRepo.findByCategory(slug)
// 新数据查询
SELECT * FROM posts WHERE category = ? AND status = 'published' ORDER BY published_at DESC
```

### 黑推荐启动方式

老板说 `开 2.1` → 我立即:
1. 写 `app/category/[slug]/page.tsx`
2. 扩展 `lib/repo.ts` 加 `findByCategory` 方法
3. 加 `app/posts/page.tsx` 分类筛选 UI
4. e2e 加 5 个 case
5. 跑 verify + 截图 + commit + push
6. 报告

预计 1 个会话内完成 (4-6h 切分到 1-2h/单功能)。

## ⚠️ Phase 2 风险预案

| 风险 | 触发条件 | 应对 |
|---|---|---|
| FTS5 中文分词不准 | 搜索 "黑曜石日志" 召回率 < 80% | 引入 jieba 字典 + 触发黑推荐配置 |
| 详情页 SEO 弱 | Lighthouse SEO < 90 | 手工 OG/Twitter Card meta |
| Worker 仓部署失败 | Cloudflare Worker 配额超 | 降级到 Cloudflare Pages |
| 截图脚本崩溃 | Playwright binary 失配 | chrome CLI 备用 (已验证) |
| LLM 超时 | 单会话工具调用 > 30 次 | 单功能模式 + 每步回报 (当前策略) |

## 📊 Phase 2 完成定义 (DoD)

- [ ] 所有 7 个子任务通过验收
- [ ] Lighthouse 性能 ≥ 92 + 移动 ≥ 92 + SEO ≥ 95 + a11y ≥ 95
- [ ] 覆盖率: 总体 ≥ 75% + 核心 ≥ 90%
- [ ] E2E: 20+ case 全过
- [ ] 截图: 15+ 张入仓
- [ ] 文档: README + ROADMAP 更新到 v0.7
- [ ] GitHub 远端: Phase 2 所有 commit 推送

---

> 上次更新: 2026-06-25 09:57 · Phase 2 启动版 (Q1-Q16 全拍板)
