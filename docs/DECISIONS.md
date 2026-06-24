# 决策记录 (Decisions) — v0.3

> 老板拍板项归档, **本文件是唯一权威**。

## 决策流程
1. 黑提出候选 + 推荐 (见 `DESIGN.md` §16)
2. 老板回复: 选 X / 改 Y / 暂缓
3. 黑记入本文件 (状态: 拍板/暂缓/未决)
4. 立即同步到代码/文档

---

## 待拍板 (Pending, 11 项)

### 🔴 P0 — 阻塞 Phase 1

#### Q1. 项目名
- 候选: `obsidian-journal` (黑推荐) / `mono-press` / `inkwell` / `handfoot-blog` / `sk-journal`
- 状态: **🟡 未决**

#### Q3. 百度网盘方案
- 候选: **B 第三方解析真直接播** (黑推荐, 自建 Worker) / C 中间页+提取码
- 状态: **🟡 未决**

#### Q11. Novel 模型设计 🆕 v0.3
- 候选: **Novel + NovelVolume 双层** (黑推荐) / 单 Series 替代 (简化)
- 状态: **🟡 未决**
- 影响: 数据模型, 后台 UI, URL 设计

### 🟡 P1 — 阻塞 Phase 1-3

#### Q4. 部署平台
- 候选: 自托管 VPS (黑推荐) / Vercel
- 状态: **🟡 未决**

#### Q5. 默认主题
- 候选: **默认亮色** (黑推荐) + 暗色切换 / 默认暗色
- 状态: **🟡 未决**

#### Q9. Page Builder 模式
- 候选: **自由搭建** (黑推荐) / 模板驱动
- 状态: **🟡 未决**

#### Q9b. CustomHtmlBlock 开关 🆕 v0.3
- 候选: **默认禁用 + Settings 显式开启** (黑推荐) / 默认启用 / 永久禁用
- 状态: **🟡 未决**
- 影响: SiteConfig.allowCustomHtml, Page Builder UI, DOMPurify

#### Q10. Worker 仓库结构 🆕 v0.3
- 候选: **独立 repo** `obsidian-journal-baidu-proxy` (黑推荐) / monorepo (pnpm workspace)
- 状态: **🟡 未决**
- 影响: 仓库数量, CI 复杂度, 接口契约方式

### 🟢 P2 — 不阻塞

#### Q2. 评论区
- 候选: 不做 (黑推荐) / Giscus
- 状态: **🟡 未决**

#### Q6. 评论 LLM 自动回复
- 候选: 不做 (黑推荐, v2) / 做
- 状态: **🟡 未决**

#### Q7. 百度 Worker 部署平台
- 候选: **Cloudflare Worker** (黑推荐, 免费) / 自建 VPS 反代 / Replit / Deno Deploy
- 状态: **🟡 未决**

#### Q8. 媒体库域名
- 候选: **同站 /media/** (黑推荐, 简单) / 独立子域 `cdn.xxx.com`
- 状态: **🟡 未决**

---

## 已拍板 (Resolved)

*(空 — 等老板回复后填入)*

---

## v0.2 → v0.3 决策变化

| 项 | v0.2 候选 | v0.3 调整 | 理由 |
|---|---|---|---|
| **新增 Q9b** | — | **CustomHtmlBlock 开关** | 老板指出开启路径缺失 |
| **新增 Q10** | — | **Worker 仓库结构** | 老板指出仓库结构未规划 |
| **新增 Q11** | — | **Novel 模型** | 老板指出小说作品实体缺失 |
| Series 范围 | 含 NOVEL | 收紧 TECH/LIFE | Novel 独立表达 |
| Video.series | String | seriesId 外键 | 统一数据模型 |
| SiteConfig.socials | String JSON | Social 规范化表 | 数据严谨化 |
| Media 引用追踪 | 无 | MediaUsage 中间表 | 实现细节明确 |
| FTS5 同步 | 失败抛错 | **降级 + 重建按钮 + cron** | 失败不阻塞发布 |
| Block 13 种 | 含 Marquee/Music | **去 Marquee, Music 标 advanced, 加 Callout** | 凑数清理 + 现代博客高频 |

---

## v0.1 → v0.2 决策变化 (历史)

| 项 | v0.1 | v0.2 | 理由 |
|---|---|---|---|
| Q3 百度方案 | C 中间页 | **B 真直接播** + C 降级 | 老板要求"直接播放" |
| Q5 默认主题 | 默认暗色 | **默认亮色** + 暗色切换 | 现代博客主流 |
| Q9 搜索 | Fuse.js | **SQLite FTS5** | 性能 |
| (新) Q7 Worker 部署 | — | **新增** | B 方案落地 |
| (新) Q8 媒体域名 | — | **新增** | 媒体库落地 |
| (新) Q9 Page Builder | — | **新增** | 自由 vs 模板 |

---

## 决策模板 (新增项用)

```
### Q?. <标题>
- 候选: A / B / C
- 黑推荐: X (理由: ...)
- 拍板: <老板回复原文>
- 决定: X
- 影响范围: <文件/模块>
- 实施日期: YYYY-MM-DD
```

---

## v0.3 → v0.4 决策变化

| 项 | v0.3 候选 | v0.4 调整 | 理由 |
|---|---|---|---|
| **新增 Q12** | — | **2c4g 降级模式** | 老板提供硬件信息, 需生产降配 |
| 部署配置 | 单一标准 | **DEPLOY_MODE 三档** (dev/prod-16g/prod-4g) | 4c16g 当前 / 2c4g 未来 |
| Next.js 部署 | 标准 | **standalone 模式** | 生产体积 -80% |
| SQLite | 默认 | **WAL + 7 PRAGMA 调优** | 2c4g 内存读写优化 |
| PM2 部署 | 模糊 | **完整 ecosystem.config.js** | fork/cluster 切换明确 |
| 监控 | Plausible | **+ 健康检查脚本 (含内存/磁盘/Worker)** | 2c4g 主动告警 |

