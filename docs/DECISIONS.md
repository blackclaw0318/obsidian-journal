# 决策记录 (Decisions) — v0.6.1

> 老板拍板项归档, **本文件是唯一权威**。
>
> v0.6.1 更新: Q1-Q16 全数按"黑推荐"默认拍板 (老板指令 "开 Phase 2" 即默认 = 全推荐)。
> 2026-06-26 增补: **Q17 Auth 方案** (老板指令 "接受影响回写文档" → 拍板自建 JWT, 偏离原计划 Auth.js v5)。
> 详细决策助手: [DECISIONS-QUICK.md](DECISIONS-QUICK.md)

## 决策流程

1. 黑提出候选 + 推荐 (见 `DESIGN.md` §16)
2. 老板回复: 选 X / 改 Y / 暂缓
3. 黑记入本文件 (状态: 拍板/暂缓/未决)
4. 立即同步到代码/文档

---

## ✅ 已拍板 (Resolved) — v0.6.1 Q1-Q17

> 老板 2026-06-25 09:56 指令 "开 Phase 2" = Q1-Q16 全部按黑推荐默认拍板 (无修改)
> 老板 2026-06-26 07:43 指令 "接受影响回写文档" = Q17 拍板自建 JWT

### 🔴 P0 — Phase 1 解锁 (已生效)

#### Q1. 项目名 ✅
- **拍板**: `obsidian-journal` (黑曜石日志)
- 影响: package.json + 仓库 + 全部文档
- 实施: v0.6.1 (本仓库已是此名)

#### Q3. 百度网盘方案 ✅
- **拍板**: B 第三方解析真直接播 (自建 Worker)
- 影响: 需建独立 Worker 仓 (Q10)
- 实施: Phase 2.6 (P2)

#### Q11. Novel 模型设计 ✅
- **拍板**: Novel + NovelVolume 双层 (支持多卷长篇)
- 影响: lib/db.ts, lib/repo.ts, lib/types.ts, seed
- 实施: Phase 2.1 (专栏详情页)

### 🟡 P1 — Phase 1-3 解锁

#### Q4. 部署平台 ✅
- **拍板**: 自托管 VPS (老板 lavm 4c16g 已用)
- 影响: docs/DEPLOY.md 为主

#### Q5. 默认主题 ✅
- **拍板**: 默认亮色 + 暗色切换
- 影响: tailwind.config.ts, app/globals.css
- 实施: Phase 2.3 (UI 打磨)

#### Q9. Page Builder 模式 ✅
- **拍板**: 自由搭建 (无模板约束)
- 影响: Phase 3 后台
- 实施: Phase 3.2

#### Q9b. CustomHtml 开关 ✅
- **拍板**: 默认禁用 + Settings 显式开启
- 影响: SiteConfig.allowCustomHtml, lib/blocks/index.ts
- 实施: Phase 2.1

#### Q10. Worker 仓库结构 ✅
- **拍板**: 独立 repo `obsidian-journal-baidu-proxy`
- 影响: 新建独立仓 (Phase 2.6)
- 实施: Phase 2.6

### 🟢 P2 — 不阻塞

#### Q2. 评论区 ✅
- **拍板**: 不做 (P1 范围)
- 影响: 无

#### Q6. 评论 LLM 自动回复 ✅
- **拍板**: 不做 (v2)
- 影响: 无

#### Q7. Worker 部署平台 ✅
- **拍板**: Cloudflare Worker (免费)
- 影响: Worker 仓 deploy.yml

#### Q8. 媒体库域名 ✅
- **拍板**: 同站 /media/
- 影响: next.config 路由 + 媒体存储路径

### 🆕 v0.5 测试方案 — Q13-Q16 ✅

#### Q13. 测试金字塔比例 ✅
- **拍板**: 35/30/25/10 (Unit/Integration/Component/E2E)
- 影响: vitest.config.ts + 测试文件分布

#### Q14. 覆盖率门禁 ✅
- **拍板**: 总体 ≥ 75% + 核心 ≥ 90%
- 影响: vitest.config.ts coverage.thresholds
- 实施: Phase 2.5 (测试加固)

#### Q15. 视觉回归容差 ✅
- **拍板**: 像素差 ≤ 2%
- 影响: Playwright visual regression 配置

#### Q16. Pre-push 必跑 verify ✅
- **拍板**: 必跑 (~5min)
- 影响: package.json scripts + simple-git-hooks pre-push
- 实施: Phase 2.5

### 🆕 Q17 (2026-06-26) — Phase 3 启动决策

