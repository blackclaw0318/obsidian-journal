# Phase 4 v0.35 方案稿 — 资源种子数 + 板块访问量 + AdSense

> 老板 2026-07-04 20:37 新提 3 个需求
> 作者: 黑
> 状态: ⏳ **等老板拍板 Q1-Q4**
> 计划版本: v0.35 (代号: `analytics-adsense`)

---

## 🎯 3 大需求概览

| # | 需求 | 决策点 | 黑推荐 |
|---|---|---|---|
| **1** | 资源点击计数 (初始百位数基准) | admin 编辑种子数 | 默认 100,可改 0-99999 |
| **2** | admin 页面每个板块访问量监控 | 公开/Admin 分开计 | 24h 同 IP+path 去重 |
| **3** | Google AdSense 接入流程 | Q1 domain / Q2 广告类型 / Q3 cookie / Q4 自点 | 自动广告 + cookie 同意 + 严禁自点 |

**总代码量**: 2.5d + **老板前置**: 1-2 周(AdSense 审核)

---

## 1️⃣ 资源种子数(0.5d)

### 现状(2026-07-04 20:30)
- v0.34 P2 计数 hook 已落地(`94e94b9` + `9fa8f1f`)
- 显示数 = 真实 DB 计数(从 0/1 起)
- 新资源看起来"没人看",老板要的是"看起来有人气"

### DB 改动
```sql
ALTER TABLE media_items ADD COLUMN seed_view_count INTEGER NOT NULL DEFAULT 100;
ALTER TABLE media_items ADD COLUMN seed_download_count INTEGER NOT NULL DEFAULT 50;
ALTER TABLE media_items ADD COLUMN seed_enabled INTEGER NOT NULL DEFAULT 1;

-- 旧资源回填 (伪随机 100-500)
UPDATE media_items SET seed_view_count = 100 + (id * 137 % 400);
```

### 计算逻辑
```ts
// lib/counter.ts
export function displayView(item: MediaItem, realCount: number) {
  if (!item.seed_enabled) return realCount;
  return (item.seed_view_count ?? 0) + realCount;
}

export function displayDownload(item: MediaItem, realCount: number) {
  if (!item.seed_enabled) return realCount;
  return (item.seed_download_count ?? 0) + realCount;
}
```

### Admin 改动
- 上传资源时可填种子(默认 100,可改 0-99999)
- `/admin/resources` 列表加 "⚙️ 种子" inline 编辑
- 全局开关 `seed_enabled` — 1 显示种子 + 真实,0 只显示真实

### API 新增
- `PATCH /api/admin/resources/[id]/seed` — 改种子数 (admin only)
- `POST /api/admin/resources/seed/bulk` — 批量调整(老板装门面用)

### UI 显隐
```tsx
// ResourceGrid 卡片
<span className="font-mono text-xs">
  👁 {displayView(item, realCount)}
</span>
// 可选: mouseover 显示 "(基础 100 + 真实 12)"
```

### 验证
- [ ] `/admin/resources/1/edit` 改种子 100 → 500,公开页立即变 500+
- [ ] `seed_enabled = 0` 时显示真实数
- [ ] bulk 调整:全站 +200

---

## 2️⃣ 板块访问量监控(1.5d)

### 板块范围

**公开 (6+)**:
- `/`, `/resources`, `/posts`, `/posts/[slug]`
- `/novels`, `/novels/[slug]`, `/pages/[slug]`

**Admin (8+)**:
- `/admin`, `/admin/posts`, `/admin/novels`, `/admin/videos`
- `/admin/pages`, `/admin/media`, `/admin/resources`, `/admin/users`, `/admin/settings`

### 新表 schema
```sql
CREATE TABLE page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,  -- hashIp(IP) FNV-1a 同步,Edge Runtime 兼容
  ts INTEGER NOT NULL,         -- unix ms
  is_admin INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  referer TEXT
);
CREATE INDEX idx_pv_path_ts ON page_views(path, ts);
CREATE INDEX idx_pv_visitor_ts ON page_views(visitor_hash, ts);
CREATE INDEX idx_pv_path_visitor ON page_views(path, visitor_hash, ts);
```

