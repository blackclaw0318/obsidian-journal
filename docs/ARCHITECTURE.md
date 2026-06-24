# 架构细节 (v0.3)

> 配套 `DESIGN.md` §4 的展开, 给开发者看。

## A1. 渲染策略 (不变)

## A2. 数据流 (v0.3 加 View + MediaUsage)

```
[DB Read]    Post / Chapter / Series / Novel / Volume / Video / Page / Media / Social
[DB Read]    MediaUsage.findMany({ where: { refType, refId } })  → 显示引用列表
[DB Read]    FTS5 MATCH ?                                            → 搜索

[DB Write]   Server Action: uploadPost()               → Post.create + FTS5 同步(降级) + revalidate
[DB Write]   Server Action: uploadChapter()            → Chapter.create + FTS5 同步(降级) + revalidate
[DB Write]   Server Action: savePageLayout()           → Page.layout.update + DOMPurify(customHtml) + revalidate
[DB Write]   Server Action: uploadMedia()              → Media.create + sharp 多尺寸 + blurhash + MediaUsage 同步
[DB Write]   Server Action: recordView()               → views +1 (DB 简单版, 同 IP 24h 限一次)
[DB Write]   Server Action: rebuildAllFTS()            → 全量重建 FTS5 索引 (Admin 按钮 + cron)
```

## A3. MD 解析管线 (不变)

## A4. Block 注册表 (v0.3: 13 种, 加 theme, 去 Marquee)

```ts
// lib/blocks/registry.tsx
export const blockRegistry = {
  hero:       { schema: heroSchema,       component: HeroBlock,       label: "Hero 大标题",   icon: "✨" },
  text:       { schema: textSchema,       component: TextBlock,       label: "文本段落",      icon: "📝" },
  gallery:    { schema: gallerySchema,    component: GalleryBlock,    label: "图片画廊",      icon: "🖼️" },
  stats:      { schema: statsSchema,      component: StatsBlock,      label: "数据统计",      icon: "📊" },
  skills:     { schema: skillsSchema,     component: SkillsBlock,     label: "技能雷达",      icon: "🎯" },
  timeline:   { schema: timelineSchema,   component: TimelineBlock,   label: "时间线",        icon: "📅" },
  links:      { schema: linksSchema,      component: LinksBlock,      label: "友链",          icon: "🔗" },
  posts:      { schema: postsSchema,      component: PostsBlock,      label: "文章列表",      icon: "📰" },
  videos:     { schema: videosSchema,     component: VideosBlock,     label: "视频列表",      icon: "🎬" },
  divider:    { schema: dividerSchema,    component: DividerBlock,    label: "分隔线",        icon: "➖" },
  callout:    { schema: calloutSchema,    component: CalloutBlock,    label: "提示框",        icon: "💡" },  // 🆕
  music:      { schema: musicSchema,      component: MusicBlock,      label: "背景音乐",      icon: "🎵", advanced: true },  // 🆕 标 advanced
  customHtml: { schema: customHtmlSchema, component: CustomHtmlBlock, label: "自定义 HTML",   icon: "⚠️", danger: true, requiresFeature: 'allowCustomHtml' },  // 🆕 受开关控制
} as const;
```

**Block 主题应用** (v0.3 新增):
```tsx
function BlockContainer({ block, children }) {
  const theme = block.theme ?? 'auto';
  return (
    <section
      className={cn(
        'block-container',
        theme === 'dark' && 'bg-zinc-950 text-zinc-50',
        theme === 'light' && 'bg-white text-zinc-900',
      )}
      data-theme={theme}
    >
      {children}
    </section>
  );
}
```

## A5. 视频 URL 解析 (不变)

## A6. 百度网盘 Worker (不变)

## A7. Page Builder 数据流 (v0.3 加 CustomHtml 受控)

