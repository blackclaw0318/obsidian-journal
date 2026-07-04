# Phase 3 计划 — v0.33.0 媒体 / 视频 UX 修复 (P0-) — 2026-07-04

> **状态**: 📋 方案稿,等老板拍板
> **作者**: 黑
> **触发**: 老板 11:05 反馈 3 个公开端 / admin 端 UX 问题
> **预估工时**: ~3-4h(含测试)
> **风险**: 低 (UI + 客户端交互层,不动 schema)

---

## 🎯 老板反馈 (2026-07-04 11:05)

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 公开 `/media` 页面: 点击卡片无反应,图片/视频/文档/音频无法预览 | **P0** (核心功能坏) |
| 2 | admin `/admin/media` 上传: 无进度条, 无成功/失败 toast, 只能刷新看结果 | **P1** (体验差) |
| 3 | 公开 `/videos` 页面: 点击标题无反应, "只展示视频标题" 老板不喜欢 | **P1** (核心交互坏 + 视觉缺预览) |

---

## 🔍 根因诊断 (用数据说话)

### 问题 1: `/media` 卡片无预览

**文件**: `app/media/page.tsx` (公开端)

**现状代码**:
```tsx
<div key={m.id} className="overflow-hidden rounded border border-border bg-bg-card">
  <div className="flex aspect-video items-center justify-center overflow-hidden bg-bg-muted">
    {isImage ? <img src={m.url} ... /> : isVideo ? <div>🎬</div> : <div>📄</div>}
  </div>
  <div className="p-3">...</div>
</div>
```

**根因**:
- ❌ 卡片**无 onClick、无 href、无 modal**
- ❌ 非图片/视频类型**只有 emoji 占位**(🎬📄),完全无法预览
- ❌ 视频只有图标,音频/文档无任何视觉提示

**实际数据** (curl /media):
- HTML 中所有卡片都是 `<div>`,无 link wrap
- 卡片 div 没有 `data-*` / `onclick` 任何 click 钩子

---

### 问题 2: 上传无进度 + 无成功失败反馈

**文件**: `app/admin/(admin)/media/_components/MediaUploader.tsx`

**现状代码**:
```tsx
setProgress(`上传中: ${file.name} (${(file.size / 1024).toFixed(0)}KB)...`);
const res = await fetch("/api/admin/media", { method: "POST", body: form });
// 只看最后一行文字
```

**根因**:
- ❌ **fetch() 不支持 upload progress**(浏览器 fetch API 限制,需要 XHR)
- ❌ 进度**只有文字描述**,无进度条 UI
- ❌ 多文件上传时,**只显示最后一个文件的状态**,无逐文件反馈
- ❌ 失败只显示一句话,无错误码 + 无重试

**实际数据**:
- API (`app/api/admin/media/route.ts` POST) 工作正常:验证大小/类型,写文件,返回 `{ ok: true, media }`
- 问题全在**客户端上传组件**

---

### 问题 3: `/videos` 列表无跳转 + 无预览

**文件**: `app/videos/page.tsx`

**现状代码**:
```tsx
<ul className="space-y-3">
  {publishedVideos.map((v) => (
    <li key={v.id} className="border-b border-border pb-3">
      <span className="font-medium">{v.title}</span>  {/* ← 是 span,不是 link! */}
      {v.description && <p className="text-sm text-fg-muted mt-1">{v.description}</p>}
    </li>
  ))}
</ul>
```

**根因**:
- ❌ **标题是 `<span>`,不是 `<Link href={'/videos/${v.slug}'}>`** → 点击无反应
- ❌ **没有 cover_image 渲染**(虽然 videoRepo 已有 cover_image 字段)
- ❌ **没有 duration badge**(虽然 videoRepo 已有 duration 字段)
- ❌ **没有 series 跳详情**(虽然 series 也在 list 里渲染)

**实际数据** (curl /videos HTML):
```html
<li class="border-b border-border pb-3">
  <span class="font-medium">测试</span>     <!-- ← 纯文本, 无 a 标签 -->
</li>
```

**好消息**: `/videos/[slug]` 详情页**已完整工作**:
- ✅ iframe embed (B站/YouTube/通用) 通过 `detectEmbed()` 自动识别
- ✅ B 站 BV ID → `https://player.bilibili.com/player.html?bvid={BV}&autoplay=0`
- ✅ 标题 + 描述 + 系列 + 播放数全有
- ❌ 但列表页根本没链接到详情页,等于这个详情页"无人到达"