### Middleware 拦截 (`middleware.ts`)
```ts
import { NextResponse } from 'next/server';
import { hashIp } from '@/lib/utils';
import { getDb } from '@/lib/db';

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - api 路由
     * - _next 静态资源
     * - 静态文件 (.ico, .png, .svg, .css, .js, .jpg, .pdf...)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

export function middleware(req) {
  const path = req.nextUrl.pathname;
  const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown';
  const hash = hashIp(ip);
  const isAdmin = path.startsWith('/admin') ? 1 : 0;

  // 24h 去重 (同 path + hash)
  const db = getDb();
  const last = db.prepare(
    `SELECT ts FROM page_views 
     WHERE path=? AND visitor_hash=? 
     ORDER BY ts DESC LIMIT 1`
  ).get(path, hash) as { ts: number } | undefined;

  if (!last || Date.now() - last.ts > 86400000) {
    db.prepare(
      `INSERT INTO page_views(path, visitor_hash, ts, is_admin, user_agent, referer) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      path, hash, Date.now(), isAdmin,
      req.headers.get('user-agent'),
      req.headers.get('referer')
    );
  }

  return NextResponse.next();
}
```

> ✅ 复用 v0.34 `hashIp`(FNV-1a 同步,Edge Runtime 兼容)

### 新建 `/admin/analytics`(仅 admin 可访问)

#### 顶部 4 个卡片
| 指标 | 计算 |
|---|---|
| 总 PV | `SELECT COUNT(*) FROM page_views` |
| 总 UV | `SELECT COUNT(DISTINCT visitor_hash) FROM page_views` |
| 今日 PV | `SELECT COUNT(*) FROM page_views WHERE ts > ? (今天 0 点)` |
| 今日 UV | `SELECT COUNT(DISTINCT visitor_hash) FROM page_views WHERE ts > ?` |

#### 板块表
| path | 24h PV | 7d PV | 30d PV | 24h UV | 7d UV | 30d UV |

- 公开 / Admin **分开列**
- 默认按 7d PV 降序
- 每行可点击 → 展开该板块 7d 趋势小图

#### 趋势图
- 7 天 SVG 折线图(纯 SVG,无第三方库)
- 主页面 + 每个板块 inline

### 决策点

| Q | 问题 | 黑推荐 |
|---|------|--------|
| **Q1** | admin 自己的访问算 PV? | **算**(统一标准,降噪留给 24h 去重) |
| **Q2** | 24h 同 IP 同 path 去重? | **是**(同 v0.34 资源 view) |
| **Q3** | API/静态路径? | **跳过**(middleware matcher 排除) |
| **Q4** | 历史保留多久? | **永久**(数据量小,2-3 万 PV/月,表 < 50MB/年) |
| **Q5** | GDPR 合规 | ✅ hashIp 已经只存哈希,可加 cookie 同意后开启 |

### 工作量分块
| P | 内容 | 时 |
|---|------|------|
| P0 | schema + middleware | 0.5d |
| P1 | `/admin/analytics` 顶部卡片 + 板块表 | 0.5d |
| P2 | 趋势图 + 单元/集成测试 | 0.5d |

---

## 3️⃣ Google AdSense 接入(0.5d 代码 + 1-2 周老板审核)

### 老板需要做的(前置)

| # | 动作 | 工作量 | 备注 |
|---|------|--------|------|
| 1 | **申请账号**: [adsense.google.com](https://www.google.com/adsense) | 1-7 天审核 | — |
| 2 | **域名绑定**: 提交 `shangkun.uk`(顶级域) | 1 min | ⚠️ **dev.shangkun.uk 不审**,必须用顶级域 |
| 3 | **身份验证**: 身份证 / 护照 | 5 min | — |
| 4 | **ads.txt**: 我放 `public/ads.txt` | — | 老板发我 publisher ID 后填 |
| 5 | **收款方式**: 银行 / 西联 $100 起付 | 5 min | — |
| 6 | **税务表 W-8BEN** | 10 min | 非美个人必填 |
| 7 | **首次人工审核** | **1-2 周** ⭐ | Google 真看内容、流量、布局 |
| 8 | **严禁自己点广告** | — | 违反 → 永久封号 |

**老板一次性发我的物料**:
- AdSense Publisher ID(`ca-pub-XXXXXXXX`,审核通过后)
- ads.txt 里的 `pub-XXXXXXXX` 串

### 黑需要做的(代码 0.5d)

| P | 内容 | 时 |
|---|------|---|
| **P0** | `public/ads.txt` 占位 | 5 min |
| **P1** | `app/layout.tsx` `<head>` 注入 AdSense script(`next/script lazyOnload`) | 15 min |
| **P2** | `.env.production.example` 加 `NEXT_PUBLIC_ADSENSE_PUB_ID` | 5 min |
| **P3** | 广告组件 `<AdSlot slot="X" />` + 3 种 layout(文章上/侧栏/页脚) | 1h |
| **P4** | SiteConfig 表加 `ads_enabled`(admin 开关) | 30 min |
| **P5** | Cookie 同意弹窗(GDPR/CCPA 合规) | 1h |
| **P6** | `/admin/analytics` 加 AdSense 收益图表占位 | 30 min |

### 广告位策略

| 方案 | 优点 | 缺点 | 黑推荐 |
|------|------|------|--------|
| **A 自动广告** | Google AI 自动放,eCPM 高 20-30% | 布局不可控 | **上线用 A** |
| **B 手动广告** | 完全可控位置 | 工作量大 | 3 月后切 B 优化 |

### 代码骨架

#### P0 `public/ads.txt`
```text
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