#### Q17. Auth 方案 ✅
- **拍板**: B. 自建 JWT + bcryptjs + httpOnly cookie
- 候选: A. NextAuth v5 + Credentials / **B. 自建 JWT + bcryptjs + jose** / C. 临时 username+password
- 黑推荐: B (理由: v0.6.1 设计写 Prisma + Auth.js v5, 但 Phase 1 实施中老板拍板 "Prisma → node:sqlite + 手写 SQL", Auth.js v5 需 ORM adapter, 在手写 SQL 架构下需自写 adapter, 工作量 ≈ 自建 Auth; 自建可控代码量 ~200 行, jose 库 Edge 兼容, 后续接 OAuth 不影响)
- 拍板: 老板 2026-06-26 07:43 指令 "接受影响回写文档" → 接受偏离 v0.6.1 (原计划 Auth.js v5), 保留自建 JWT 实现, 同步修订 DESIGN.md + DECISIONS.md
- 决定: B
- 影响范围:
  - 新增: `lib/auth.ts` (200 行核心), `middleware.ts` (Edge JWT 验签), `app/api/auth/{login,logout,me}/route.ts`, `app/admin/login/page.tsx`, `app/admin/(admin)/layout.tsx`, `app/admin/(admin)/_components/AdminShell.tsx`
  - 修改: `prisma/seed.ts` (bcrypt 哈希 + 默认密码), `tests/e2e/{home,search}.spec.ts` (加登录)
  - 修订: `docs/DESIGN.md` (4 处 Auth.js v5 → 自建 JWT), `docs/PHASE3_PLAN.md`, `docs/PHASE3_STATUS_2026_06_26.md`
- 实施日期: 2026-06-26 (commit `e123591` + `44d4efb`)
- 限制: 失去 Auth.js 生态 (OAuth providers / Email magic link / account linking), 本项目不需要, 将来要 OAuth 可补 0.5 天自建
- 验证: 142/142 tests pass (verify:full)
- **架构漂移记录**: v0.6.1 设计 "Prisma + Auth.js v5" 是 Phase 1 启动时的初始设计, Phase 1 实施中老板拍板 "Prisma → node:sqlite", Auth.js 部分未同步修订。Q17 拍板后, v0.6.1 的 Auth 部分以 "自建 JWT" 为准。

---

## 📊 拍板统计

| 类别 | 总数 | 拍板 | 暂缓 | 未决 |
|---|---|---|---|---|
| P0 阻塞 | 3 | 3 | 0 | 0 |
| P1 阻塞 | 5 | 5 | 0 | 0 |
| P2 不阻塞 | 4 | 4 | 0 | 0 |
| 测试 (Q13-Q16) | 4 | 4 | 0 | 0 |
| Phase 3 启动 (Q17) | 1 | 1 | 0 | 0 |
| **合计** | **17** | **17** | **0** | **0** |

**Phase 1 解锁 ✅ → Phase 2 可立即开**

---

## v0.5 → v0.6 决策变化

| 项 | v0.5 | v0.6 调整 | 理由 |
|---|---|---|---|
| **全部 Q1-Q16** | 待拍板 | **黑推荐默认全拍板** | 老板指令 "开 Phase 2" = 默认采纳 |
| DECISIONS-QUICK.md | — | **新建** (老板 30 秒决策助手) | 提升决策效率 |
| docs/DEPLOY.md | — | **新建** (三档部署模式) | 配合 Q4 + Q12 |
| README.md | v0.6.0 | **v0.6.1 重写** | 修正 Prisma 误标 + 加截图区 + Tunnel URL |
| Playwright e2e | 0 case | **8 case 全过** | Phase 1 验收 |
| Tunnel | 无 | **trycloudflare 临时 URL** | 老板实时访问 |

---

## v0.6.1 → v0.6.2 决策变化 (2026-06-26)

| 项 | v0.6.1 | v0.6.2 调整 | 理由 |
|---|---|---|---|
| **Q17 Auth 方案** | 计划 Auth.js v5 + Prisma adapter | **拍板 B. 自建 JWT + bcryptjs + jose** | Phase 1 实施中 Prisma 已拍板换为 node:sqlite, Auth.js 需自写 adapter 不划算 |
| Route group 命名 | `(admin)` (DESIGN.md §11) | **(admin)** ← 与设计一致 | 实施时用 `(authed)` 与 §11 不一致, 修订重命名 |
| DESIGN.md §15 Phase 1 待办 | "Auth.js + 登录 + Middleware" | ✅ **自建 JWT (Q17)** | 反映 Q17 拍板 |
| DESIGN.md 技术栈 | "Auth.js v5" | **"自建 JWT (Q17 修订)"** | 同步修订 |
| CSRF 防护 | "Auth.js + Origin 校验" | **"sameSite=strict cookie"** | 自建 JWT 后的替代方案 |
| 影响后续 Phase | — | **0 阻塞** (3.2-3.10 全不受影响) | Auth 已透明, 后续只写子页面, OAuth 将来补 0.5d |

---

## v0.4 → v0.5 决策变化

| 项 | v0.4 候选 | v0.5 调整 | 理由 |
|---|---|---|---|
| **新增 Q13-Q16** | — | **测试方案 4 决策** (金字塔比例 / 覆盖率门禁 / 视觉容差 / pre-push verify) | 老板下指令 "把测试全流程写成方案" |
| 测试方法论 | 散落各 Phase | **TESTING.md 集中** (12 KB, 480 行) | 单一权威, Phase 切换不丢上下文 |
| 可见性 | 无 | **Tunnel (cloudflared) + 阶段报告** | 老板可远程看真实产品, 非截图 |
| CI | 假想 GitHub Actions | **本机 pre-commit + pre-push** (simple-git-hooks) | 不引入 CI 复杂度, 老板提交即验证 |
| 工具栈 | — | **Vitest 2.1 + Playwright 1.49 + node:sqlite + LHCI 0.14 + k6 0.50** (版本锁定) | 可重现, 不被上游坑 |

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

> 上次更新: 2026-06-25 09:56 · v0.6.1 Phase 1 跑通 + Q1-Q16 全拍板 + Phase 2 可开
