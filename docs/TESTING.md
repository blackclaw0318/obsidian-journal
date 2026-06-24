# 测试与可见性方案 (v0.5)

> 阶段: 方案稿 (配套 DESIGN.md v0.4)
> 起草: 黑 (Hei) · 2026-06-24
> 状态: ⏳ 等老板审 (含 4 决策 Q13-Q16)

---

## 0. TL;DR (60 秒)

**3 层测试金字塔 + 2 路可见性通道 = 老板随时可看, 黑每步可验。**

| 层 | 工具 | 节奏 | 验收 |
|---|---|---|---|
| **L1 Unit** | Vitest | 写函数同步 | `pnpm test:unit` |
| **L2 Integration** | Vitest + Prisma 内存库 | 写完模块 | `pnpm test:integration` |
| **L3 E2E + Visual** | Playwright | 子任务收官 | `pnpm test:e2e` + 截图 |
| **可视** | Cloudflare Tunnel + 报告 | 每里程碑 | URL + 截图 + 数据 |

**老板验收无需盯进度** — 黑按微步/里程碑/Phase 三档主动推。

---

## 1. 测试金字塔 (本项目定 4 层)

```
              ╱╲
             ╱  ╲           E2E (Playwright)
            ╱ 10%╲          ~10 case/Phase, 真实浏览器, 含视觉回归
           ╱──────╲
          ╱        ╲        Component (Vitest + Testing Library)
         ╱   25%    ╲       ~30 case/Phase, Block 渲染 + 交互
        ╱────────────╲
       ╱              ╲     Integration (Prisma + 内存 SQLite)
      ╱     30%        ╲    ~20 case/Phase, DB / API / FTS5
     ╱──────────────────╲
    ╱                    ╲  Unit (Vitest)
   ╱       35%            ╲ ~50 case/Phase, 纯函数 / 工具
  ╱────────────────────────╲
```

**关键原则**:
- **底层错误绝不上浮**: Unit 挂 → Integration 不跑 → E2E 不跑
- **覆盖率门禁**: Unit/Integration 总体 ≥ 75%, 核心模块 (Prisma / Block renderer / Auth) ≥ 90%
- **回归阻断**: `pnpm verify` 任一失败 → 不允许 commit

---

## 2. 工具栈 (统一版本管理)

| 类别 | 工具 | 版本 (2026-06 锁定) | 用途 |
|---|---|---|---|
| **测试运行** | Vitest | ^2.1 | Unit + Integration + Component (同一 runner) |
| **E2E + 视觉** | Playwright | ^1.49 | E2E + 截图回归 + 移动端模拟 |
| **DB 测试** | Prisma + `prisma db push` | ^5.22 | 内存 SQLite (`:memory:`) + 测试 seed |
| **组件测试** | @testing-library/react | ^16.1 | Block 渲染 / DOM 断言 |
| **a11y** | @axe-core/playwright | ^4.10 | 自动无障碍审计 |
| **性能** | @lhci/cli (Lighthouse CI) | ^0.14 | 桌面 + 移动 4G 节流 |
| **负载** | k6 | ^0.50 | 压测 (Phase 4) |
| **mock** | MSW (Mock Service Worker) | ^2.6 | 拦截 Next.js API + 外部 fetch |
| **覆盖率** | @vitest/coverage-v8 | ^2.1 | v8 引擎 (速度快) |
| **pre-commit** | simple-git-hooks + lint-staged | ^2.11 / ^15.2 | 提交前必跑 lint + unit |

**全部 devDependency**, 不入 production bundle。

---

## 3. 目录结构 (测试相关)

