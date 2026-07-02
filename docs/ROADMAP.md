# 路线图 (v0.10 Phase 3.3 收官)

> 总览, 详细见 `DESIGN.md` §15 / `CHANGELOG.md` / `PHASE3_PLAN.md` / `PHASE3_STATUS_2026_06_26.md`。

```
2026-06-24  ┌─ Phase 0 ──────┐ 立项 + 方案 v0.1/v0.2/v0.3/v0.4/v0.5 ✅
            │                 │ Q1-Q16 全拍板 (含 v0.5 测试 Q13-Q16)
            └─────────────────┘
2026-06-25  ┌─ Phase 1: 骨架 ┐ Next.js 14 + 14 model + 13 Block + Prisma 替换 + Auth 占位 ✅
            └─────────────────┘ 1 天
2026-06-25~ ┌─ Phase 2: 展示 ┐ 5 专栏 + FTS5 + SEO + RSS + 测试加固 ⭐ v0.7 收官
            └─────────────────┘ 1.5 天
2026-06-26  ┌─ Phase 3: Admin ┐ 3.1 Auth + 3.2 帖子 + 3.3 小说三层 ⭐ v0.10 收官
            └─────────────────┘ 已收 3 子任务, 剩 7 子任务 (3.4-3.10)
2026-07-??~ ┌─ Phase 4: 打磨 ┐ 性能 + 动画 + 双仓库部署 + 2c4g 压测 + 监控
            └─────────────────┘ ~3-5 天
```

## Phase 进度 (DoD 状态)

### Phase 0 — 立项 + 方案 ✅ 100%
- ✅ 仓库 + v0.1/v0.2/v0.3/v0.4/v0.5 方案 (5 轮迭代, 全部入仓)
- ✅ Q1-Q16 决策全拍板 (Q1=项目名 / Q2=评论 / Q3=百度 / Q4=部署 / Q5=主题 / Q6=LLM / Q7=Worker 部署 / Q8=媒体域名 / Q9=Page Builder / Q9b=CustomHtml 开关 / Q10=Worker 仓 / Q11=Novel 双层 / Q12=2c4g 降级 / Q13-Q16=测试金字塔 + 覆盖率 + 视觉 + pre-push)

### Phase 1 — 骨架 ✅ 100%
- ✅ `npm run dev` 一键启动 (port 3000)
- ✅ schema 14 model 完整 (User / Session / SiteConfig / Social / Post / Novel / NovelVolume / Chapter / VideoSeries / Video / MediaItem / MediaUsage / Page)
- ✅ seed 数据: 1 admin + 1 siteConfig + 3 socials + 3 posts + 1 novel + 1 volume + 2 chapters + 1 video series + 1 video
- ⏳ Auth 完整登录 (P3 实现, 当前是 P1.6 占位 — 主页导航到 /admin 无密码保护)
- ✅ 基础布局 + Tailwind dark + ThemeToggle
- ✅ 13 种 Block 类型定义 (lib/blocks/index.ts)
- ✅ 首页 (Hero + 最新 Post/Novel/Video + 社交)
- ⏳ View 计数 (P3 实现, 当前 view_count 字段已就位, incrementView 方法已实)

### Phase 2 — 内容展示 ⭐ 100% (v0.7 收官)
- ✅ 2.1 5 专栏详情页 + PostCategory 严守 (a732a12 + b9928a2)
- ✅ 2.2 FTS5 全文搜索 + Admin /admin/reindex (f34f30a)
- ✅ 2.3 SEO (sitemap/robots/JSON-LD/OG/canonical) (19698b5)
- ✅ 2.4 RSS / Atom 双格式 (7299bfd)
- ✅ 2.5 测试加固 (Q13-Q16 全激活) (403aec0 + 190c8a6)
- ⏸ 2.6 Worker 独立仓库 (P3 / 老板建仓决策后启动)
- ✅ 2.7 文档 + 截图 (本版本 v0.7)

### Phase 3 — Admin 后台 ⏳ 30% (v0.10 已收 3.1+3.2+3.3)
- ✅ 3.1 Auth 完整闭环 (自建 JWT, Q17 修订) (e123591)
- ✅ 3.2 帖子 CRUD (c532f46)
- ✅ 3.3 小说三层 CRUD (Novel + Volume + Chapter, 含 status 切换 + 级联软删) (本次)
- [ ] 3.4 视频系列管理 (黑推荐下一站)
- [ ] 3.5 页面管理
- [ ] 3.6 媒体库 (上传/多尺寸/blurhash/MediaUsage 引用追踪 + 删除警告) — Q19 待拍
- [x] 3.7 Page Builder v1 (CustomHtml 受 SiteConfig.allowCustomHtml 开关控制 + DOMPurify 清洗) — Q18 待拍
- [ ] 3.8 站点设置 (SiteConfig 全字段编辑)
- [ ] 3.9 用户管理 (含改密码踢所有 session)
- [ ] 3.10 部署加固 + 2c4g 压测 — Q20 待拍
- [ ] 百度 Worker 独立仓库 (Q3/Q7/Q10) — **需老板建仓决策**

