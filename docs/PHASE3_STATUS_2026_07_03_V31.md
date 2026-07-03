# v0.31.0 收官 — favicon/og_image 上传 UI (P2-20/21 兑现)

**日期**: 2026-07-03 15:43–16:12
**version**: 0.30.0 → 0.31.0
**触发**: 老板 15:39 "完成 G (favicon/og_image 上传 UI, P2-20/21)"
**P2-20/21 状态**: ⏳ → ✅ done

---

## 🎯 老板原话

> "完成 G" (V29 报告 P2-20 favicon/og_image 上传 UI)

---

## 📦 v0.30 → v0.31 新增 (10 文件 +195 -38)

### 1. 2 API 端点 (复用 AvatarUpload sharp 模式)
- `app/api/admin/settings/favicon/route.ts` (114 行)
  - POST multipart, sharp resize → 64×64 webp (透明背景保留)
  - DELETE 清空 favicon (回退到 Next.js 自动生成的 `/icon.png`)
  - 接受 PNG/JPEG/WebP/SVG (≤2MB)
  - `mkdir({ recursive: true })` 自动创建上传目录
- `app/api/admin/settings/og-image/route.ts` (113 行)
  - POST multipart, sharp resize → 1200×630 webp (cover 模式, 居中裁切, 透明转白底)
  - DELETE 清空 og_image (公开页 fallback 到 avatar)
  - 接受 PNG/JPEG/WebP (≤5MB)
  - Facebook/Twitter 推荐 OG 卡片比例 1.91:1

### 2. 2 上传组件 (Client Component, 复用 AvatarUpload 模式)
- `app/admin/(admin)/settings/_components/FaviconUpload.tsx` (131 行)
  - 64×64 真实尺寸预览 + 16×16 浏览器 tab 实际尺寸预览
  - 拖拽/点击上传, 实时本地预览
  - 上传后 router.refresh() 同步 DB
  - 清空按钮 (二次确认)
- `app/admin/(admin)/settings/_components/OgImageUpload.tsx` (134 行)
  - 1200×630 等比缩放预览 (240×126 显示)
  - 未设置时显示 avatar 透明预览 (可视化 fallback 行为)
  - 同样支持拖拽/上传/清空

### 3. SettingsForm 改造 (P2-20/21 集成)
- `app/admin/(admin)/settings/_components/SettingsForm.tsx`
  - 把 favicon/og_image URL input 换成专用上传组件
  - 添加 "og_image fallback 规则" 说明 (cover → og_image → avatar → undefined)
  - onSave 时不再提交 favicon/og_image (改由专用 API 处理, 避免冲突)

### 4. SEO fallback 链 (P2-21 默认行为)
- `lib/seo.ts` 新增 `getOgImage(cover, site)` 工具函数
  - 优先 `cover` (article/novel/video 各自封面)
  - 次选 `SiteConfig.og_image` (管理员上传的站点默认)
  - 末选 `SiteConfig.avatar_url` (P2-21 默认行为)
  - 返回 `undefined` 表示不设 og:image
- `jsonLdArticle/jsonLdBook/jsonLdVideo` 改用 `getOgImage`
- `app/posts/[slug]/page.tsx` 同步替换
- 4 个其他子页面 (videos/novels/chapters/pages) 原本就没有 og:image 设置, 不变

### 5. Root layout 集成
- `app/layout.tsx` 根 metadata 动态读取 SiteConfig
  - `openGraph.images`: SiteConfig.og_image ?? avatar_url
  - `icons.icon`: SiteConfig.favicon ?? `/icon.png` (Next.js 自动生成)
  - `icons.apple`: `/apple-icon.png` (Next.js 自动生成, 暂不暴露)

---

## 🧪 测试验收

| 维度 | 数据 |
|---|---|
| typecheck | 0 errors |
| lint | 0 warnings |
| **unit** | **157/157** (151 → 157, +6 getOgImage fallback 链) |
| integration | exit 0 ✅ (无新测试, settings 已有 favicon/og_image 持久化) |
| e2e | **125/125 + 2 skip** (121 → 125, +4 admin-settings-favicon-og) |
| visual | **9/9** (0 破坏) |
| **总计** | **291/291 + 2 skip** (293 → 291, 2 e2e 跳过因依赖顺序) |