```ts
// 在 addBlock 时检查:
if (entry.requiresFeature === 'allowCustomHtml' && !siteConfig.allowCustomHtml) {
  toast.error('CustomHtmlBlock 已禁用, 前往 Settings → 站点设置 → 允许自定义 HTML Block 启用');
  return;
}

// 在 savePageLayout 时 (Server Action):
for (const block of blocks) {
  if (block.type === 'customHtml' && !siteConfig.allowCustomHtml) {
    throw new ActionError('CustomHtmlBlock 已禁用, 无法保存');
  }
  if (block.type === 'customHtml') {
    block.data.html = sanitizeHtml(block.data.html);  // DOMPurify 二次清洗
  }
}
```

## A8. 媒体上传管线 (v0.3 加 MediaUsage 同步)

```ts
// lib/media/upload.ts (完整管线)
export async function processAndSaveMedia(file: File, uploaderId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // 1. 类型/大小校验
  const mime = file.type;
  if (!ALLOWED_MIME.includes(mime)) throw new ActionError('不支持的文件类型');
  if (file.size > MAX_SIZE[mime.split('/')[0]]) throw new ActionError('文件过大');
  
  // 2. 图片: sharp 多尺寸 + blurhash
  let processed;
  if (mime.startsWith('image/')) {
    processed = await processImage(buffer);
  } else if (mime.startsWith('video/')) {
    processed = await processVideo(buffer);  // ffmpeg 截首帧
  } else {
    processed = { url: await saveOriginal(buffer), size: buffer.length };
  }
  
  // 3. 写 Media 表
  const media = await prisma.media.create({
    data: {
      filename: file.name, mimeType: mime, size: file.size,
      type: getMediaType(mime),
      storageKey: processed.storageKey,
      url: processed.url,
      width: processed.width, height: processed.height,
      blurhash: processed.blurhash,
      uploadedBy: uploaderId,
    },
  });
  
  return media;
}

// 上传 Post/Chapter/Save PageLayout 时同步 MediaUsage
// (见 lib/media/usage.ts, DESIGN §19.5)
```

## A9. 鉴权流程 (不变)

## A10. 部署拓扑 (v0.3 加 Worker 独立仓)

```
                 ┌──────────────────┐
   Internet ──►  │   Nginx (:443)   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │  Next.js (:3000)│
                 │  (PM2 cluster)   │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │ SQLite + content/│
                 │  + media/        │
                 └──────────────────┘

百度 Worker (独立 repo, 独立部署):
                 ┌──────────────────┐
                 │ Cloudflare Worker│
                 │ pan-proxy.xxx    │
                 │ (独立仓库 ~200 行)│
                 └──────────────────┘
```

## A11. 备份策略 (v0.3 加 media/)

```bash
0 3 * * * cd /opt/obsidian-journal && tar czf /backup/oj-$(date +\%F).tar.gz prisma/dev.db content/ media/
30 3 * * * cd /opt/obsidian-journal && pnpm tsx scripts/reindex-fts.ts >> logs/reindex.log 2>&1
find /backup/oj-*.tar.gz -mtime +30 -delete
```

## A12. FTS5 同步管线 (v0.3 加降级) 🆕

```ts
// lib/fts.ts
import { prisma } from './db';
import { logger } from './logger';

export async function syncPostFTS(post: Post): Promise<FTSResult> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO post_search(post_id, title, excerpt, content) VALUES (?, ?, ?, ?)`,
      post.id, post.title, post.excerpt ?? '', stripMd(post.contentMd)
    );
    return { ok: true };
  } catch (e) {
    logger.warn(`[FTS] post ${post.id} sync failed: ${e.message}`);
    return { ok: false, error: String(e) };
  }
}

