# Phase 3 计划 (Admin + 媒体 + 部署加固)

> 📅 启动: 2026-06-26
> 🎯 目标: 把 dev 版 obsidian-journal 升级为可日常运营的管理后台
> 📦 范围: 14 model 已有, 补 Auth + Admin 布局 + 内容编辑 + 媒体库 + 部署

---

## 决策 (Q17-Q20)

| # | 决策 | 黑推荐 | 备注 |
|---|---|---|---|
| Q17 | Auth 方案 | **自建 JWT + httpOnly cookie** (修订原 NextAuth 推荐) | node:sqlite + 手写 SQL 架构下, NextAuth 集成成本高 |
| Q18 | Page Builder v1 范围 | 模板化 5-6 套 | 自由 Block 搭建留 v2 |
| Q19 | 媒体库存储 | 本地先, R2 后 | Phase 3 本地, Phase 4 接 R2 |
| Q20 | 部署目标 | **实际昆实: 不做 2c4g 压测 (老板 2026-07-02 22:22 拍板, dev 环境 4c16g 足) |
### Q17 修订理由
原推荐 NextAuth + Credentials, 实施时发现:
- NextAuth 需 ORM adapter (Prisma/Drizzle), 与本项目 **手写 SQL + node:sqlite** 冲突
- NextAuth v5 (Auth.js) 仍 beta, v4 对 App Router 支持不完善
- 自建 JWT + bcryptjs 完整可控, 代码量 ~200 行, jose 库 Edge 兼容
- 后续要接 OAuth (Google/GitHub) 不影响, JWT 是 stateless 通用 token

---

## 子任务拆分 (10 个)

### 3.1 Auth + Admin 布局 ✅ (2026-06-26)
- [x] lib/auth.ts (bcrypt + jose + sessions 表)
- [x] /api/auth/{login,logout,me} 3 endpoints
- [x] /admin/login 登录页
- [x] /admin/(admin)/layout.tsx (顶栏 + 侧边栏 + 用户菜单)
- [x] middleware.ts (Edge, JWT 验签)
- [x] seed admin 升级 (bcrypt, 默认密码 admin123)
- [x] tests: 16 integration + 8 e2e + 0 unit (auth 全在 integration)
- [x] typecheck/lint/verify:full 142/142 全过
- [x] 旧测试更新: home + search spec 加登录 (Phase 3.1 收口)

### 3.2 帖子管理 (Posts CRUD) ⏳
- [ ] /admin/posts 列表 (含搜索/筛选/分页)
- [ ] /admin/posts/new 新建
- [ ] /admin/posts/[id]/edit 编辑
- [ ] /admin/posts/[id]/delete 软删除
- [ ] Markdown 编辑器 (轻量, 无需富文本)
- [ ] 标签管理
- [ ] 测试: integration CRUD + e2e 编辑流

### 3.3 小说 + 章节管理 ⏳
- [ ] /admin/novels 列表
- [ ] /admin/novels/[id] 卷管理
- [ ] /admin/novels/[id]/volumes/[vid]/chapters 章节管理
- [ ] 测试

### 3.4 视频系列管理 ⏳
- [ ] /admin/videos 列表
- [ ] /admin/video-series 系列管理
- [ ] 测试

### 3.5 页面 (Page) 管理 ⏳
- [ ] /admin/pages 列表 (Phase 3 用 Page 做"关于"等静态页)
- [ ] 简单文本/Markdown 编辑
- [ ] 测试

### 3.6 媒体库 (Media) ⏳
- [ ] /admin/media 列表
- [ ] 上传接口 (multipart/form-data)
- [ ] 引用追踪 (MediaUsage 关联 Post/Chapter/Page/Video)
- [ ] 测试

### 3.7 Page Builder (Block) ⏳
- [ ] /admin/page-builder 自由 Block 编辑 (Q18 决策: 模板化 v1)
- [ ] 5-6 套模板 (首页/关于/链接页/项目展示/小说介绍)
- [ ] Block: 13 种类型支持 (Q1)
- [ ] 测试

### 3.8 站点设置 (SiteConfig) ⏳
- [ ] /admin/settings SiteConfig 编辑
- [ ] Socials 管理
- [ ] Favicon / OG image 上传
- [ ] 测试

### 3.9 用户管理 ⏳
- [ ] /admin/users 列表 (admin role 才能进)
- [ ] 创建/改密码/禁用
- [ ] 测试

### 3.10 部署加固 (v0.17) ✓

- [x] .env 模板 + setup.sh (v0.17)
- [x] healthcheck.sh (v0.17)
- [x] backup.sh (v0.17)
- [x] deploy.sh (v0.17)
- [x] DEPLOY.md 部署文档 (v0.17)

> ⚠️ “2c4g 压测” 2026-07-02 22:22 老板拍板不做: 原分分压测 2c4g VPS 能手室内访问量, dev 环境 4c16g 足, 压测无意义. 原 Q20 停机.

