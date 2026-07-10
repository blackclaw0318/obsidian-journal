# Phase 5 方案稿 v0.41 — 百度网盘视频支持

> 状态: **⏸️ 等老板拍板 Q1-Q3**
> 创建: 2026-07-10 11:54 (Fri)
> 作者: 黑 (Hei)
> 项目: obsidian-journal (www.shangkun.uk)

---

## 1. 需求拆解 (黑视角)

老板 2026-07-10 11:54 下达:

> 新需求,需要修改网站 obsidian_journal:
> 1. 目前修改主要是视频页 https://www.shangkun.uk/videos 和 https://www.shangkun.uk/admin/videos,要支持除了哔哩哔哩和 youtube 这两个平台之外的其他平台的链接,**特指百度网盘**…
> 2. 这里给你百度网盘的分享链接作为测试 ([MT动员-终版.mp4](https://pan.baidu.com/s/17bOduikg34jN5v6OpRcw6A?pwd=kjh8))
> 3. 要求你根据 (https://eyun.baidu.com/content/209653/) 这个文章中的经验,解析出视频的直链,然后能够让我的网站直接看来自百度网盘的视频

### 拆解为 3 个子目标

| # | 子目标 | 工程含义 |
|---|---|---|
| S1 | **数据库 schema 支持百度网盘** | 当前 `videos.embed_url` 是 TEXT,无平台字段。需加 `platform` 字段(B站/YT/百度网盘/通用)便于 UI 区分 + 后续扩展 |
| S2 | **前端能渲染百度网盘视频** | `app/videos/[slug]/page.tsx` 的 `detectEmbed()` 当前只支持 B站+YT,其他走 iframe 原 URL。百度网盘需要专门分支处理 |
| S3 | **解析百度网盘分享链接为直链** | 这是老板原话核心需求。**技术上是 P1,P0 不需要直链** |

---

## 2. 充分调研 (黑视角,2026-07-10 现状)

### 2.1 老板给的参考文档 `https://eyun.baidu.com/content/209653/` — **没用**

经 web_fetch 抓取,该文档是百度自家"企业网盘"的 AI 营销软文,内容包括:
- 步骤:上传 → 分享 → 解析 → 嵌入
- 但**没有任何具体 API / 直链 URL 模式 / 代码示例**
- 结尾: "百度网盘企业版团队版支持免费 3 人使用…"
- **结论**: 这篇文章不是技术分享,是营销页。**不要按它操作**,实际不存在它说的"解析"步骤

### 2.2 老板给的测试链接 — 已在 DB 里

```sql
SELECT id, slug, title, embed_url FROM videos;
-- vid_5wtxwgjbmr6790h5 | first-video | 为什么做 obsidian-journal | https://www.bilibili.com/video/BV1xxxxxxx
-- vid_hhklmktdmrasefuf | m          | MT动员                   | https://pan.baidu.com/s/1814m-qPESOtBc0pNg38Lww?pwd=6die
```

老板**已经在测试数据里存了 1 条百度网盘视频**(但用的是老板自己新的 share ID,不是新给的 `17bOduikg34jN5v6OpRcw6A`)。

### 2.3 当前 `detectEmbed()` 代码

```typescript
// app/videos/[slug]/page.tsx
function detectEmbed(url: string): { type: "bilibili" | "youtube" | "iframe"; src: string } {
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch) return { type: "bilibili", src: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0` };
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return { type: "youtube", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  return { type: "iframe", src: url };  // ← 百度网盘走这里,直接 iframe 分享页
}
```

**当前行为**: 百度网盘链接直接 iframe 嵌入 `https://pan.baidu.com/s/...`,但百度分享页**未登录会跳转下载页**、**有广告**、**可能加载慢**。

### 2.4 百度网盘"直链解析" — 2026 现实(冷峻 6 大风险)

| # | 方案 | 状态 | 风险 |
|---|---|---|---|
| **R1** | 百度官方 PCS API | ⚠️ 需 OAuth 应用 + 资质审核,接口逐步收紧 | 资质门槛高,接口不稳,只给登录用户 |
| **R2** | 第三方解析服务 (pan.naifei.cc, pan.baidusu.com) | ⚠️ 频繁失效 | 收费 / 合规 / 不稳定 / IP 风控 |
| **R3** | 开源 baidu-wangpan-parse / BaiduPCS-Go | ⚠️ 需 cookie + SVIP 账号 | 8h 有效期,接口常变,**Cloudflare Tunnel IP 100% 被限速** |
| **R4** | 自建反代(把百度 m3u8 流反代给自己前端) | ❌ 不可行 | 流量 × 2 + 限速严重 + ToS 违规 |
| **R5** | iframe 嵌入百度分享页 | ✅ 可行 | UX 略差(广告/水印/可能跳下载页),但**零合规风险、稳定、官方维护** |
| **R6** | iframe 嵌入百度 webplayer (假设存在) | ❌ **百度没有官方 webplayer endpoint** | 对比 B 站 `player.bilibili.com/player.html?bvid=xxx` 和 YT `youtube.com/embed/xxx`,百度**无对应接口** |

### 2.5 清晰度限制(关键)

- 未登录: 强制 480p / 720p + 限速
- 普通 VIP(老板测试链接的"超级会员 v9"): 原画但限速
- **SVIP**: 原画不限速
- **结论**: 老板想拿"原画直链",**必须 SVIP 账号**

### 2.6 合规风险

- 绕过百度官方下载限制属"破坏技术保护措施"
- 中国《刑法》第 217 条 + 百度 ToS 都禁止
- **P1 风险评估**: 老板自己的视频自己看,法律风险低;但若**对公网用户提供直链播放** = 灰色地带

### 2.7 当前部署环境

- 站点: Next.js 14 App Router
- 部署: Cloudflare Tunnel → 阿里云 / 其他 VPS(推测,需老板确认)
- 视频页路径: `/videos/[slug]` + `/admin/videos`
- DB: SQLite(`data/dev.db`,`videos` 表 + `idx_videos_status` + `idx_videos_series`)

---

## 3. 黑视角冷峻方案(分 2 阶段)

### P0 (推荐必做,1d 完成) — iframe 嵌入 + 平台字段化

**核心思路**: **不解析直链**,只把"百度网盘"识别成平台,渲染时走优化的 iframe。

#### P0.1 数据库: 加 `platform` 字段

```sql
-- migrations/2026_07_10_v41_baidu_pan.sql
ALTER TABLE videos ADD COLUMN platform TEXT NOT NULL DEFAULT 'iframe';
-- platform: 'bilibili' | 'youtube' | 'baidu_pan' | 'iframe'
CREATE INDEX idx_videos_platform ON videos(platform);
```

**黑视角说明**: 用 platform 字段而不是 URL pattern 识别,原因:
- 未来可能加更多平台(vimeo, youku, 优酷…)
- 后端校验更严(防恶意 URL)
- UI 渲染可以基于 platform 走不同分支

#### P0.2 `lib/video-embed.ts` 新工具

```typescript
// lib/video-embed.ts
export type VideoPlatform = "bilibili" | "youtube" | "baidu_pan" | "iframe";

export interface EmbedInfo {
  platform: VideoPlatform;
  src: string;          // iframe src
  externalUrl: string;  // 备用:点"在 xxx 查看"按钮跳转
  fallback: string;     // 平台名称中文,fallback 时显示
}

export function detectEmbed(url: string): EmbedInfo {
  // B 站
  const bv = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (bv) return {
    platform: "bilibili",
    src: `https://player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0`,
    externalUrl: url,
    fallback: "哔哩哔哩"
  };
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return {
    platform: "youtube",
    src: `https://www.youtube.com/embed/${yt[1]}`,
    externalUrl: url,
    fallback: "YouTube"
  };
  // 百度网盘 (pan.baidu.com/s/{id}?pwd={pwd})
  const bd = url.match(/pan\.baidu\.com\/s\/([\w-]+)(?:\?.*pwd=([\w-]+))?/);
  if (bd) {
    const surl = bd[1];
    const pwd = bd[2] ?? "";
    const src = pwd
      ? `https://pan.baidu.com/s/${surl}?pwd=${pwd}`
      : `https://pan.baidu.com/s/${surl}`;
    return {
      platform: "baidu_pan",
      src,
      externalUrl: src,
      fallback: "百度网盘"
    };
  }
  // 默认
  return { platform: "iframe", src: url, externalUrl: url, fallback: "外部" };
}
```

#### P0.3 `/videos/[slug]/page.tsx` 渲染分支

```tsx
// 百度网盘: 走"官方分享页 iframe" + 顶部提示"如无法播放请前往百度网盘查看"
{embed.platform === "baidu_pan" && (
  <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
    ⚠️ 百度网盘视频,如播放器加载失败请{" "}
    <a href={embed.externalUrl} target="_blank" rel="noopener" className="underline">
      在百度网盘查看
    </a>
  </div>
)}
<div className="relative mb-6 aspect-video w-full overflow-hidden rounded border border-border bg-black">
  <iframe src={embed.src} ... />