#### P1 `app/layout.tsx` 注入
```tsx
import Script from 'next/script';

// <head>
{process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
  <Script
    async
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
    crossOrigin="anonymous"
    strategy="lazyOnload"
  />
)}
```

#### P3 `<AdSlot />`
```tsx
// components/AdSlot.tsx
export function AdSlot({ slot, format = 'auto' }: { slot: string; format?: string }) {
  if (!process.env.NEXT_PUBLIC_ADSENSE_PUB_ID) return null;
  if (!siteConfig.ads_enabled) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
```

#### P4 SiteConfig `ads_enabled`
```ts
// lib/db.ts 加
ALTER TABLE site_config ADD COLUMN ads_enabled INTEGER NOT NULL DEFAULT 0;
```

#### P5 Cookie 弹窗(简化)
```tsx
// components/CookieConsent.tsx
'use client';
import { useState } from 'react';
export function CookieConsent() {
  const [ok, setOk] = useState(localStorage.getItem('cookie_ok'));
  if (ok) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 bg-black/90 text-white p-4 rounded-lg z-50">
      <p>本站使用 Google AdSense 投放广告。继续浏览即同意 cookie。</p>
      <button onClick={() => { localStorage.setItem('cookie_ok', '1'); setOk('1'); }}>
        我同意
      </button>
    </div>
  );
}
```

### 关键风险

| # | 风险 | 应对 |
|---|------|------|
| 1 | **审核不通过**:内容不够 / 无 SSL / 缺 about/contact | 提前有 8+ 篇文章 + HTTPS + 必备页 |
| 2 | **站长刷点击封号** | **严禁点自己的广告**(永久封号) |
| 3 | **国内 IP eCPM 低** $0.5-2 | 海外用户占比决定上限 |
| 4 | **敏感广告不可控**(博彩/成人) | 站内类别审查申请(难,基本不可能全禁) |
| 5 | **月结 $100 门槛** | 小流量要 3-6 月才有第一笔 |

### 预期收益(国内博客 2024-2025)
- 月 1 万 PV:**$5-30 / 月** (¥35-210)
- 月 10 万 PV:**$50-300 / 月** (¥350-2100)
- 美国 IP 主导:5x

### 时序

```
Day 1:    老板申请 AdSense 账号 + 我放 ads.txt + 我加代码框架
Day 1-14: 等 Google 审核 (1-2 周)
Day 15:   审核通过 → 老板给我 publisher ID + ads.txt 内容
Day 15:   我配 env + 部署 → 上线生产
Day 15+:  广告开始投放
Day 30+:  第一次结算(达到 $100 门槛)
```

### 老板决策

| Q | 问题 | 黑推荐 |
|---|------|--------|
| **Q1** | 有 `shangkun.uk` 顶级域在生产吗? | 老板说 |
| **Q2** | 自动广告 / 手动广告? | **自动** |
| **Q3** | 加 cookie 同意弹窗? | **加**(国内合规也建议) |
| **Q4** | 站长零容忍自点广告? | **是**(项目 SOP 写死) |

---

## 📊 综合工作量与优先级

| 序 | 任务 | 代码时 | 老板前置 | 风险 |
|---|---|---|---|---|
| 1 | 资源种子数 (装饰) | 0.5d | 无 | 0 |
| 2 | 板块访问量监控 (生产价值) | 1.5d | 无 | 低 |
| 3 | AdSense (商业) | 0.5d 代码 | 1-2 周审核 | 中(刷点击封号) |
| **总代码** | — | **2.5d** | — | — |

---

## 🎯 老板拍板清单(开始前必填)

| Q | 问题 | 黑推荐 | 老板答复 |
|---|------|--------|---------|
| **Q1** | 1+2+3 全做,还是先 1+2,3 等通知? | **1+2 立即,3 并行申请** | ☐ |
| **Q2** | 资源种子默认 100,是否合理? | 是 | ☐ |
| **Q3** | admin 访问量计入 PV? | **是** | ☐ |
| **Q4** | shangkun.uk 顶级域是否生产就绪? | **待老板说** | ☐ |

---

## 📝 收官报告模板

完成后我会写一份 `PHASE4_V35_ANALYTICS_ADSENSE_REPORT.md`,包含:
- 三任务 commit 列表
- AdSense 申请 SOP 文档
- `/admin/analytics` 截图
- 资源种子编辑流程截图
- 工程教训(cookie 同意 / GDPR / hashIp / middleware 等)