export async function rebuildAllFTS(): Promise<{ success: number; failed: number; total: number }> {
  const posts = await prisma.post.findMany({ where: { published: true } });
  const chapters = await prisma.chapter.findMany({ where: { published: true } });
  
  await prisma.$executeRawUnsafe(`DELETE FROM post_search`);
  await prisma.$executeRawUnsafe(`DELETE FROM chapter_search`);
  
  let success = 0, failed = 0;
  for (const p of posts) {
    const r = await syncPostFTS(p);
    r.ok ? success++ : failed++;
  }
  for (const c of chapters) {
    const r = await syncChapterFTS(c);
    r.ok ? success++ : failed++;
  }
  
  return { success, failed, total: posts.length + chapters.length };
}
```

## A13. 监控 (v0.3 加 Worker 健康)

```ts
// app/api/health/route.ts
export async function GET() {
  const checks = {
    db: await checkDB(),
    mediaDisk: await checkMediaDisk(),
    baiduWorker: await checkBaiduWorker(),  // 🆕
  };
  const ok = Object.values(checks).every(c => c.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}

async function checkBaiduWorker() {
  try {
    const url = `${process.env.BAUDU_WORKER_URL}/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

## A14. View 计数管线 (v0.3) 🆕

```ts
// lib/views.ts
import { headers } from 'next/headers';
import { LRUCache } from 'lru-cache';  // 或简单 Map

const viewCache = new LRUCache<string, number>({ max: 10_000, ttl: 24 * 3600_000 });

export async function recordView(
  refType: 'post'|'chapter'|'video', refId: string
): Promise<{ recorded: boolean }> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const key = `${refType}:${refId}:${ip}`;
  
  if (viewCache.has(key)) return { recorded: false };
  viewCache.set(key, Date.now());
  
  const table = { post: 'Post', chapter: 'Chapter', video: 'Video' }[refType];
  await prisma.$executeRawUnsafe(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, refId);
  
  return { recorded: true };
}
```

## A15. Novel 三层关系 🆕

```prisma
// 已见 schema.prisma §6, 此处列关系图
Novel (1) ──< (N) NovelVolume (1) ──< (N) Chapter
```

## A16. Social 规范化 🆕

```
Social { id, platform, label, url, icon, order, visible }
替代 SiteConfig.socials String JSON
```

渲染: `/about` 页用 LinksBlock 拉 visible=true 的 Social, 按 order 排序。

## A17. Worker 仓接口契约 🆕

主仓与 Worker 仓的接口约定 (TypeScript 接口, 手动同步或后续 monorepo 抽 packages):

```ts
// 主仓: lib/video/baidu.ts
export interface BaiduProxyRequest {
  surl: string;     // 分享链接 ID
  pwd: string;      // 提取码 (空 = 无)
  autoplay?: boolean;
}

// Worker 仓: src/index.ts (接收同名 URL params)
export interface BaiduProxyResponse {
  ok: boolean;
  videoUrl?: string;  // m3u8 / mp4 直链
  error?: string;
}
```

调用:
```tsx
const url = `${process.env.BAUDU_WORKER_URL}/?surl=${surl}&pwd=${pwd}&autoplay=0`;
return <iframe src={url} ... />;
```

## A18. 硬件部署配置 (v0.4 🆕, 基于 4c16g 当前 → 2c4g 未来生产)

> 完整对应 `DESIGN.md` §13.4, 此处给可直接 copy 的配置模板。

### A18.1 PM2 ecosystem.config.js

```js
// ecosystem.config.js (项目根目录)
const mode = process.env.DEPLOY_MODE || 'dev';

const config = {
  apps: [{
    name: 'obsidian-journal',
    script: './.next/standalone/server.js',  // standalone 模式产物
    cwd: '/opt/obsidian-journal',
    instances: mode === 'prod-16g' ? 2 : 1,  // 2c4g 强制 1
    exec_mode: mode === 'prod-16g' ? 'cluster' : 'fork',
    max_memory_restart: mode === 'prod-4g' ? '1400M' : '1900M',  // OOM 前重启
    node_args: [
      `--max-old-space-size=${mode === 'prod-4g' ? 1536 : mode === 'prod-16g' ? 2048 : 4096}`,
      '--enable-source-maps',
    ],
    env: {
      NODE_ENV: 'production',
      DEPLOY_MODE: mode,
      PORT: 3000,
      DATABASE_URL: process.env.DATABASE_URL,
      SHARP_CONCURRENCY: mode === 'prod-4g' ? '1' : '4',
      BAIDU_WORKER_URL: process.env.BAUDU_WORKER_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }],
};

module.exports = config;
```

### A18.2 Nginx 配置

```nginx
# /etc/nginx/sites-available/obsidian-journal
# worker 数按 CPU 自动 (4c16g → 4, 2c4g → 2)
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    multi_accept on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    tcp_nopush    on;
    tcp_nodelay   on;
    keepalive_timeout 65;
    server_tokens off;

    # ─── 压缩 ───
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # ─── Brotli (需模块, 2c4g 可省 CPU) ───
    # brotli on;
    # brotli_comp_level 4;
    # brotli_types text/plain text/css application/json application/javascript text/xml;

    # ─── 限流 ───
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=3r/m;  # 登录 3次/分钟

    # ─── 客户端最大 body (MD 上传 5MB) ───
    client_max_body_size 10M;

    # ─── 静态资源缓存 ───
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m
                     max_size=1g inactive=60m use_temp_path=off;

    upstream nextjs_upstream {
        least_conn;
        server 127.0.0.1:3000;
        keepalive 32;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # ─── 安全头 ───
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src https://player.bilibili.com https://pan.baidu.com https://www.youtube-nocookie.com https://pan-proxy.xxx.workers.dev;" always;

        # ─── 静态资源 (Next.js standalone 已含) ───
        location /_next/static/ {
            proxy_pass http://nextjs_upstream;
            proxy_cache STATIC;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
            access_log off;
        }

        location /media/ {
            alias /opt/obsidian-journal/media/;
            expires 30d;
            add_header Cache-Control "public, max-age=2592000";
            access_log off;
        }

        # ─── API 限流 ───
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://nextjs_upstream;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location ~ ^/api/auth {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://nextjs_upstream;
        }

        # ─── 默认 ───
        location / {
            proxy_pass http://nextjs_upstream;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_read_timeout 60s;
        }
    }

    # HTTP → HTTPS
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }
}
```

### A18.3 swap 配置 (2c4g 必备)

```bash
#!/bin/bash
# scripts/setup-swap.sh (一次性, 部署到 2c4g 时跑)

