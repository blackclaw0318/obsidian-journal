# 架构细节

> 配套 `DESIGN.md` §4 系统架构的展开, 给开发者看。

## A1. 渲染策略 (RSC vs CSR)

| 页面 | 渲染 | 原因 |
|---|---|---|
| `/` | RSC | SEO 关键, 静态友好 |
| `/about` | RSC | 内容几乎不变 |
| `/tech`, `/life`, `/novels` | RSC | SEO 关键 |
| `/videos` | RSC | SEO 关键 |
| `/posts/[slug]`, `/videos/[id]` | RSC | SEO 关键 + 预渲染 |
| `/admin/*` | RSC shell + 客户端 islands | 表格/上传器需交互 |
| `/login` | 全 Client | 表单交互 |
| 主题切换器 | Client (no-SSR) | 避免 hydration mismatch |
| Lenis 平滑滚动 | Client (no-SSR) | 浏览器 API |
| 视频嵌入 iframe | Client (lazy) | 节省首屏 |

## A2. 数据流

```
[DB Read]  Post.findMany({ category, published }) → RSC 渲染 HTML
[DB Read]  Post.findUnique({ slug }) → 命中后渲染
[DB Read]  Video.findMany() → 渲染列表
[DB Write] Server Action: uploadPost() → Prisma.post.create()
[Cache]    revalidatePath('/tech')  → Next.js 失效 ISR 缓存
```

## A3. MD 解析管线 (lib/md/compile.ts 草稿)

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

export async function compileMd(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
    })
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
```

## A4. 视频 URL 解析 (lib/video/detect.ts)

```ts
export type DetectedVideo =
  | { platform: "bilibili"; bvid: string }
  | { platform: "baidu"; surl: string; pwd: string }
  | { platform: "unknown"; url: string };

const BILI_RE = /(BV[a-zA-Z0-9]{10})/;
const BAIDU_RE = /pan\.baidu\.com\/s\/([a-zA-Z0-9_-]+)(?:\?pwd=([a-zA-Z0-9]{4}))?/;

export function detectVideo(url: string): DetectedVideo {
  const bili = url.match(BILI_RE);
  if (bili) return { platform: "bilibili", bvid: bili[1] };
  const bd = url.match(BAIDU_RE);
  if (bd) return { platform: "baidu", surl: bd[1], pwd: bd[2] ?? "" };
  return { platform: "unknown", url };
}
```

## A5. 鉴权流程

```
[Browser] → /admin/upload
     ↓
[middleware.ts] 检测 session cookie
     ↓
[Auth.js] 解析 JWT → User
     ↓ 未登录 → redirect /login
     ↓ 登录 → render page
```

## A6. 部署拓扑 (推荐自托管)

```
                 ┌──────────────────┐
   Internet ──►  │   Nginx (:443)   │
                 │   + Let's Encrypt│
                 └────────┬─────────┘
                          │ reverse_proxy
                          ▼
                 ┌──────────────────┐
                 │  Next.js (:3000)│
                 │  (PM2 cluster)   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ SQLite + content/│
                 │ (本地磁盘)       │
                 └──────────────────┘
```

Nginx 配置要点:
- HTTP/2
- gzip / brotli 静态资源
- 静态资源 1 年缓存 (带 hash)
- 限流: `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;`
- 安全头: CSP, X-Frame-Options, Referrer-Policy

## A7. 备份策略

```bash
# 每日 03:00 备份 SQLite + content/
0 3 * * * cd /opt/obsidian-journal && tar czf /backup/oj-$(date +\%F).tar.gz prisma/dev.db content/
# 保留 30 天
find /backup/oj-*.tar.gz -mtime +30 -delete
```

## A8. 监控 (可选 v1.1)

- `/api/health` → 返回 200 + 版本 + DB 状态
- Sentry (错误)
- Plausible / Umami (访问统计, 隐私友好)
