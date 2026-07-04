# Phase 4 计划 — v1.0 资源页面 + 付费下载 + 云存储 — 2026-07-04

> **状态**: 📋 方案稿,等老板拍板
> **作者**: 黑
> **触发**: 老板 14:08 调整需求 — 媒体→资源 (3 类) + 付费下载 + 云存储

---

## 🎯 老板需求

1. **媒体 → 资源**: 分 image / document / audio 三大类,**取消 video**
2. **付费下载**: 微信扫码 / 支付宝扫码,**需调研集成方案**
3. **存储优化**: 不放本地,找更省 + 更快的方案
4. 浏览/下载**计数** (要), 评论 (不要)

---

## 📦 资源分类 (砍 video, 3 类)

| 类别 | 允许 MIME | 例子 |
|------|----------|------|
| **image** | image/jpeg, png, webp, gif, svg, avif, heic | photo.webp, cover.png |
| **document** | application/pdf, msword, openxmlformats, text/*, application/zip | report.pdf, manual.docx, data.zip |
| **audio** | audio/mpeg, wav, flac, ogg, aac, x-m4a | song.mp3, podcast.m4a |
| ~~video~~ | ❌ **不再支持** (老板决策) | — |

**实施**: server 端 `ALLOWED_MIME_PREFIXES` 砍掉 `video/`,admin 已上传的 video 数据保留不删 (迁移后公开不展示)。

---

## 💰 付费方案 (调研结论)

老板场景: **个人博客/资源售卖**,微信+支付宝扫码。**关键约束: 老板可能无企业资质**。

| 方案 | 费率 | 资质 | 个人可用 | 接口复杂度 | 黑推荐 |
|------|------|------|---------|-----------|-------|
| **虎皮椒支付** | **2%** | 个人/个体户 | ✅ | 简洁 REST | ⭐ **个人首选** |
| PayJS (微信服务商) | 1.2-2% | 个人 | ✅ | 简洁 | 备选 |
| Ping++ (聚合) | 1.2% + ¥0.01 | 企业 | ❌ | SDK | 商用首选 |
| 微信支付 V3 原生 | 0.6% | 仅企业 | ❌ | 复杂 (证书/签名) | 不推荐 |
| 支付宝当面付 原生 | 0.6% | 仅企业 | ❌ | 复杂 | 不推荐 |
| Stripe (海外) | 2.9% + $0.3 | 个人/企业 | ✅ | SDK 友好 | 仅海外用户 |

**老板决策点 Q1**: 选哪个?

**黑推荐**: **虎皮椒** (xunhupay.com) — 个人开发者可直接申请,2% 费率,微信+支付宝通用一份 API,文档全。

申请材料 (虎皮椒):
- 身份证 + 银行卡 + 5 万元流水 (可能砍了,这几年政策放宽)
- 审核周期 1-3 工作日
- 沙箱环境可先联调

---

## ☁️ 存储方案调研 (关键)

### 3 大主流对比

| 方案 | 100GB 存储 | 1TB 出口流量 | 适合 | API 复杂度 |
|------|---------|------------|------|-----------|
| **Cloudflare R2 + CF CDN** | $1.5 ≈¥11 | **$0** ⭐ 出口免费 | **全球/海外** | S3 兼容,易迁移 |
| 阿里云 OSS + 阿里 CDN | ¥10 | ¥300 (CDN 量) | **国内** | 国内快 |
| AWS S3 + CloudFront | $2.3 | $850 贵 | 全球 | 标准 |
| Backblaze B2 | $0.5 | $10 | 全球 | S3 兼容 |
| 自建本地 (当前) | 本机硬盘 (无 GB/月开销) | 自家 BGP ≈¥300/TB (4c16g 服务器) | 5-10GB | — |

### 黑最推荐 (分人群)

**如果用户在国内 (主)**: 阿里云 OSS + 阿里 CDN (国内节点 ~200ms, 慢?但稳定可靠)
**如果用户全球 (海外/出口多)**: **Cloudflare R2** (0 出口流量费是革命性优势, 1TB/月 ≈ ¥0)

**老板决策点 Q2**:
| 选 | 适用 |
|----|------|
| **A**: Cloudflare R2 (海外/全球用户) | 1TB 流量免费 → 实际省钱数量级 |
| **B**: 阿里云 OSS (国内为主) | 国内 50-100ms 访问 |
| **C**: 双写 (R2 + OSS) | 复杂,贵,但最稳 |

### 加速细节

- **图片优化**: Cloudflare Images ($5/月 + $1/1000 转换) 自动 WebP/AVIF + 响应式尺寸
- **CNAME + HTTPS**: CF 一键配置
- **回源策略**: 公开 CDN → 源站 R2/OSS (零拷贝)

---

## 📊 计数 (要) + 不评论

老板要"计数不要评论"。

### Schema 改动

```sql
-- 1. media_items 加 3 字段
ALTER TABLE media_items ADD COLUMN category TEXT NOT NULL DEFAULT 'image'
  CHECK (category IN ('image','document','audio'));
ALTER TABLE media_items ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media_items ADD COLUMN price_cents INTEGER;
ALTER TABLE media_items ADD COLUMN currency TEXT DEFAULT 'CNY';

-- 2. 浏览/下载计数
CREATE TABLE media_access_logs (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('view','download')),
  ip_hash TEXT,                       -- SHA256(IP) 隐私
  user_agent_hash TEXT,
  country TEXT,                       -- CF-IPCountry header
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_media_access_logs_media ON media_access_logs(media_id);
CREATE INDEX idx_media_access_logs_created ON media_access_logs(created_at);

-- 聚合,避免 N+1
CREATE TABLE media_counters (
  media_id TEXT PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at INTEGER,
  last_downloaded_at INTEGER
);

-- 3. 付费订单
CREATE TABLE media_orders (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media_items(id),
  out_trade_no TEXT UNIQUE NOT NULL,    -- 商家订单号
  external_id TEXT,                    -- 第三方交易号(回调填)
  channel TEXT NOT NULL CHECK (channel IN ('wechat','alipay')),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at INTEGER,
  download_token TEXT,                  -- HMAC token (paid 时生成)
  download_token_expires_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_media_orders_out ON media_orders(out_trade_no);
CREATE INDEX idx_media_orders_media ON media_orders(media_id);
```

---

## 🔌 REST API 改动

| 端点 | 改动 |
|------|------|
| `POST /api/admin/media` | ⛔ mime 限定 (3 类) + 必填 category + 可选 is_paid/price_cents → **上传到 R2/OSS** |
| `GET /api/resources` | 公开列表(替代 `/api/media`) |
| `POST /api/resources/[id]/view` | 浏览 +1 counter |
| `GET /api/resources/[id]/download` | 智能:免费 → 302 R2;付费 → 检查 token → 302 |
| `POST /api/resources/[id]/order` | 创建付费订单 → 调用虎皮椒 → 返回 QR base64 |
| `POST /api/payment/callback` | 第三方支付 webhook,验签→更新 paid→生成 download_token |
| `GET /admin/resources` | 替代 `/admin/media` |
| `GET /admin/orders` | 老板收款记录 |

---

## 🎨 UI 改动

### 公开 `/resources` (替代 `/media`)
- 顶部 tab: 📷 图片 / 📄 文档 / 🎵 音频 (3 个分类)
- 卡片显示:缩略图 / 文件类型图标 + 计数 👁 12 / ⬇ 3
- 按钮:
  - 免费:`[👁 预览]` + `[⬇ 下载]`
  - 付费:`[💰 ¥9.9 购买]` → 弹 QR modal → 扫码 → 完成 → 拿下载链接

### Admin `/admin/resources`
- 上传表单:多选`category`(图片/文档/音频)+ 勾选`付费下载` + 价格 input
- 列表显示 counter + 销售 (需付费时)

---

## 🔁 付费下载流程

```
[客户端]                                 [服务端]                        [第三方支付]
                                                │
[1] 点 "购买"                                  │
   → POST /api/resources/X/order               │
   ← { qrImage: base64, out_trade_no }         │
                                                ├── 创建 media_orders
                                                ├── 调虎皮椒 create_order ──────→ 微信/支付宝下单
                                                │                                  返回 QR 二维码 URL
[2] 显示 QR (modal)                            │                                  显示给用户
                                                │
[3] 用户扫码 → 微信/支付宝                        │
   支付完成                                     │                                  ←─ webhook 推送
                                                ├── POST /api/payment/callback ←────── 验签
                                                ├── 更新 media_orders.status='paid'
                                                ├── 生成 download_token (HMAC, 24h 过期)
                                                │     │
[4] 我的订单 / 拿下载链接  ←─────────────────────┘
   → GET /api/orders/[id]/download
   ← { downloadUrl: ...token=xxx }
                                                │
[5] GET /api/resources/X/download?token=xxx     │
   ← 302 redirect to R2 signed URL              ├── 校验 token + 过期
   浏览器直接下载                                ├── counter.download++
                                                │
[6] 客户端下载 R2 URL                            │
   R2 → 用户 (CF CDN 边缘)
```

**防作弊**:
- download_token 单次使用? (看怎么设计, 我建议 24h 多次, anti-link-share)
- IP 限速 (10 次/小时 per IP)
- CSRF / signed order

---

## 📆 实施阶段 (建议 4 周)

| P | 内容 | 工时 | 风险 |
|---|------|------|------|
| **P0** | Schema 迁移 + 取消 video + counter 表 | 0.5d | 低 |
| **P1** | Cloudflare R2 / 阿里 OSS 集成 + 上传改造 | 1.5d | 中 (DNS + 验证签名) |
| **P2** | 公开 `/resources` 重写 + 计数 hook + 卡片 UI | 1.5d | 低 |
| **P3** | 虎皮椒集成: order + QR + webhook | 2.5d | 中 (沙箱联调+ 异步回调) |
| **P4** | admin 改造 + 文档 + 部署配置 (env vars) | 1d | 低 |

**总**: ~7 工作日

---

## 🎯 老板决策点 (Q1-Q4)

| # | 问题 | 选项 | 黑推荐 |
|---|------|------|--------|
| **Q1** | 支付集成商 | 虎皮椒 / PayJS / Ping++ / 微信+支付宝原生 | **虎皮椒** (个人友好,2% 费率) |
| **Q2** | 存储方案 | Cloudflare R2 / 阿里 OSS / 双写 / 维持本地 | **R2 (海外) 或 OSS (国内)** |
| **Q3** | URL 改名 | 保持 `/media` / 改为 `/resources` | **`/resources`** (语义清晰) |
| **Q4** | 计数显示 | 精确数 / 区间 (10+) / 仅自己看 | **公开区间 (10+)** (隐私友好) |

---

## 📝 老板需准备的材料

| 资源 | 时间 | 说明 |
|------|------|------|
| 虎皮椒账号 (Q1) | 1-3 工作日审核 | 身份证 + 银行卡 |
| Cloudflare 账号 | 5 min | 注册 + R2 绑卡 |
| R2 bucket + access key | 10 min | console 操作 |
| 阿里云账号 + 备案 CDN (Q2=B) | 1-2 工作日 | CDN 域名要 ICP 备案 |

---

## ⚠️ 风险与依赖

1. **资质审核**: 虎皮椒/微信支付商户号,审核期间用**沙箱**联调,不阻塞开发
2. **现有 video 数据**: v0.33.x 已上传的 video 文件保留数据,但**公开不展示**(server 拒绝 accept 新 video)
3. **本地服务器存储**: 老板当前 4c16g 上已有的 media 文件 (`/public/uploads/`) 可:
   - 选项 1: 一次性迁移到 R2/OSS (脚本批量)
   - 选项 2: 双写过渡期 (新上传云,老 URL 仍指本地)
   - 选项 3: 永远不迁移 (新上传云,历史资源作 archived)
4. **CDN HTTPS**: 必须配置 TLS, Cloudflare 一键, 阿里 CDN 需自签证书

---

## ⏸ 等老板拍板 Q1-Q4,黑立即开 P0

(默认推荐: 虎皮椒 + R2 + `/resources` 改名 + 区间显示)