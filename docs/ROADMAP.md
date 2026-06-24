# 路线图 (v0.3)

> 总览, 详细见 `DESIGN.md` §15。

```
2026-06-24  ┌─ Phase 0 ──────┐ 立项 + 方案 v0.1/v0.2/v0.3 ✅
            │                 │ ⏳ 等老板拍板 11 决策
            └─────────────────┘
2026-06-25~ ┌─ Phase 1: 骨架 ┐ Next.js + Auth + 全 v0.3 schema + Block 框架
            └─────────────────┘ ~3-5 天
2026-07-01~ ┌─ Phase 2: 展示 ┐ 5 专栏 + 详情 + Novel/Volume + View + FTS5
            └─────────────────┘ ~4-6 天 (v0.3 加 Novel 详情 + View 计数)
2026-07-08~ ┌─ Phase 3: Admin MD 上传 + Page Builder + 媒体库(MediaUsage) +
            │               Novel/Volume/Social/VideoSeries 后台 +
            │               CustomHtml 开关 + FTS5 重建 + Worker 仓
            └─────────────────┘ ~8-12 天 (v0.3 加量)
2026-07-22~ ┌─ Phase 4: 打磨 ┐ 性能 + 动画 + 双仓库部署 + 监控
            └─────────────────┘ ~4-6 天
```

## 阶段目标 & 验收

### Phase 0 ✅
- ✅ 仓库 + v0.1/v0.2/v0.3 方案 (3 轮迭代, 1835→2200 行)
- ⏳ 老板拍板 Q1-Q11

### Phase 1 — 骨架 (3-5 天)
- [ ] `pnpm dev` 一键启动
- [ ] `schema.prisma` **v0.3 完整** (11 model: User/SiteConfig/Social/Series/Novel/NovelVolume/Post/Chapter/VideoSeries/Video/Page/Media/MediaUsage/DailyStat)
- [ ] **seed.ts**: 1 Novel (元界, 2 卷, 4 章节) + 1 Series + 2 Post + 1 VideoSeries + 2 Video + 5 Social + 3 Media + Page("home") 配 5 Block
- [ ] Auth.js + 登录 + Middleware
- [ ] 基础布局 + 双主题 (默认亮色) + Lenis
- [ ] **13 种 Block 渲染器** (含 Callout, 不含 Marquee, Music 标 advanced)
- [ ] 首页 (Page("home") + Block[Hero, Stats, Posts, Callout])
- [ ] View 计数 (Server Action: recordView, 同 IP 24h 防刷)

### Phase 2 — 内容展示 (4-6 天)
- [ ] 5 大专栏列表 (tech/life/novels/videos/about)
- [ ] Post + Chapter 详情页 + Shiki + TOC + **章节前后导航**
- [ ] **Novel 列表 + 详情 + 卷详情** 🆕 (v0.3 加)
- [ ] Series 列表 + 详情 (收紧 tech/life)
- [ ] Video 列表 + B 站 + 百度 (B 方案) + YouTube
- [ ] FTS5 搜索 (顶部搜索框)
- [ ] SEO: sitemap / robots / OG
- [ ] 移动端 375px 排版
- [ ] Lighthouse 移动 ≥ 92

### Phase 3 — Admin 后台 (8-12 天, v0.3 加量)
- [ ] Admin 布局 + Dashboard
- [ ] **MD 上传 (article/chapter 区分, chapter 选 volume)** 🆕
- [ ] **Novel 三层 CRUD** 🆕 (作品→卷→章, 含 status 切换)
- [ ] Series (tech/life) CRUD
- [ ] Video + **VideoSeries** CRUD 🆕
- [ ] **Social CRUD** 🆕
- [ ] 媒体库 (上传/多尺寸/blurhash/**MediaUsage 引用追踪 + 删除警告** 🆕)
- [ ] **Page Builder (CustomHtml 受开关控制 + DOMPurify 清洗)** 🆕
- [ ] **Settings (allowCustomHtml 开关 + 二次确认 + baiduWorkerUrl 配置)** 🆕
- [ ] **Admin /admin/reindex (重建 FTS5 索引 + 显示成功/失败数)** 🆕
- [ ] **百度 Worker 独立仓库开发 + 部署到 Cloudflare** 🆕
- [ ] 站点设置

### Phase 4 — 打磨 (4-6 天)
- [ ] 动画细节 (L6/L7 Block 拖拽/入场)
- [ ] 性能 (Lighthouse ≥ 95, LCP < 1.5s)
- [ ] **双仓库部署脚本** (`deploy-main.sh` + `deploy-worker.sh`) 🆕
- [ ] `/api/health` 完整版 (含 baiduWorker 检查)
- [ ] README + 运营文档 + Worker 仓 README
- [ ] 监控告警 (Plausible + Worker 失败率)

## 阶段依赖 & 风险

| 依赖项 | 风险 | 缓解 |
|---|---|---|
| 老板 11 决策 | 阻塞 Phase 1 | 老板当天拍板 |
| 百度 B 方案 Worker | 反爬 → 失效 | `.env` 切 C, 监控失败率 |
| **CustomHtml 开关 UX** 🆕 | 站长找不到开关 | 文档明确步骤 + Settings UI 显著 |
| Page Builder 复杂度 | 工期超 | 自由搭建平衡, 模板 v2 |
| **Novel 三层 UI** 🆕 | 后台层级多 | seed.ts 示例充分 + UI 引导 |
| **Worker 独立仓库** 🆕 | 双仓 PR 同步成本 | 接口契约 + 文档化 |
| FTS5 同步失败 | 搜索不到新文章 | 降级 + 重建按钮 + cron |
| 媒体库磁盘 | 大量图占空间 | sharp 压缩 + 备份 |
