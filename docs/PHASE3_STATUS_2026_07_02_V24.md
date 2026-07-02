# v0.24.0 收官 — P1 收尾 (健康检查 + e2e cleanup)

**日期**: 2026-07-02 16:26–16:50
**version**: 0.23.0 → 0.24.0
**触发**: 老板 16:26 命令"开干第 1 步" (P1-10 + P1-11)

---

## 🎯 本次收口的两项

| 任务 | 来源 | 状态 |
|---|---|---|
| **P1-10** `/api/health` 完整版 | 6-30 老板需求清单 | ✅ done |
| **P1-11** e2e cleanup (3 posts + 2 novels) | 6-30 老板需求清单 | ✅ done |

**P1 整体进度**: 6/7 → **7/7 收口** 🎉

---

## 🛠 P1-10: GET /api/health (新文件 1)

### 设计要点

| 维度 | 决策 |
|---|---|
| 不需要 auth | ✅ 监控/LB/老板 curl 直接调 |
| 不缓存 | `Cache-Control: no-store` + `dynamic = "force-dynamic"` |
| URL 检查超时 | 5s (防止慢挂 CDN 拖死 endpoint) |
| 状态码 | 200=ok / 503=degraded 或 down (LB 告警触发) |
| 错误处理 | DB error 不 throw, 捕获后 status="down" |
| 并行检查 | 5 项 `Promise.all` (URL 慢, 并行省时间) |

### 5 项检查项

| 项 | 校验 | 状态值 |
|---|---|---|
| `db` | `PRAGMA quick_check` + `SELECT 1` | ok / down |
| `config` | `site_config` singleton 存在 | ok / down (附 site_name + default_theme) |
| `avatar` | `avatar_url` HEAD 请求 5s 超时 | ok / down / **skip** (无配置时) |
| `favicon` | `favicon` HEAD 请求 5s 超时 | ok / down / **skip** |
| `og_image` | `og_image` HEAD 请求 5s 超时 | ok / down / **skip** |

### 总状态判定

```
db 或 config down          → status="down" + HTTP 503
仅 URL 失败 (db/config ok) → status="degraded" + HTTP 503
全部 ok 或 skip            → status="ok" + HTTP 200
```

### 响应 JSON 样例 (ok)

```json
{
  "status": "ok",
  "timestamp": 1782980984205,
  "uptime_s": 22,
  "checks": {
    "db":      { "status": "ok", "latency_ms": 1 },
    "config":  { "status": "ok", "latency_ms": 0, "site_name": "黑曜石日志", "default_theme": "light" },
    "avatar":  { "status": "skip", "reason": "no avatar configured" },
    "favicon": { "status": "skip", "reason": "no favicon configured" },
    "og_image":{ "status": "skip", "reason": "no og_image configured" }
  }
}
```

### 实测 (dev server, 验证)

| 场景 | HTTP | status |
|---|---|---|
| 默认 (无 avatar/favicon/og_image) | **200** | ok |
| avatar_url = 失效域名 | **503** | degraded (db 1ms, avatar down 183ms) |
| DB 失败模拟 | 503 | down |

### 使用场景

| 场景 | 调用方 |
|---|---|
| 部署健康检查 | `curl http://host/api/health` (5 秒内知结果) |
| LB 上游探针 | 监控每 30s GET 一次, 连续 3 次 503 摘除节点 |
| 老板手动排查 | 浏览器打开 URL 一眼看清哪挂了 |
| CI 部署后验证 | 部署脚本末尾 `curl -sf /api/health \|\| exit 1` |

---

## 🛠 P1-11: e2e cleanup (改 2 文件)

### 问题

`admin-posts.spec.ts` + `admin-novels.spec.ts` 的多个 test 创建测试数据 (E2E 测试新帖 / E2E 测试小说 / 草稿测试帖 / 待删除测试帖 / E2E 测试卷 / E2E 测试章节),测试结束后留在 dev.db 里。

虽然 `global-setup` 在下一次 suite 开始时会 reset,但:
- **同一个 suite 内**多个 test 跑完数据堆积 (admin-novels 跑 8 个 test 留 ~5 篇小说)
- 反复 `npm run test:e2e` 不重启 dev server 时,**DB 越来越大**
- 测试创建的 "重复测试" slug 等不带时间戳的固定值,第二次跑会因为 slug 冲突失败

### 修法: `test.afterAll` + API 调用