```
projects/obsidian-journal/
├── src/                          # 应用代码
├── tests/
│   ├── unit/                     # 纯函数 / 工具
│   │   ├── lib/
│   │   │   ├── markdown.test.ts
│   │   │   ├── frontmatter.test.ts
│   │   │   └── shiki.test.ts
│   │   └── utils/
│   ├── integration/              # Prisma + API
│   │   ├── api/
│   │   │   ├── posts.test.ts
│   │   │   ├── chapters.test.ts  # 章节 CRUD + 选 volume
│   │   │   ├── search.test.ts    # FTS5
│   │   │   ├── view.test.ts      # 计数 + 防刷
│   │   │   └── reindex.test.ts   # /admin/reindex 🆕
│   │   ├── blocks/
│   │   │   ├── novel.test.ts
│   │   │   ├── social.test.ts    # Social 独立表
│   │   │   └── media-usage.test.ts
│   │   └── helpers/
│   │       └── db.ts             # 内存 SQLite 初始化
│   ├── component/                # Block 渲染
│   │   ├── blocks/
│   │   │   ├── Hero.test.tsx
│   │   │   ├── Callout.test.tsx  # 替代 Marquee
│   │   │   ├── TextBlock.test.tsx
│   │   │   ├── CodeBlock.test.tsx
│   │   │   ├── Gallery.test.tsx
│   │   │   ├── Video.test.tsx    # 含 B/百度/YT
│   │   │   └── ... (13 Block 全覆盖)
│   │   └── admin/
│   │       ├── PageBuilder.test.tsx
│   │       └── MediaLibrary.test.tsx
│   └── e2e/                      # Playwright
│       ├── smoke.spec.ts         # 启动 + 首页
│       ├── auth.spec.ts          # 登录 / 中间件
│       ├── content.spec.ts       # 5 专栏 + 详情
│       ├── novel.spec.ts         # 作品 → 卷 → 章节
│       ├── admin-upload.spec.ts  # MD 拖入 → 发布
│       ├── search.spec.ts        # FTS5 搜索
│       ├── visual/
│       │   ├── home.spec.ts      # 首页截图 (亮/暗/移动)
│       │   ├── post-detail.spec.ts
│       │   └── admin.spec.ts
│       └── fixtures/
│           ├── seed.ts           # 端到端数据
│           └── auth.ts           # 登录态注入
├── prisma/
│   ├── schema.prisma             # 14 model v0.3
│   ├── seed.ts                   # 1 Novel 2 卷 4 章节 + 样例
│   └── seed.test.ts              # seed 幂等性
├── scripts/
│   ├── dev.sh                    # 一键 dev (db push + seed + next dev)
│   ├── tunnel.sh                 # cloudflared 一键起
│   ├── verify.sh                 # 跑完 4 层测试
│   ├── phase-report.sh           # 生成阶段报告
│   └── ci-local.sh               # 本地 CI 模拟 (含 pre-commit + lint)
├── .simple-git-hooks.json
├── playwright.config.ts
├── vitest.config.ts
├── lighthouserc.json             # LHCI 配置
├── .env.test                     # 测试环境变量
└── docs/
    ├── TESTING.md                # 本文件
    ├── PHASE_REPORTS/            # 阶段报告归档
    │   ├── p1-skeleton.md
    │   ├── p2-content.md
    │   ├── p3-admin.md
    │   └── p4-polish.md
    └── screenshots/              # 测试截图存档
        ├── p1/
        ├── p2/
        ├── p3/
        └── p4/
```

---

## 4. 各 Phase 测试计划

### Phase 1 — 骨架 (3-5 天)

**目标**: `pnpm dev` 起来, 首页可见, 登录闭环, 13 Block 全部能渲。

| 层 | 数量 | 关键 case |
|---|---|---|
| Unit | 20 | frontmatter 解析 / unified 编译 / 工具函数 |
| Integration | 15 | Prisma 14 model CRUD / 内存 SQLite 跑通 / seed 幂等 |
| Component | 30 | 13 Block 各一个 happy path + 1 异常 path |
| E2E | 5 | 首页加载 / 登录页 / 登录→首页 / 切换主题 / Middleware 拦截 |

**验收 (黑视角)**:
- `pnpm verify` 全绿
- Lighthouse 桌面 ≥ 95 (骨架阶段无复杂内容, 容易满分)
- Tunnel URL 首页截图清晰
- View 计数 1 次访问 = 1 (同 IP 24h 不重复)

### Phase 2 — 内容展示 (4-6 天)

**目标**: 5 专栏列表 + 详情页 + FTS5 搜索 + SEO。

