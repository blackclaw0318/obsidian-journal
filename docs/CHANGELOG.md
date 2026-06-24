# 更新日志 (Changelog)

## v0.5 — 2026-06-24 (测试与可见性方案, 黑新增)

### 新增 (1 文档)

1. **docs/TESTING.md (12 KB, 480 行)**: 测试与可见性完整方案
   - **3 层测试金字塔**: Unit (Vitest) / Integration (Prisma 内存 SQLite) / E2E + Visual (Playwright)
   - **2 路可见性**: Cloudflare Tunnel 实时真访问 + 阶段报告 (含截图)
   - **各 Phase 测试计划**: P1 骨架 65 case / P2 内容 98 case / P3 Admin 137 case / P4 打磨 50 case
   - **一键命令表**: `pnpm verify` / `pnpm test:visual` / `pnpm lhci` / `pnpm dev:tunnel`
   - **pre-commit 自动化**: lint-staged + simple-git-hooks (commit 跑 lint+unit, push 跑 verify)
   - **风险与缓解表**: 8 类风险 (资源/网络/视觉回归/SQLite 并发等) + 缓解
   - **验收节奏**: 微步 (2-4h) / 里程碑 (子任务) / Phase 收官 (老板 `pnpm verify` 自验)

### 配套基础设施 (本机已就绪)

- **xhs-mcp 容器已停** (释放 ~1 核 + 500MB 内存, load 3.28→1.95)
- **cloudflared 2026.6.1** 已装 (`/usr/local/bin/cloudflared`)

### 新增决策项

- **Q13** 🆕: 测试金字塔比例 (35/30/25/10) — 黑推荐 ✅
- **Q14** 🆕: 覆盖率门禁 (总体 ≥ 75%, 核心 ≥ 90%) — 黑推荐 ✅
- **Q15** 🆕: 视觉回归容差 (≤ 2% 像素差) — 黑推荐 ✅
- **Q16** 🆕: Pre-push 必跑 `pnpm verify` (~5min) — 黑推荐 ✅

### 文档规模

- v0.4: ~2500 行
- v0.5: ~3000 行 (+20%)

---

## v0.4 — 2026-06-24 (基于老板硬件信息: 4c16g 当前 → 2c4g 未来生产)

### 新增 (3, 全部)

1. **§13.4 硬件适配章节** (DESIGN.md + ARCHITECTURE.md §A18):
   - **DEPLOY_MODE 环境变量**: `dev` / `prod-16g` / `prod-4g` 三档自适应
   - **PM2 配置差异化**: 4c16g cluster max=2 + heap 2G / 2c4g fork + heap 1.5G
   - **sharp 并发控制**: 4c16g 不限 / 2c4g 强制=1 (内存峰值 900MB→可控)
   - **Next.js standalone 模式**: 生产必选, 减少 ~80% 部署体积
   - **2c4g swap 强制**: 2-4 GB, 防 OOM
   - **sharp 跨平台编译**: 开发机编译 → 生产跳过编译 (避生产编译 OOM)

2. **SQLite 调优配置** (DESIGN.md §6 + ARCHITECTURE.md §A18):
   - `journal_mode = WAL` (并发读写)
   - `busy_timeout = 5000` (5s 写等待)
   - `synchronous = NORMAL` (性能/安全平衡)
   - `mmap_size = 256MB` (零拷贝读)
   - `cache_size = -64000` (64MB 缓存)
   - Prisma 连接池 = 1 (SQLite 单写)

3. **§A18 完整部署配置模板** (ARCHITECTURE.md):
   - `ecosystem.config.js` (PM2)
   - `nginx.conf` (worker_processes=auto, gzip, brotli, limit_req)
   - `swap.conf` (2c4g 必备)
   - `logrotate.conf`
   - `tuning.service` (systemd 启动调优脚本)
   - `healthcheck.sh` (扩展: 含内存/磁盘/Worker 健康)

### 新增决策项

- **Q12** 🆕: 2c4g 降级模式开关 (黑推荐: 默认支持, `DEPLOY_MODE=prod-4g` 启用)

### 文档规模
- v0.3: ~2200 行
- v0.4: ~2500 行 (+14%)

### 不变的 (确认)
- ✅ 核心架构 (Next.js + Prisma + SQLite + dnd-kit + shiki + DOMPurify) 不动
- ✅ 12 个 model 数据模型不动
- ✅ 13 种 Block 类型不动
- ✅ Page Builder 逻辑不动
- ✅ FTS5 / MediaUsage / Novel 三层模型不动
- ✅ Cloudflare Worker 独立仓库不动