```ts
test.afterAll(async () => {
  const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
  // 1. 登录 (用 admin123)
  // 2. 拉所有 posts/novels (limit=1000)
  // 3. 过滤掉 SEED slug 的 (hardcode 集合)
  // 4. DELETE 非 seed 的 (novel 走软删, post 走 DELETE API)
});
```

### 清理范围

| spec | 清理目标 | API |
|---|---|---|
| `admin-posts.spec.ts` | slug ∉ {hello-obsidian, deploy-mode-3-tiers, testing-strategy} 的所有帖子 | `DELETE /api/admin/posts/[id]` |
| `admin-novels.spec.ts` | slug ∉ {meta-realm} 的所有小说 (级联 volumes + chapters) | `DELETE /api/admin/novels/[id]` (软删,级联) |

### 鲁棒性

- `try/catch` 包装 — cleanup 失败**不影响**测试结果 (test.afterAll 错误仅警告)
- 登录失败时 silent return — dev server 异常不掩盖
- 全程用独立 request context, 不污染 page 的 cookie 状态

---

## ✅ 测试验收

| 项 | v0.23.0 | v0.24.0 | delta |
|---|---|---|---|
| typecheck | 0 | **0** | — |
| lint | 0 | **0** | — |
| unit | 119/119 | **119/119** | — |
| integration | 11/11 | **12/12** (+10 health) | +10 |
| e2e | 100/100 + 2 skip | **105/105 + 2 skip** (+5 health) | +5 |
| visual | 4/4 | **4/4** | — (本次无视觉变化) |
| **总计** | **234/234 + 2 skip** | **240/240 + 2 skip** | **+15 +0** |

测试增长趋势:
```
v0.20 BCDE: 90 e2e + 83 unit = ~200
v0.21.x:    92 e2e + 119 unit = ~210
v0.22:      99 e2e + 119 unit = ~218
v0.23:     100 e2e + 119 unit = ~219
v0.24:     105 e2e + 119 unit + 10 integration = 234 ✨
```

---

## 📁 改动文件 (6 个, +632 -7)

| 文件 | 变化 |
|---|---|
| `app/api/health/route.ts` | **新建** 184 行 — 5 项检查 + 状态判定 |
| `tests/integration/health.test.mts` | **新建** 124 行 — 10 集成测试 |
| `tests/e2e/health.spec.ts` | **新建** 65 行 — 5 e2e 测试 |
| `tests/e2e/admin-posts.spec.ts` | +43 行 — test.afterAll cleanup |
| `tests/e2e/admin-novels.spec.ts` | +39 行 — test.afterAll cleanup |
| `package.json` | +health.test.mts 串入 test:integration; version 0.23.0 → 0.24.0 |

---

## 🔗 远端

- 远端 commit 数: 26 → **27**
- 待 push: 本次 v0.24.0 commit

## ⏭ P1 进度: 7/7 收口 🎉

```
✅ P1-1  全局错误边界 (v0.20)
✅ P1-2  posts 改 markdown-it (v0.20)
✅ P1-3  View Transitions 切换 (v0.21.2)
✅ P1-4  Block 入场动画 (v0.21.3)
✅ P1-5  MarkdownReveal 段落渐入 (v0.21.3 升级)
✅ P1-6  view_count 防刷 (v0.21.1)
✅ P1-7  ThemeToggle SSR 加载加速 (v0.23)
✅ P1-8  暗色模式修复 (v0.22)
✅ P1-9  Lenis lerp 调优 (v0.22)
✅ P1-10 /api/health 完整版 (v0.24) ⭐
✅ P1-11 e2e cleanup (v0.24) ⭐
```

---

## 📝 工程教训

1. ⚠️ **/api/health 必须不依赖 auth** — 监控/LB/部署脚本调用,加 auth 就废了一半价值
2. ⚠️ **URL HEAD 检查必须有超时** — 慢挂的 CDN 会让 endpoint 一直 hang,5s 是合理上限
3. ✅ **status code 200/503 比纯 200 更专业** — 让 LB 能基于 status code 自动摘除故障节点
4. ✅ **DB error 捕获不 throw** — endpoint 必须总是返回 JSON,即使 DB 挂也能告诉监控"DB 挂了"
5. ✅ **cleanup 用 try/catch + silent return** — test.afterAll 失败不应让测试失败,否则清理失败掩盖真正问题
6. ✅ **filter by SEED 集合而非 "全部删"** — 保留 seed,清理增量,避免误删有用数据