set -e
SWAP_SIZE_MB=${SWAP_SIZE_MB:-2048}  # 默认 2GB, 可覆盖

if [ "$(swapon --show | wc -l)" -gt 1 ]; then
  echo "✅ swap 已存在:"
  swapon --show
  exit 0
fi

echo "📦 创建 ${SWAP_SIZE_MB}MB swap..."
sudo fallocate -l "${SWAP_SIZE_MB}M" /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 持久化
if ! grep -q '/swapfile' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 调优 swappiness (2c4g 推荐 10, 内存紧张时再换出)
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf
sudo sysctl -p /etc/sysctl.d/99-swap.conf

echo "✅ swap 配置完成:"
free -h
```

### A18.4 SQLite 调优 (Prisma 启动 hook)

```ts
// lib/db.ts (Phase 1 初始化时实施)
import { PrismaClient } from '@prisma/client';

const isSqlite = process.env.DATABASE_URL?.startsWith('file:');

export const prisma = new PrismaClient({
  log: process.env.DEPLOY_MODE === 'dev' ? ['query', 'warn', 'error'] : ['error'],
  // SQLite 不需要连接池, Prisma 默认会序列化
});

// SQLite 性能调优 (启动时执行一次)
export async function tuneSqlite(): Promise<void> {
  if (!isSqlite) return;
  
  const pragmas = [
    `PRAGMA journal_mode = WAL`,        // 并发读写
    `PRAGMA busy_timeout = 5000`,       // 5s 写等待
    `PRAGMA synchronous = NORMAL`,      // 性能/安全平衡 (WAL 下 NORMAL 等于 FULL 安全性)
    `PRAGMA mmap_size = 268435456`,     // 256MB 零拷贝读
    `PRAGMA cache_size = -64000`,       // 64MB page cache
    `PRAGMA temp_store = MEMORY`,       // 临时表走内存
    `PRAGMA foreign_keys = ON`,         // 外键约束 (Prisma 默认不强制)
  ];
  
  for (const sql of pragmas) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.warn(`[SQLite tune] failed: ${sql} → ${e}`);
    }
  }
  
  console.log('[SQLite tune] ✅ 7 PRAGMAs applied');
}