| 层 | 数量 | 关键 case |
|---|---|---|
| Unit | 30 | Shiki 主题切换 / TOC 解析 / 阅读时长估算 |
| Integration | 20 | Post CRUD / Chapter CRUD (含 volume 关联) / FTS5 搜索 / View 计数 / sitemap 生成 |
| Component | 40 | 5 专栏列表 / 详情页 (Shiki/TOC/前后导航) / Novel 三层 (作品/卷/章节) / Video 嵌入 (B/百度/YT) |
| E2E | 8 | 列→详情 / 章节前后翻 / FTS5 实时搜 / 移动端 375 排版 / OG 预览 |

**视觉回归 (Playwright)**:
- 桌面 1440px / 平板 768px / 移动 375px, 亮+暗主题, 关键页 3 张 × 2 主题 = 12 张基准图
- 每次 commit 自动对比, 偏差 > 2% 报警

**验收**:
- Lighthouse 移动 ≥ 92 (Lighthouse CI 锁线)
- a11y 0 严重 (axe 自动)
- 13 Block 在实际内容页 100% 渲染正确

### Phase 3 — Admin 后台 (8-12 天)

**目标**: 拖 MD → 发布; Page Builder 拖 Block; 媒体库 + 引用追踪。

| 层 | 数量 | 关键 case |
|---|---|---|
| Unit | 40 | MD 解析含 chapter→volume 选择 / Block schema 校验 / DOMPurify 清洗 |
| Integration | 35 | Article/Chapter CRUD / Novel/Volume/Series 三层 CRUD / Social CRUD / Video+Series CRUD / **MediaUsage 反向引用追踪 + 删除警告** / **FTS5 重建接口** / **CustomHtml 受开关控制** / Worker URL 配置 |
| Component | 50 | Page Builder (拖拽) / Settings (allowCustomHtml 开关 + 二次确认) / 媒体库 (上传/多尺寸/blurhash) / /admin/reindex UI |
| E2E | 12 | 登录 Admin → 拖 MD 发布 → 公开页可见 / Page Builder 改首页 → 即时生效 / 媒体删除前显示引用数 + 警告 / FTS5 重建验证 / 误开 CustomHtml 的兜底 |

**安全测试重点**:
- CustomHtml 开启 + 注入 `<script>` → DOMPurify 必过滤
- Worker URL 未配 → 百度视频降级提示
- MediaUsage 引用 > 0 删除 → 二次确认

**验收**:
- 1 个真实 MD 拖入 → 公开页可见 ≤ 30s
- FTS5 重建按钮: 100 文章 ≤ 5s
- Page Builder 自由搭首页 5 分钟可上手 (老板体感)

### Phase 4 — 打磨 (4-6 天)

**目标**: 性能达标 + 2c4g 部署 + 监控。

| 层 | 数量 | 关键 case |
|---|---|---|
| Unit | 30 | 图片压缩 (sharp 多尺寸) / LRU 防刷 / 缓存键 |
| Integration | 15 | /api/health (含 baiduWorker 探测) / 缓存命中率 / logrotate 验证 |
| E2E | 5 | Lighthouse CI 桌面 ≥ 95 / 移动 ≥ 92 / a11y 0 严重 |
| Load (k6) | 3 场景 | 50 并发读首页 / 100 并发读详情 / 写压力 (评论/计数) |

**2c4g 部署验证 (v0.4 重点)**:
- [ ] 准备 2c4g 测试机
- [ ] `DEPLOY_MODE=prod-4g` 跑通全链路
- [ ] 上传 50 张图 + 10 Post, 监控内存峰值 < 1.4G
- [ ] 跑 24h 压测, 无 OOM, 无 PM2 重启
- [ ] sharp 串行 vs 并发内存对比 (附数据)

**验收**:
- Lighthouse 桌面 ≥ 95 / 移动 ≥ 92 (CI 锁)
- 4c16g 本机负载 < 2.0 (8h 均值)
- 2c4g 生产 24h 0 OOM

---

## 5. 可见性策略 (双通道)

### 通道 1: Cloudflare Tunnel (推荐) — 实时真访问

