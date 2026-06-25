# 决策清单 (老板 30 秒速览)

> **黑给老板的最简版决策助手** — 详细版见 [DECISIONS.md](DECISIONS.md)
>
> **用法**: 看完直接回 `全默认` 或 `Q1=A, Q2=B, Q11=改双层...`

---

## ✅ 当前可推进的现状

**v0.6.1 Phase 1 跑通** (Next.js + node:sqlite + 19 单测 + 8 e2e 全过 + 5 张真渲染截图 + Cloudflare Tunnel 公网可访)

**Q1-Q16 决策清单已在下面,老板拍板即开 Phase 2**。

---

## 📋 全部 16 项决策 (Q1-Q16)

### 🔴 P0 — 阻塞 Phase 1 (现在)

| # | 决策项 | 黑推荐 (默认) | 你拍 |
|---|---|---|---|
| **Q1** | 项目名 | **`obsidian-journal`** (黑曜石日志) | |
| **Q3** | 百度网盘方案 | **B 真直接播** (Worker 解析) | |
| **Q11** | Novel 模型设计 | **Novel + NovelVolume 双层** (支持多卷长篇) | |

### 🟡 P1 — 阻塞 Phase 1-3

| # | 决策项 | 黑推荐 (默认) | 你拍 |
|---|---|---|---|
| **Q4** | 部署平台 | **自托管 VPS** (老板 lavm 4c16g 已用) | |
| **Q5** | 默认主题 | **默认亮色 + 暗色切换** | |
| **Q9** | Page Builder 模式 | **自由搭建** (无模板约束) | |
| **Q9b** | CustomHtml 开关 | **默认禁 + Settings 显式开** | |
| **Q10** | Worker 仓库结构 | **独立 repo** `obsidian-journal-baidu-proxy` | |

### 🟢 P2 — 不阻塞 (可后置)

| # | 决策项 | 黑推荐 (默认) | 你拍 |
|---|---|---|---|
| **Q2** | 评论区 | **不做** (P1 范围) | |
| **Q6** | 评论 LLM 自动回复 | **不做** (v2) | |
| **Q7** | Worker 部署 | **Cloudflare Worker** (免费) | |
| **Q8** | 媒体库域名 | **同站 /media/** | |

### 🆕 v0.5 测试方案 (Q13-Q16)

| # | 决策项 | 黑推荐 (默认) | 你拍 |
|---|---|---|---|
| **Q13** | 测试金字塔比例 | **35/30/25/10** (Unit/Integration/Component/E2E) | |
| **Q14** | 覆盖率门禁 | **总体 ≥ 75% + 核心 ≥ 90%** | |
| **Q15** | 视觉回归容差 | **像素差 ≤ 2%** | |
| **Q16** | Pre-push 必跑 verify | **必跑 (~5min)** | |

---

## 🎯 老板回复模板

### 模板 A: 全部默认 (最快)

> 全默认

含义: Q1-Q16 全采纳黑推荐,无修改。

### 模板 B: 部分修改

> Q1=A, Q5=改默认暗色, Q11=改单 Series, 其他默认

含义: 老板指定的几项覆盖黑推荐,其余采纳。

### 模板 C: 暂缓某些

> Q3/Q7 暂缓 (等百度方案独立讨论), 其他全默认

含义: 暂缓的标"暂缓",其他采纳黑推荐。

---

## ⏭ 老板拍板后黑立即执行

1. **更新 DECISIONS.md** — 把"已拍板"项填入,锁定决策
2. **同步到代码** — 改 .env.example / SiteConfig / prisma seed 默认值
3. **开 Phase 2 方案** — 基于已拍板的 Q 项, 写 Phase 2 详细方案
4. **给老板看 Phase 2 milestone 清单** — 每个子任务预计时长 + 验收标准

---

## 📊 决策影响范围速查

| 决策 | 影响文件 | 改动量 |
|---|---|---|
| Q1 项目名 | `package.json`, 仓库, 全部文档 | 10+ 文件 |
| Q3 百度方案 | (Phase 2 Worker 仓) | 0 (不影响 P1) |
| Q11 Novel 模型 | `lib/db.ts`, `lib/repo.ts`, `lib/types.ts`, seed | 5 文件 |
| Q5 主题 | `tailwind.config.ts`, `app/globals.css` | 2 文件 |
| Q9 Page Builder | (Phase 3) | 0 (不影响 P1) |
| Q9b CustomHtml | `lib/blocks/index.ts`, `SiteConfig` | 2 文件 |
| Q10 Worker 仓 | (Phase 2 新建 repo) | 0 (不影响 P1) |
| Q13-Q16 测试 | `vitest.config.ts`, `package.json` scripts | 3 文件 |

---

## ⏱ 时间预算 (Phase 2)

**基于全部默认决策**, Phase 2 预计:

| 子任务 | 预计时长 | 验收 |
|---|---|---|
| 2.1 5 专栏详情页 | 4-6h | 每专栏 1 页 + 列表 |
| 2.2 FTS5 全文搜索 | 3-4h | 搜索响应 < 100ms |
| 2.3 SEO (sitemap/robots/OG) | 2-3h | Lighthouse SEO ≥ 95 |
| 2.4 RSS / Atom 订阅 | 1-2h | feed.xml 校验通过 |
| 2.5 Phase 2 测试 + 截图 | 2-3h | e2e 全过 + 8 张新截图 |
| **合计** | **12-18h** | (老板可分批验收) |

老板拍 `全默认` 后, 黑立即开 2.1, 第一 milestone 约 **4-6 小时** 交付。

---

> 上次更新: 2026-06-25 09:35 · 配合 v0.6.1 Phase 1 跑通版本
