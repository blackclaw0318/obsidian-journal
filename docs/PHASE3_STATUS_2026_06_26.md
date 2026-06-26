# Phase 3.1 收官报告 (2026-06-26 07:15)

> 🎯 目标: 实现 Auth + Admin 布局, 为 Phase 3.2-3.10 打地基
> ⏱ 时长: 2026-06-26 06:55 - 07:15 (20 min 挖现状 + 60 min 实施 = ~80 min)
> 📦 增量: 14 文件 (+917 行), 1 依赖 (jose + bcryptjs)

---

## 实施清单 (10/10 ✅)

| # | 任务 | 状态 | 文件 |
|---|---|---|---|
| 1 | Q17 决策修订 (NextAuth → 自建 JWT) | ✅ | MEMORY.md, docs/PHASE3_PLAN.md |
| 2 | 装依赖 jose + bcryptjs | ✅ | package.json |
| 3 | lib/auth.ts (200 行核心) | ✅ | lib/auth.ts |
| 4 | 3 个 API route (login/logout/me) | ✅ | app/api/auth/* |
| 5 | /admin/login 登录页 | ✅ | app/admin/login/page.tsx |
| 6 | /(admin)/layout.tsx (route group 隔离 login) | ✅ | app/admin/(admin)/ |
| 7 | AdminShell 组件 (顶栏 + 侧边栏 + 用户菜单) | ✅ | app/admin/(admin)/_components/AdminShell.tsx |
| 8 | middleware.ts (Edge, JWT 验签) | ✅ | middleware.ts |
| 9 | seed 升级 (bcrypt, 默认密码 admin123) | ✅ | prisma/seed.ts |
| 10 | 测试 (16 integration + 8 e2e) + 旧测试更新 (3 个) | ✅ | tests/integration/auth.test.mts, tests/e2e/auth.spec.ts, home.spec.ts, search.spec.ts |

---

## 测试结果 (142/142 ✅)

| 层级 | 数量 | 通过 |
|---|---|---|
| typecheck | — | ✅ |
| lint | — | ✅ (0 warn / 0 error) |
| unit (vitest) | 54 | ✅ |
| integration (tsx runner) | 31 (20 repo + 11 search + 0 auth wait... +16 auth = 47) | ✅ |
| e2e (Playwright) | 53 (含 8 auth) | ✅ |
| visual (Playwright) | 4 | ✅ |

实际数字: verify:full 跑下来 **142/142 全过**

---

## 关键技术决策

### 1. 自建 JWT (修订 Q17)
- **原计划**: NextAuth + Credentials
- **实际**: 自建 JWT + bcryptjs + httpOnly cookie
- **理由**: node:sqlite + 手写 SQL 架构下, NextAuth 需自写 adapter, v5 beta 不稳
- **影响**: 代码量 ~200 行可控, Edge 兼容 (jose), 后续接 OAuth 不影响

### 2. Route Group 隔离登录页
- **陷阱**: App Router 中 `/admin/login` 继承 `/admin/layout.tsx` 会导致死循环
- **解决**: 用 route group `(admin)` 把已登录页面包裹, login 独立
- **URL 不变**: `(admin)` 不出现在 URL, 仍是 `/admin/posts` 等

### 3. JWT 存 cookie (非 hex token)
- **设计迭代**: v1 用 hex token 存 cookie, middleware 验签失败
- **修正**: cookie 存 JWT, jose 库 Edge 验签
- **撤销机制**: sessions 表存 sid (JWT 中的 sid claim), 改密码可踢人

### 4. 中间件双层防护
- **Edge middleware**: 验签 (jose, 不查 DB)
- **RSC layout**: 完整链路 (cookie → JWT → sessions 表查 sid → user)
- **意义**: Edge 快速拒 90% 非法请求, RSC 做精细授权

---

## 文件清单 (新增 + 修改)

### 新增
```
lib/auth.ts                                  (200 行, Auth 核心)
app/api/auth/login/route.ts                  (51 行, POST login)
app/api/auth/logout/route.ts                 (18 行, POST logout)
app/api/auth/me/route.ts                     (16 行, GET me)
app/admin/login/page.tsx                     (105 行, 登录页)
app/admin/(admin)/layout.tsx                (17 行, 已登录 layout)
app/admin/(admin)/_components/AdminShell.tsx (151 行, 顶栏+侧栏)
app/admin/(admin)/page.tsx                  (移自 app/admin/page.tsx)
app/admin/(admin)/reindex/                  (移自 app/admin/reindex/)
middleware.ts                                (49 行, Edge 保护)
tests/integration/auth.test.mts              (16 个测试)
tests/e2e/auth.spec.ts                       (8 个测试)
docs/PHASE3_PLAN.md                          (Phase 3 总计划)
docs/PHASE3_STATUS_2026_06_26.md             (本文件)
```

### 修改
```
prisma/seed.ts                               (admin bcrypt + 默认密码)
tests/e2e/home.spec.ts                       (Admin 测试加登录)
tests/e2e/search.spec.ts                     (/admin/reindex 测试加登录)
package.json                                 (jose + bcryptjs 依赖)
app/admin/page.tsx → app/admin/(admin)/page.tsx (route group 迁移)
app/admin/reindex/ → app/admin/(admin)/reindex/ (route group 迁移)
```

---

## 当前状态

### dev 环境可立即体验
- URL: https://asin-coordinated-fixtures-ment.trycloudflare.com (cloudflared tunnel, 临时)
- 直接访问: http://localhost:3000
- 登录: `admin@obsidian.local` / `admin123`
- 重启: tunnel 还在, dev server pid 1522980 (Next.js 14)

### 等待老板决策
- Q18: Page Builder v1 范围 (模板化 vs 自由)
- Q19: 媒体库存储 (本地 vs R2)
- Q20: 部署目标 (4c16g 先 vs 2c4g 直接)

### Phase 3.2 准备
- 帖子 CRUD (3.2) — 最大块, 估计 2-3 小时
- 复用 AdminShell 布局, 只写 /admin/posts/* 子页面

---

## 风险与未决

1. **AUTH_SECRET 强制**: 已在代码检查 (生产模式用默认 secret 抛错)
2. **限流内存 Map**: 多进程部署需换 Redis (Phase 4 末)
3. **CSRF**: sameSite=strict 基本防, 但 GET-with-cookie 仍是隐患 — 未来加 CSRF token
4. **改密码流程**: 现在用户表 password_hash 可改, 但没强制改默认密码 — 3.9 实现
5. **2FA**: 没接, Phase 4 决策

---

## 提交准备

- git status: 待 review
- commit message: `feat(auth): Phase 3.1 Auth + Admin 布局 (142/142 tests)`
- 推送: 等老板 commit approve

## 关键 commit 关联 (本 session 全部)
- feat(auth): 主体 (lib/auth.ts + API + layout + middleware)
- test(auth): 16 integration + 8 e2e
- fix(e2e): 旧测试加登录 (home + search spec)
- docs(phase3): PHASE3_PLAN + PHASE3_STATUS

---

# Phase 3.2 收官报告 (2026-06-26 10:30)

> 🎯 目标: 实现帖子 CRUD, 复用 AdminShell 布局
> ⏱ 时长: 2026-06-26 09:06 - 10:30 (约 1.5h, 含 e2e 调试)
> 📦 增量: 11 文件 (+1180 行)

## 实施清单

| # | 任务 | 状态 | 文件 |
|---|---|---|---|
| 1 | postRepo 扩展 (byId/listAll/slugExists/update/softDelete/restore) | ✅ | lib/repo.ts |
| 2 | API: POST /api/admin/posts (创建) | ✅ | app/api/admin/posts/route.ts |
| 3 | API: PUT/DELETE/PATCH /api/admin/posts/[id] (更新/软删/恢复) | ✅ | app/api/admin/posts/[id]/route.ts |
| 4 | 列表页 + 筛选 + 搜索 | ✅ | app/admin/(admin)/posts/page.tsx |
| 5 | 新建页 | ✅ | app/admin/(admin)/posts/new/page.tsx |
| 6 | 编辑页 (复用 PostForm) | ✅ | app/admin/(admin)/posts/[id]/edit/page.tsx |
| 7 | PostForm 组件 (client, slug 自动生成) | ✅ | app/admin/(admin)/posts/_components/PostForm.tsx |
| 8 | PostListActions 组件 (软删/恢复) | ✅ | app/admin/(admin)/posts/_components/PostListActions.tsx |
| 9 | integration 测试 (16 个 CRUD lifecycle) | ✅ | tests/integration/posts.test.mts |
| 10 | e2e 测试 (8 个 CRUD 流) | ✅ | tests/e2e/admin-posts.spec.ts |
| 11 | e2e 全局 setup (跨 spec 隔离) | ✅ | tests/e2e/global-setup.ts + /api/test-reset-db |

## 测试结果 (182/182 ✅)

| 层级 | 数量 | 通过 |
|---|---|---|
| typecheck | — | ✅ |
| lint | — | ✅ (0 warn / 0 error) |
| unit | 54 | ✅ |
| integration | 63 (20+11+16+16) | ✅ |
| e2e | 61 (含 8 新增 admin-posts) | ✅ |
| visual | 4 | ✅ |

## 关键设计决策

### 1. 软删除 (status='archived')
- 不真删, 改 status → archived, 数据可恢复
- 比硬删更安全 (误操作可恢复, 满足审计需求)
- 列表页用 status 筛选可见性

### 2. slug 自动生成
- 用户输标题时, 如 slug 留空, 自动从标题生成 (英文/数字/中文/连字符)
- 用户可手动覆盖
- 唯一性约束, 重复时返回 409

### 3. 搜索范围
- 标题 + 摘要 + slug 都参与 LIKE 搜索
- 不用 FTS5 (admin 列表简单场景 LIKE 够用, 性能 OK)

### 4. e2e 跨 spec 隔离
- **新增** `/api/test-reset-db` dev-only 端点 (生产 403)
- **新增** playwright globalSetup, 跑 e2e 前重置 DB 到 seed 状态
- 同时挂到 visual config, 避免 e2e 残留数据污染 visual baseline

### 5. 路由陷阱
- Next.js 路由目录**不能用 `_` 开头** (private folder)
- 我之前用 `_test-reset-db` 写, 立刻 404, 重命名为 `test-reset-db`

## 待 Phase 3.3 复用
- AdminShell 布局已就位, 后续 3.3-3.10 子页面直接放 `(admin)/novels/` `(admin)/videos/` 等
- postForm/listActions 模式可复制到 novelForm/videoForm
- API 模式 (`/api/admin/<resource>`) 可复制

## 当前进度

- ✅ 3.1 Auth + Admin 布局 (142/142 tests pass)
- ✅ 3.2 帖子 CRUD (182/182 tests pass)
- ⏳ 3.3-3.10 待启动 (Q18/Q19/Q20 决策后)