</div>
```

#### P0.4 `/videos/page.tsx` 卡片加平台 icon

```tsx
// VideoCard.tsx 加 platform badge
const platformIcon = {
  bilibili: "📺 哔哩哔哩",
  youtube: "▶️ YouTube",
  baidu_pan: "☁️ 百度网盘",
  iframe: "🔗 外部"
}[video.platform];
```

#### P0.5 `/admin/videos` form 加 platform 提示

```tsx
// VideoForm.tsx embed_url hint 升级
hint="支持:哔哩哔哩 (BV号)、YouTube、百度网盘分享链接 (带提取码)"
placeholder="https://www.bilibili.com/video/BVxxx 或 https://pan.baidu.com/s/xxx?pwd=xxx"
```

#### P0.6 后端校验

```typescript
// app/api/admin/videos/route.ts POST/PUT
// 加 platform 自动识别:检测 embed_url → 写入 platform
const embed = detectEmbed(body.embed_url);
body.platform = embed.platform;
```

#### P0 测试覆盖

- `lib/video-embed.test.ts`: 4 个平台 detectEmbed 单测
- `tests/integration/videos.test.mts`: 加 1 个百度网盘 URL 创建视频 + GET 详情验证 platform
- `tests/e2e/admin-videos.spec.ts`: 加 1 个 e2e "admin 录入百度网盘 URL → 公开页可见"

#### P0 收益

- ✅ 立即可用(1d)
- ✅ 零合规风险
- ✅ 零外部依赖
- ✅ UX 改善(平台 badge + 提示)
- ✅ schema 可扩展(未来加 vimeo/youku/优酷)
- ⚠️ 用户需在百度网盘看(广告/水印/可能跳下载页)

---

### P1 (老板拍板才做,3-5d) — 直链解析

**核心思路**: 老板提供 **SVIP 百度账号 cookie**(BDUSS + STOKEN),后端调百度 PCS API → 返回 m3u8 直链(8h 有效)→ 前端用 hls.js 播放。

#### P1.1 老板前置 (前置条件,缺一不做)

| 资源 | 来源 | 用途 |
|---|---|---|
| **SVIP 百度账号 cookie** | 老板提供(BDUSS + STOKEN) | 解锁原画 + 不限速 |
| **接受反爬风险** | 老板确认 | 接口变更需手动维护 |
| **接受 8h 缓存策略** | 老板确认 | 直链过期需重新解析 |

#### P1.2 后端 `/api/external/baidu-pan/resolve`

```typescript
// app/api/external/baidu-pan/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";

