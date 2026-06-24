# 路线图 (v0.2)

> 总览, 详细见 `DESIGN.md` §15。

```
2026-06-24  ┌─ Phase 0 (本阶段) ─┐ 立项 + 方案 v0.2 ✅
            │                    │ ⏳ 等老板拍板 9 决策
            └────────────────────┘
2026-06-25~  ┌─ Phase 1: 骨架 ──┐ Next.js + Auth + 首页 + Block 框架
            └────────────────────┘ ~3-5 天
2026-07-01~  ┌─ Phase 2: 展示 ──┐ 5 专栏 + 详情 + 系列 + 视频 + 搜索
            └────────────────────┘ ~3-5 天
2026-07-08~  ┌─ Phase 3: Admin ┐ MD 上传 + Page Builder + 媒体库 + 视频
            └────────────────────┘ ~7-10 天 (v0.2 加量)
2026-07-22~  ┌─ Phase 4: 打磨 ─┐ 性能 + 动画 + 部署 + Worker
            └────────────────────┘ ~3-5 天
```

## 阶段目标 & 验收

### Phase 0 — 准备
- ✅ 仓库 + 方案 v0.1
- ✅ 老板反馈 → v0.2 重写 (Page Builder 升级 + B 方案 + 媒体库 + Series)
- ⏳ 老板拍板 Q1-Q9

### Phase 1 — 骨架 (3-5 天)
- [ ] `pnpm dev` 一键启动
- [ ] `schema.prisma` 全 v0.2 模型 (Post + Chapter + Series + Page + Media)
- [ ] seed.ts: 1 Series + 2 Post + 2 Chapter + 1 Video + 3 Media + Page("home") 配 3 Block
- [ ] Auth.js + 登录 + Middleware
- [ ] 基础布局 + 双主题 (默认亮色) + Lenis
- [ ] **Page + Block 渲染框架** (registry + 13 种 renderer 雏形)
- [ ] 首页 (Page("home") + Block[Hero, Stats, Posts])
- [ ] Lighthouse 移动 ≥ 90

### Phase 2 — 内容展示 (3-5 天)
- [ ] 5 大专栏列表页 (tech/life/novels/videos/about)
- [ ] Post + Chapter 详情页 + Shiki + TOC
- [ ] **Series 列表 + 详情页** 🆕
- [ ] 视频列表 + B 站 + 百度 (B 方案) + YouTube
- [ ] **FTS5 搜索 (SiteNav 顶部搜索框)** 🆕
- [ ] SEO: sitemap / robots / OG
- [ ] 移动端 375px 排版
- [ ] Lighthouse 移动 ≥ 92

### Phase 3 — Admin 后台 (7-10 天, v0.2 加量)
- [ ] Admin 布局 + 侧边栏 + Dashboard
- [ ] **MD 上传 (区分 article/chapter + 系列选择 + slug 校验)** 🆕
- [ ] Post / Chapter / Series CRUD
- [ ] 视频管理 (B 站/百度 B 方案/YouTube, 粘贴即解析)
- [ ] **媒体库 (上传/多尺寸 WebP/blurhash/搜索/引用追踪)** 🆕
- [ ] **Page Builder (3 栏: Block 库 + 预览 + 配置表单 + 拖拽排序 + zustand + 防抖)** 🆕 核心
- [ ] 站点设置 (站名/简介/友链/默认主题)
- [ ] 系统页 vs 自定义页管理
- [ ] **百度 Worker 独立部署** 🆕

### Phase 4 — 打磨 (3-5 天)
- [ ] 动画细节 (L6/L7 Block 拖拽/入场)
- [ ] 性能 (Lighthouse ≥ 95, LCP < 1.5s)
- [ ] 部署脚本 (`deploy.sh` 含 Worker 部署)
- [ ] README + 运营文档 + 备份恢复 SOP
- [ ] 健康检查 `/api/health` 完整版
- [ ] 监控告警 (Plausible + Worker 失败率)

## 阶段依赖 & 风险

| 依赖项 | 风险 | 缓解 |
|---|---|---|
| 老板 9 决策 | 阻塞 Phase 1 | 老板当天拍板 |
| 百度 B 方案 Worker | 反爬升级 → 失效 | `.env` 一键切 C, 监控失败率 |
| Page Builder 复杂度 | 后台 UI 工期超 | v0.2 自由搭建已平衡, 模板 v2 再加 |
| 媒体库 sharp 处理 | 大图上传 OOM | 流式处理 + 限制 10MB |
| FTS5 中文分词 | 效果一般 | `unicode61` + 后续 `trigram` |