**测试视频** `https://www.bilibili.com/video/BV1o7wAzsExJ`:
- `detectEmbed` 已识别为 bilibili
- embed src → `https://player.bilibili.com/player.html?bvid=BV1o7wAzsExJ&autoplay=0`
- 但当前 `c` 这个测试视频 slug 的 embed_url 是 `bilibili.com/video/BV1o7wAzsExJ`(没 https://)— **bug: 缺协议头**,detectEmbed 正则能匹配但应该 normalize

---

## 🛠 修复方案 (4 项, 按优先级)

### 🔴 P0-1: `/media` 卡片预览 modal (核心功能修复)

**改动范围**: 1 个新组件 + 1 个 page 改写

| 文件 | 改动 |
|------|------|
| `app/media/page.tsx` | 客户端组件重构 + 加 `MediaPreviewModal` |
| `app/media/_components/MediaPreviewModal.tsx` | **新增** — client component,按 mime type 渲染 |
| `app/media/_components/MediaCard.tsx` | **新增** — 卡片客户端组件,带 onClick 触发 modal |

**MediaPreviewModal 渲染规则** (按 mime_type):

| mime 前缀 | 渲染方式 |
|-----------|----------|
| `image/*` | 全屏 `<img>` + ESC/外部点击关闭 + 缩放按钮 |
| `video/*` | `<video src={url} controls autoPlay />` |
| `audio/*` | `<audio src={url} controls />` + 居中卡片 |
| `application/pdf` | `<iframe src={url}>` (浏览器原生 PDF 渲染) |
| `text/*` | `<pre>` 文本展示 |
| 其他 application/* | "该类型暂不支持预览, [下载 ⬇](url)" |
| 其他 | 同上 |

**额外细节**:
- 模态框 z-index 在 content 之上 (`z-50` + `fixed inset-0`)
- 点击背景关闭 + ESC 键关闭
- body scroll lock (v0.28 P2-18 已用过的 hook)
- 视频自动播放,音频不自动播放

**复杂度**: 中等 (~80 行 Modal + 50 行 Card 重构)
**风险**: 低 (客户端交互,不动 schema)

---

### 🔴 P0-2: admin 媒体上传 — 真进度条 + 逐文件状态

**改动范围**: 1 个组件重写

| 文件 | 改动 |
|------|------|
| `app/admin/(admin)/media/_components/MediaUploader.tsx` | 完全重写 |

**核心改动**:

1. **用 XMLHttpRequest 替代 fetch**:
```tsx
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
};
xhr.onload = () => { /* ok + 解析响应 */ };
xhr.onerror = () => { /* 网络错误 */ };
xhr.open("POST", "/api/admin/media");
xhr.send(form);
```

2. **每个文件独立卡片**,逐文件状态:
```
┌────────────────────────────────────────────┐
│ 📷 photo.jpg · 2.4MB                       │
│ ████████████░░░░░░░  65%                   │
├────────────────────────────────────────────┤
│ 🎬 clip.mp4 · 18MB                         │
│ ✓ 上传成功                                 │
└────────────────────────────────────────────┘
```

3. **汇总**:"上传 5 个, 4 成功, 1 失败"
4. **失败行带"重试"按钮**

**复杂度**: 中等 (~120 行重写)
**风险**: 低 (XHR 替代 fetch, 行为兼容)

---

### 🟡 P0-3: `/videos` 列表 — 卡片化 + 缩略图

**改动范围**: 1 个 page 重写

| 文件 | 改动 |
|------|------|
| `app/videos/page.tsx` | 完全重写为 grid 卡片 |

**新设计**:
```
┌────────────────────────────┐
│                            │
│  [缩略图 16:9]             │
│  ▶ 10:30                   │
│                            │
├────────────────────────────┤
│ 视频标题 (可点)            │
│ 系列名 · 发布日期           │
└────────────────────────────┘
```

**实现细节**:
- 标题改成 `<Link href={'/videos/${v.slug}'}>`,卡片整块可点击
- 缩略图: `v.cover_image` 优先,fallback 显示 emoji + 提示"未上传封面"
- duration: `v.duration` (秒) → `mm:ss` 格式,角标
- 系列:点击跳 `/videos?series={slug}` 过滤 (本期不做,只渲染名字)

**额外修复**: `/videos/[slug]/page.tsx` 的 `detectEmbed` 缺失 `https://` 协议时**也兼容**(正则不要求 https, 但要 sanity check)

**复杂度**: 小 (~50 行重写)
**风险**: 低

---

### 🟢 P0-4: 测试视频 — 验证 BV ID 端到端 (用老板给的 BV1o7wAzsExJ)

**任务**: 老板提供测试视频,黑端到端验证:
- 列表卡片可点 → 跳到 `/videos/{slug}` 详情页
- 详情页 iframe 嵌入 B 站 player
- 缩略图(如有 cover_image)在列表正确显示
- 验证后**该 slug = "test-bv-1o7w"** 永久保留为示例

**复杂度**: 微小 (~5 min)
**风险**: 0

---

## 📊 总工时 + 风险评估

| 项 | 工时 | 风险 |
|---|------|------|
| P0-1 media preview modal | 1.5h | 低 |
| P0-2 upload progress + status | 1h | 低 |
| P0-3 video card + cover | 0.5h | 低 |
| P0-4 端到端验证 + 测试视频 | 0.5h | 0 |
| **小计** | **3.5h** | 低 |

**测试预计**:
- typecheck / lint / unit / e2e / visual — 全跑一遍
- 新增 e2e: media preview modal (click → image / video / audio 显示), upload progress (XHR → 进度条 0-100%), video card (list → 详情跳)

---

## 📝 给老板拍板的决策点

| # | 决策项 | 选项 | 黑推荐 |
|---|--------|------|--------|
| Q1 | 这次做哪几个? | 全部 / 只 1+2 / 只 1 / 拆开做 | **全部 (3.5h 一气呵成)** |
| Q2 | media preview 用 modal 还是新页? | modal / 新页 / 浏览器原生 fullscreen | **modal (体验最好)** |
| Q3 | 测试视频要不要立即录入? | 是 / 否 | **是 (用老板给的 BV1o7wAzsExJ)** |
| Q4 | 上传进度要不要带取消? | 是 / 否 | **否 (本期不引入新风险, 上传快 20MB 通常 < 5s)** |

---

## ⏸ 等待老板拍板

老板选 Q1-Q4,黑立即开发 + push。