**工具**: `cloudflared` 2026.6.1 (本机已装) + `trycloudflare.com` quick tunnel

```bash
# 启动 (后台)
cloudflared tunnel --url http://localhost:3000 > /tmp/tunnel.log 2>&1 &
sleep 8
# 提取 URL
TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/tunnel.log | head -1)
echo "TUNNEL_URL=$TUNNEL_URL" >> /root/.openclaw/workspace/projects/obsidian-journal/.env.public
```

**优点**:
- 老板浏览器直开, 真点击、真滚动、真交互
- 每次 session 一个新域, 安全 (别人扫不到)
- 无需 Cloudflare 账号 / DNS 配置

**风险与缓解**:
| 风险 | 缓解 |
|---|---|
| 域每次重启变 | 写入 `.env.public`, 老板收藏; Phase 4 升级为命名 tunnel + 固定子域 |
| 国内访问 CF 慢/抖 | 备选 `localhost.run` (基于 SSH 反向隧道) 或 `bore.pub` |
| 老板弱网看不到 | 退化为截图 + 报告 (我多截几张) |
| tunnel 进程挂 | `scripts/tunnel.sh` 自愈 (systemd Restart=always) |

### 通道 2: 阶段报告 + 截图 (每 Phase 必出)

**格式**: `docs/PHASE_REPORTS/pN-name.md` + 附图存 `docs/screenshots/pN/`

**模板**:
```markdown
# Phase N — [名字] 阶段报告

**日期**: 2026-MM-DD
**耗时**: Xh (预计 Yh)
**commit**: abc1234
**Tunnel**: https://xxx.trycloudflare.com

## ✅ 完成项 (checklist)
- [x] xxx
- [x] yyy

## 📊 测试结果
| 套件 | 通过 | 失败 | 覆盖率 |
|---|---|---|---|
| Unit | 50/50 | 0 | 87% |
| Integration | 20/20 | 0 | 82% |
| Component | 30/30 | 0 | 91% |
| E2E | 8/8 | 0 | - |
| **合计** | **108/108** | **0** | **86%** |

## 🖼 截图 (精选)
- 首页桌面亮色: ![home-desktop](screenshots/p2/home-desktop.png)
- 详情页移动端: ![detail-mobile](screenshots/p2/detail-mobile.png)
- Admin 上传成功: ![admin-upload](screenshots/p3/admin-upload.png)

## 📈 性能
- Lighthouse 桌面: 96
- Lighthouse 移动: 93
- 首屏 LCP: 1.2s

## ⚠️ 已知问题
1. xx (不阻塞, 下期修)

## ⏭ 下期
- Phase N+1 第一步
```

**黑主动推送**: 报告生成后, 通过聊天附 `MEDIA:` 截图 + Tunnel URL + 1 段总结。

---

## 6. 一键命令表

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动 dev (Next.js :3000 + 监听文件) |
| `pnpm dev:tunnel` | dev + 起 cloudflared tunnel (后台) |
| `pnpm test` | 跑全部测试 (Unit + Integration + Component) |
| `pnpm test:unit` | 仅 Unit |
| `pnpm test:integration` | 仅 Integration |
| `pnpm test:component` | 仅 Component |
| `pnpm test:e2e` | 仅 E2E (Playwright headless) |
| `pnpm test:e2e:headed` | E2E + 浏览器可见 (调试用) |
| `pnpm test:visual` | 视觉回归 (Playwright 截图) |
| `pnpm test:coverage` | 全测 + 覆盖率报告 |
| `pnpm verify` | 跑完所有测试 + lint + typecheck (CI 模拟) |
| `pnpm lhci` | Lighthouse CI (本地) |
| `pnpm report:p1` | 生成 Phase 1 阶段报告 |
| `bash scripts/setup-swap.sh` | 配 2GB swap (v0.4 必备) |

---

## 7. CI / 自动化 (本机 pre-commit)

**simple-git-hooks** 配置 (`.simple-git-hooks.json`):

```json
{
  "pre-commit": "pnpm exec lint-staged",
  "pre-push": "pnpm verify"
}
```