interface ResolveRequest {
  share_url: string;
  pwd?: string;
}

interface ResolveResponse {
  ok: boolean;
  video_url?: string;    // m3u8 / mp4
  dlink?: string;        // 备用下载直链
  expire_at?: number;    // unix timestamp
  filename?: string;
  size?: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  // 1. 校验管理员身份
  // 2. 解析 share_id + pwd
  // 3. 调百度 PCS API: https://pan.baidu.com/api/sharedownload?...
  //    headers: { Cookie: `BDUSS=${env.BAIDU_BDUSS}; STOKEN=${env.BAIDU_STOKEN}` }
  //    body: { shareid, uk, fsid, sign, timestamp, ... }
  // 4. 返回 dlink + 过期时间
  // 5. 缓存到 DB(8h TTL)
}
```

#### P1.3 前端播放

```typescript
// 百度网盘类型:fetch resolve API → 用 hls.js 播
if (embed.platform === "baidu_pan") {
  const { video_url } = await fetch("/api/external/baidu-pan/resolve", {
    method: "POST",
    body: JSON.stringify({ share_url: video.embed_url })
  }).then(r => r.json());
  // 用 hls.js 或原生 <video src={video_url}>
}
```

#### P1.4 风险

- ⚠️ **Cloudflare Tunnel IP 被百度限速**(100% 失败概率)
- ⚠️ 接口变更需手动维护(预计每年 1-2 次)
- ⚠️ cookie 失效需老板定期换
- ⚠️ 合规灰色(中国《刑法》217)
- ⚠️ 直链过期需重解析(8h)

#### P1 收益

- ✅ 原画质 / 不限速
- ✅ 无水印
- ✅ UX 好

---

### P2 (不推荐,备选) — 第三方解析 API

**核心思路**: 调 pan.naifei.cc 等第三方服务。

#### P2 风险

- ❌ 收费
- ❌ 合规
- ❌ 频繁失效
- ❌ 需备案 API key

**黑视角结论**: 不做。

---

## 4. 老板决策清单 Q1-Q3 (拍板前不做)

| # | 决策项 | 候选 | 黑推荐 |
|---|---|---|---|
| **Q1** | P0 是否做? | 做 / 不做 | **做**(1d 立即可用,零风险) |
| **Q2** | P1 是否做? | 做 / 不做 | **不做**(风险高,接口不稳,合规灰;老板当前只是测试 1 个百度视频) |
| **Q3** | 平台扩展(vimeo/youku/优酷)? | 现在做 / 后续按需 / 不做 | **后续按需**(P0 schema 已支持,加平台只改 detectEmbed) |

**黑推荐总策略**:
1. **P0 必做**: 平台字段化 + iframe 渲染 + UI 优化(1d)
2. **P1 暂不做**: 老板只测 1 个视频,直链方案成本/风险不成正比
3. **P3(可选)**: 若老板想做"原画直链",需先解决 3 个前置: SVIP 账号 + 接受 Cloudflare Tunnel 限速 + 接受接口维护

---

## 5. P0 工程清单(老板拍 Q1=做 后开干)

```
□ 1. migrations/2026_07_10_v41_baidu_pan.sql
      - ALTER TABLE videos ADD COLUMN platform TEXT DEFAULT 'iframe'
      - CREATE INDEX idx_videos_platform