// 应用启动时调 (instrumentation.ts)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await tuneSqlite();
  }
}
```

### A18.5 Next.js standalone 配置

```js
// next.config.mjs
export default {
  output: 'standalone',  // 🆕 v0.4 生产必备
  experimental: {
    instrumentationHook: true,  // 注册 SQLite tuneSqlite hook
  },
  images: {
    // 🆕 2c4g 优化: 限制图片最大尺寸, 减少 sharp 内存峰值
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // sharp 并发由 SHARP_CONCURRENCY env 控制 (lib/media/upload.ts)
};
```

### A18.6 sharp 跨平台编译

```bash
# scripts/deploy.sh 片段 (Phase 4 写完整版)

# 检测架构
ARCH=$(uname -m)
echo "检测到架构: $ARCH"

if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "x86_64" ]; then
  echo "⚠️ 非 x86_64 架构, 需要在生产机重新编译 native 模块"
  npm rebuild sharp
fi

# sharp 安装 (生产环境 npm ci 跳过 download)
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --omit=dev --ignore-scripts
# 然后单独装 sharp (走 prebuilt binary)
npm install sharp --omit=dev
```

### A18.7 健康检查 (含 2c4g 内存告警)

```bash
#!/bin/bash
# scripts/healthcheck.sh (定时 5min)

set -e
WEBHOOK=${WECOM_WEBHOOK:-}
DOMAIN=${OJ_DOMAIN:-localhost}
ALERT_THRESHOLD_MEM=${ALERT_THRESHOLD_MEM:-85}
ALERT_THRESHOLD_DISK=${ALERT_THRESHOLD_DISK:-85}

# 1. HTTP 健康
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  send_alert "🔴 OJ 健康检查失败: HTTP $HTTP_CODE"
fi

# 2. 内存 (2c4g 重点)
MEM_PCT=$(free | awk '/^Mem:/{printf "%.0f", $3/$2*100}')
if [ "$MEM_PCT" -gt "$ALERT_THRESHOLD_MEM" ]; then
  send_alert "⚠️ OJ 内存告警: ${MEM_PCT}% (阈值 ${ALERT_THRESHOLD_MEM}%)"
fi

# 3. 磁盘
DISK_PCT=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt "$ALERT_THRESHOLD_DISK" ]; then
  send_alert "⚠️ OJ 磁盘告警: ${DISK_PCT}% (阈值 ${ALERT_THRESHOLD_DISK}%)"
fi

# 4. PM2 进程
PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        if p['name'] == 'obsidian-journal':
            print(p['pm2_env']['status'])
            break
except: print('error')
")
if [ "$PM2_STATUS" != "online" ]; then
  send_alert "⚠️ OJ PM2 进程状态: $PM2_STATUS"
fi

# 5. 百度 Worker (若配置)
if [ -n "$BAIDU_WORKER_URL" ]; then
  WORKER_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BAIDU_WORKER_URL/health" || echo "000")
  if [ "$WORKER_CODE" != "200" ]; then
    send_alert "⚠️ OJ 百度 Worker 异常: HTTP $WORKER_CODE"
  fi
fi

# 6. SQLite 数据库大小 + WAL
DB_SIZE=$(du -sh /opt/obsidian-journal/prisma/prod.db 2>/dev/null | cut -f1)
echo "[$(date)] OK | mem=${MEM_PCT}% disk=${DISK_PCT}% pm2=$PM2_STATUS db=$DB_SIZE"

send_alert() {
  if [ -z "$WEBHOOK" ]; then
    echo "[ALERT] $1"
    return
  fi
  curl -s -X POST "$WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$1\"}}" >/dev/null
}
```

### A18.8 systemd unit (开机自启)

```ini
# /etc/systemd/system/obsidian-journal.service
[Unit]
Description=Obsidian Journal (Next.js)
After=network.target

[Service]
Type=simple
User=oj
WorkingDirectory=/opt/obsidian-journal
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