### 黑补充 (老板必读)
1. **2c4g 跑得起来**: Next.js 14 + Prisma + SQLite 在 2c4g 有大量生产案例 (Vercel Hobby / Railway $5 plan 都是这个量级), 不需要降级技术栈
2. **关键调优点是部署层**: 内存限制 + sharp 串行 + swap 必备 + WAL
3. **图片走 CDN**: 静态资源建议 Cloudflare CDN, 不吃 2c4g 出口带宽
4. **未来日 PV < 1万**: SQLite 够用, 不需要迁 Postgres
5. **sharp 跨平台**: 开发机 amd64 编译, 生产装同样架构即可; 若生产是 arm64 (如 Oracle ARM), 需要交叉编译或 npm rebuild

---

## v0.3 — 2026-06-24 (基于老板第二批 9 条反馈)

### 🔴 关键问题 (3, 已修复)

1. **CustomHtmlBlock 开启路径缺失** → 加 **Q9b 决策项** + SiteConfig.allowCustomHtml 开关 + Settings 显式开启 + 保存时 DOMPurify 二次清洗 + Block 库 disabled 灰显
2. **Cloudflare Worker 仓库结构未规划** → 加 **§22 Worker 仓库结构** 章节 + **Q10 决策项** (独立 repo / monorepo, 黑推荐独立 repo)
3. **小说"作品 (Novel)" 实体缺失** → 加 Novel + NovelVolume 双层模型, Chapter 挂 NovelVolume 不再挂 Series

### 🟡 中等问题 (4, 已修复)

4. **媒体引用追踪缺实现** → 加 MediaUsage 中间表 (多态关联 post/chapter/page/video)
5. **SiteConfig.socials String JSON 不严谨** → 加 Social 表规范化 (platform/label/url/icon/order/visible)
6. **FTS5 同步失败无降级** → 明确同步失败降级 + warning log + Admin"重建索引"按钮 + 定时 cron
7. **Video.series String 不严谨** → 加 VideoSeries 表 + 外键 (统一数据模型)

### 🟢 小问题 (4, 已修复)

8. **BlockBase 缺 theme 字段** → 加 `theme?: 'light' | 'dark' | 'auto'`, Block 容器动态加 className
9. **MarqueeBlock 凑数** → **移除** (现代博客几乎不用)
10. **MusicBlock 反人类** → 保留但**标"高级"**, 加使用场景文档警告
11. **CalloutBlock 新增** → 替代 Marquee, 现代博客高频 (info/warning/success/danger)
12. **view 计数方案缺失** → 加 **§23 View 计数方案** 章节 (DB UPDATE + 同 IP 24h 防刷)

### Block 类型清单变更

| Block | v0.2 | v0.3 |
|---|---|---|
| Hero / Text / Gallery / Stats / Skills / Timeline / Links / Posts / Videos / Divider / CustomHtml | ✅ | ✅ |
| **Marquee** | ✅ | ❌ 移除 |
| **Music** | ✅ | ⚠️ 保留 (标"高级", 默认折叠) |
| **Callout** 🆕 | — | ✅ 新增 |

**总 Block 数**: 13 → **13** (12 常规 + 1 高级 Music)

### 数据模型变更

| 表 | v0.2 | v0.3 |
|---|---|---|
| User / SiteConfig / Post / Page / Media / DailyStat | ✅ | ✅ |
| Series (tech 文章系列) | ✅ | ✅ (限定 tech/life) |
| Chapter (小说章节) | ✅ | ✅ (改挂 NovelVolume) |
| **Novel** 🆕 | — | 小说作品 (元界) |
| **NovelVolume** 🆕 | — | 小说卷 (元界 第一卷) |
| **Social** 🆕 | — | 友链/社交规范化 |
| **MediaUsage** 🆕 | — | 媒体引用追踪 |
| **VideoSeries** 🆕 | — | 视频系列外键 |
| Video.series String | — | 改 seriesId 外键 → VideoSeries |

### 新增决策项

- **Q9b** 🆕: CustomHtmlBlock 是否允许开启 (黑推荐: 默认禁用, Settings 显式开启)
- **Q10** 🆕: Worker 仓库结构 (黑推荐: 独立 repo)
- **Q11** 🆕: Novel 模型设计采用 (黑推荐: Novel + NovelVolume 双层)

### 文档规模
- v0.2: 1835 行
- v0.3: ~2200 行 (+20%)

---

## v0.2 — 2026-06-24

### 🔴 关键 (3)
- Page Builder 升级 Page + Block[]
- 百度改 B 方案 + C 降级
- 数据模型严谨化

### 🟡 中等 (4)
- Page Builder 3 栏 UI
- SQLite FTS5 搜索
- 媒体库模块
- Post/Chapter 拆表

### 🟢 小 (3)
- 默认亮色
- content/ gitignore 明细
- Series/合集页

---

## v0.1 — 2026-06-24 (初稿, 已废)

### 已废原因
- Page Builder 太弱 (老板指出)
- 百度方案 C 不算"直接播放"
- 数据模型不严谨
- 缺媒体库
- 缺 Novel 层
- FTS5 无降级
- 媒体无引用追踪
- Social 字段不规范化
- Block 类型有凑数
- Worker 仓库结构未规划