### Phase 4 — 打磨 ⏳ 0% (v0.9+)
- [ ] 动画细节 (Lenis scroll + Block 入场)
- [ ] 性能 (Lighthouse ≥ 95, LCP < 1.5s)
- [ ] 双仓库部署脚本 (`deploy-main.sh` + `deploy-worker.sh`)
- [ ] `/api/health` 完整版 (含 baiduWorker 检查)
- [ ] README + 运营文档 + Worker 仓 README
- [ ] 监控告警 (Plausible + Worker 失败率)
- [ ] **2c4g 部署验证 (黑必做) — v0.4 部署方案**:
  - [ ] 准备 2c4g 测试环境 (老板给或本地模拟)
  - [ ] `DEPLOY_MODE=prod-4g` 跑通完整链路
  - [ ] 上传 50 张图 + 10 篇 Post, 监控内存峰值 < 1.4G
  - [ ] 24h 压力测试, 无 OOM, 无 PM2 重启
  - [ ] swap 配置验证 + logrotate 验证
  - [ ] sharp 串行 vs 并发内存对比 (附数据)
- [ ] 部署文档 (含 4c16g vs 2c4g 双路线)

## 阶段依赖 & 风险

| 依赖项 | 风险 | 缓解 |
|---|---|---|
| Auth 完整闭环 | NextAuth 集成复杂度 | Phase 3 优先做, F.1 老板可只做 username/password |
| **百度 Worker 独立仓** 🆕 | 老板建仓决策 + 双仓 PR 同步 | 接口契约文档化 + 老板拍 Q3/Q7/Q10 后启动 |
| CustomHtml 开关 UX | 站长找不到开关 | Settings UI 显著位置 + 二次确认弹窗 |
| Page Builder 复杂度 | 工期超 | v1 模板化 (固定 5-6 模板), v2 自由搭建 |
| **Novel 三层 UI** 🆕 | 后台层级多 | seed.ts 示例充分 + UI 分步引导 |
| **FTS5 同步失败** | 搜索不到新文章 | 降级 LIKE + Admin /admin/reindex 重建按钮 + 定时 cron |
| 媒体库磁盘 | 大量图占空间 | sharp 压缩 + 备份策略 |
| **2c4g 内存紧张** | OOM kill | WAL + sharp 并发=1 + heap=1.5G + swap=2G |
| **sharp 跨平台编译** | 生产机编译失败 | 开发机编译好, npm ci --ignore-scripts 跳过 |
| **中文 FTS5 分词** 🆕 | unicode61 不支持中文分词 | 单字精确匹配 + LIKE 降级 + 后续 jieba 字典 |

## Phase 2 收官统计

| 维度 | 数据 |
|---|---|
| 远端 commit | 17 (从 v0.1 ff30bba → v0.7 f34f30a) |
| 代码文件 | 14 (.ts/.tsx/.mts) |
| 代码行数 | ~1700 (不含 test) |
| 测试文件 | 9 (.test.ts/.test.mts/.spec.ts) |
| 测试用例 | **133** (54 unit + 31 integration + 44 e2e + 4 visual) |
| 截图 | 18 张入仓 |
| 文档 | 8 个 md |
| 部署配置 | 3 档 (dev / prod-16g / prod-4g, 文档完整) |
| 真发 publish | 0 (待 P3 Auth 完整 + 部署到生产机) |

## Phase 3 / 4 老板待拍板 (Q16 → Q24+)

| 决策项 | 候选 | 黑推荐 |
|---|---|---|
| Q17 | Auth 完整 (NextAuth? / 自建 JWT? / 暂时只 username+password?) | **NextAuth + Credentials** (生态成熟, OAuth 后续可加) |
| Q18 | Page Builder v1 范围 (模板化 5-6 套? / 自由搭建?) | **模板化 v1, 自由 v2** (Phase 3 不引入新风险) |
| Q19 | 媒体库存储 (本地? / S3? / Cloudflare R2?) | **本地先, R2 后** (Phase 3 跑通, Phase 4 引 R2 CDN) |
| Q20 | 部署目标 (老板给的 2c4g? / 还是先 4c16g 跑?) | **先 4c16g, Phase 4 末 2c4g 压测** |
| Q21 | 监控 (Plausible 自部署? / Umami? / Google Analytics?) | **Umami 自部署** (隐私友好 + 不被广告拦截) |
| Q22 | 评论 (Phase 4 +? / 完全不要?) | **暂时不要** (风险控制优先) |
| Q23 | 视频 (B 站嵌入? / 自托管? / YouTube?) | **B 站嵌入** (国内访问稳定) |
| Q24 | 邮件通知 (NextAuth 邮件? / 评论通知? / 部署告警?) | **部署告警走企业微信** (老板已有 webhook) |

> 💡 **Phase 3 启动条件**: 老板回 Q17-Q20 (4 决策) → 黑开 Phase 3.1 (Auth + Admin 布局)。