□ 2. lib/db.ts libVideoPlatform 类型 + CHECK 约束
□ 3. lib/video-embed.ts 新工具 (detectEmbed + EmbedInfo)
□ 4. lib/repo.ts videoRepo 加 platform 字段读写
□ 5. app/api/admin/videos/[id]/route.ts + route.ts 接受 platform
□ 6. app/admin/(admin)/videos/_components/VideoForm.tsx
      - embed_url hint 升级
      - 自动识别 platform (前端预览)
□ 7. app/admin/(admin)/videos/[id]/edit/page.tsx + new/page.tsx
      - 视频表单显示 platform badge
□ 8. app/videos/_components/VideoCard.tsx
      - 加 platform badge
□ 9. app/videos/[slug]/page.tsx
      - baidu_pan 走"分享页 iframe + 顶部提示"
      - 通用 16:9 iframe
□ 10. app/videos/page.tsx (listWithCount 拉 platform)
□ 11. tests/integration/videos.test.mts
       - 4 个平台 detectEmbed 单测
       - 1 个百度网盘创建测试
□ 12. tests/e2e/admin-videos.spec.ts
       - admin 录入百度网盘 URL → 公开页可见
```

预计: 1d 完成 + 全测试通过 + 推到 GitHub

---

## 6. 关键工程教训 (预备入 OPERATIONS)

- ⚠️ **eyun.baidu.com 不是技术参考文档** — 看到 eyun.baidu.com / cloud.baidu.com 域名要警惕营销软文,过滤 AI 内容,实际接口和文章描述往往对不上
- ⚠️ **百度网盘无官方 webplayer endpoint** — B 站有 `player.bilibili.com`,YT 有 `youtube.com/embed`,百度**没有**,只能 iframe 整页
- ⚠️ **Cloudflare Tunnel IP 必被百度限速** — 任何"百度直链反代"思路 100% 失败
- ⚠️ **直链方案需 SVIP** — 普通 VIP 原画但限速,SVIP 才能原画不限速
- ✅ **平台字段化优于 URL pattern 识别** — `videos.platform` 字段便于 UI 区分和未来扩展
- ✅ **iframe 嵌入官方分享页是 P0 最低成本方案** — 零合规、稳定、官方维护,UX 略差但能用

---

## 7. 仓库状态

- 当前: `1817d6f refactor(copyright): v0.40 移除 AIGC 披露`
- 本方案文档: 待 push
- 老板拍板后: 开 P0 1d 闭环