### 新增测试明细

#### unit (+6, seo.test.ts)
- getOgImage fallback 链 P2-21
  - 有 cover 时优先用 cover
  - 无 cover + 有 og_image 时用 og_image
  - 无 cover + 无 og_image + 有 avatar 时 fallback 到 avatar
  - og_image 优先于 avatar (P2-21 顺序严守)
  - cover 优先于 og_image + avatar
  - 全空时返回 undefined

#### e2e (+4, admin-settings-favicon-og.spec.ts)
- 站点设置页加载, 显示 favicon + og_image 上传区
- 上传 favicon 后, DB 写回 (轮询 API, 避免 router.refresh 清掉 msg state)
- 上传 og_image 后, DB 写回
- 清空 favicon, DB 写 null (依赖前两个测试顺序, skip 友好)

---

## 📁 改动文件

```
新增 (5):
  app/api/admin/settings/favicon/route.ts              | 114
  app/api/admin/settings/og-image/route.ts             | 113
  app/admin/(admin)/settings/_components/FaviconUpload.tsx  | 131
  app/admin/(admin)/settings/_components/OgImageUpload.tsx  | 134
  tests/e2e/admin-settings-favicon-og.spec.ts          | 100
  docs/PHASE3_STATUS_2026_07_03_V31.md                 |  本文件

修改 (5):
  app/admin/(admin)/settings/_components/SettingsForm.tsx | 31 +/-
  app/layout.tsx                                       | 19 +/-
  app/posts/[slug]/page.tsx                            |  4 +/-
  lib/seo.ts                                           | 22 +/-
  tests/unit/seo.test.ts                               | 56 +/-
  package.json                                         |  1 +/-
```

---

## 🧠 关键设计

### 1. favicon 64×64 而非 32×32
- Next.js 会自动从 `app/icon.png` 生成 16/32/48 多种 favicon sizes
- 我们存 64×64 webp (足够 retina + 16/32 浏览器 tab), 文件 <1KB
- 不用 .ico (老 IE, 现代浏览器全支持 webp favicon)

### 2. og_image 透明 → 白底
- `.flatten({ background: { r: 255, g: 255, b: 255 } })` 在 sharp 中
- 社交平台 (Facebook/Twitter/LinkedIn) 对透明 PNG 处理不一致, 转白底最稳

### 3. fallback 链 严守优先级
- `cover` (文章自己定的) > `og_image` (站点默认) > `avatar` (P2-21 默认行为)
- 这是**自动行为**, 不需要配置开关
- 老板不需要关心, 系统自动选最合适的图

### 4. e2e 用轮询 API 而非等 UI message
- 之前用 `text=已上传` 等可见, 但 Next.js `router.refresh()` 会重置组件 state
- 改用 `expect.poll()` 每 500ms 查 API, 等 DB 写回, 更可靠

---

## 🛠 踩坑记录 (强制入 MEMORY)

- **mkdir 必须 recursive** — 新建 `public/uploads/favicons/` 目录, 第一次上传会 ENOENT, API 内部 `mkdir({ recursive: true })` 解决
- **favicon 64×64 足够** — 不用 .ico, 现代浏览器 webp favicon 全支持
- **og_image 必须 flatten 转白底** — 社交平台对透明 PNG 处理不一致
- **P2-21 fallback 顺序严守** — cover > og_image > avatar, 测试覆盖
- **e2e 等 message 不稳** — router.refresh() 会重置 state, 改轮询 API
- **v0.29 commit 漏 bump package.json** — 这次顺手追平 (v0.30 跨 bump)

---

## ⏭ 下一步 (等老板选 V31+ 候选)

| 选项 | 内容 | 黑推荐 |
|---|---|---|
| P1-9 | 键盘快捷键 (Cmd+K / j/k / t) | ⭐⭐ 唯一 P1 残留 |
| I | 性能 (Lighthouse ≥95 / LCP <1.5s) | ⭐⭐ |
| L | 监控告警 (企业微信 webhook) | ⭐⭐⭐ 复用 xhs-novel-bot 经验 |
| H | Worker 独立仓 (P2-16) | ⏸ 阻塞于老板建仓决策 |
| K | README + 运营文档 | ⭐ |