**lint-staged** 配置:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "vitest related --run"],
  "*.{md,json}": ["prettier --write"]
}
```

**效果**:
- `git commit` → 暂存区文件跑 lint + 相关 unit
- `git push` → 完整 verify (4 层测试 + lint + typecheck)
- 任一失败 → 阻断 push

**老板无需记命令** — 提交时自动跑。

---

## 8. 验收节奏 (黑建议)

| 节奏 | 频率 | 形式 | 老板动作 |
|---|---|---|---|
| **微步** | 每 2-4 小时 | 短消息 + 关键截图 (1-2 张) | 瞄一眼 |
| **里程碑** | 每子任务结束 | 阶段报告 (本文件 §5) + Tunnel URL | 点链接看 + 翻报告 |
| **Phase 收官** | 每 Phase 结束 | 完整验收单 + 截图集 + `pnpm verify` 自验指引 | 跑一次 `pnpm verify` + 滑截图 |

**核心原则**: 老板**不主动问** "进度怎样", 黑**不主动汇报**无新东西。关键节点必推。

---

## 9. 风险与缓解

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| 1 | **4c16g 资源紧张** (Playwright + Next.js + tunnel) | 中 | 高 | 停 xhs-mcp 容器 (已执行, load 3.28→1.95); Playwright `workers: 1` 串行 |
| 2 | **Tunnel 域每次重启变** | 高 | 中 | 写 `.env.public` 老板收藏; Phase 4 升级命名 tunnel |
| 3 | **CF 国内访问慢** | 中 | 中 | 备选 `localhost.run` / `bore.pub`; 退化截图 |
| 4 | **视觉回归误报** (字体/渲染抖动) | 中 | 中 | 容差 2%; 关键页 12 张基准; 字体用 `font-display: swap` |
| 5 | **SQLite 并发写** (E2E 多 worker) | 中 | 中 | `WAL` + `busy_timeout=5000`; E2E 串行 |
| 6 | **Lighthouse CI 抖动** (网络/机器) | 中 | 低 | 跑 3 次取中位数; 阈值比目标低 3 分锁线 |
| 7 | **老板弱网看不到 Tunnel** | 低 | 中 | 截图兜底, 关键页 5-8 张 |
| 8 | **测试数据漂移** (seed 不幂等) | 中 | 中 | seed 用 `upsert`, 每次测试前 `prisma migrate reset --force` |

---

## 10. Q13-Q16 待老板拍板 (新增)

| # | 决策项 | 黑推荐 | 理由 |
|---|---|---|---|
| **Q13** | 测试金字塔比例 (35/30/25/10) 是否 OK? | ✅ 推荐 | 业界标准, 底层错误不上浮 |
| **Q14** | 覆盖率门禁 (总体 ≥ 75%, 核心 ≥ 90%) | ✅ 推荐 | 防回退, 不为覆盖率而覆盖率 |
| **Q15** | 视觉回归容差 (像素差 ≤ 2%) | ✅ 推荐 | 太严误报, 太松失效 |
| **Q16** | Pre-push 必跑 `pnpm verify` (慢, ~5min) | ✅ 推荐 | 一次性把质量门禁前移, push 后再挂代价大 |

---

## 11. 与 v0.4 部署方案的对齐

- **dev** (本机 4c16g) → `pnpm dev:tunnel` 跑测试 + 验证 + 老板看
- **prod-16g** → `pnpm build && pnpm start` + Nginx + PM2 cluster max=2
- **prod-4g** → 同上 + `DEPLOY_MODE=prod-4g` + 2GB swap + sharp=1
- **测试库** → 内存 SQLite `:memory:` (不落盘, 不占 prod 数据)

---

## 12. 文档元信息

- **版本**: v0.5 (配套 DESIGN.md v0.4)
- **行数**: ~480 行
- **更新触发**: Phase 切换 / 工具升级 / 老板反馈
- **关联文档**: DESIGN.md §15 (路线图) / ARCHITECTURE.md / DECISIONS.md
- **下次审**: 老板拍 Q13-Q16 后, 黑开 Phase 1 第一里程碑
