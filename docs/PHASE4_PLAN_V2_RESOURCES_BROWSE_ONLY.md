# Phase 4 / v0.34 计划 — 资源页面 v2 (精简, 仅浏览) — 2026-07-04

> **状态**: ✅ **方案稿已拍板** (老板 17:26 决策) — 立即开 P0-P3
> **触发**: 老板 15:14 精简需求 → 17:26 微调 Q3 计数策略
> **相比 v1 (Phase 4 plan)**: ❌ 移除支付 (P3) / 砍掉 video / 维持本地存储 / **计数显示真实数**

---

## 🎯 老板决策 (17:26 拍板)

| Q | 老板拍板 | 备注 |
|---|----------|------|
| **Q1** | **本地维持** | `/public/uploads/` 现状, 上云留 v0.35+ |
| **Q2** | **`/resources`** | 全路径改名, 含 301 重定向 |
| **Q3** | **真实访问数,不设上限,初始随机百位** | 100-999 随机种子 + 后续真实 +1 |

### Q3 微调要点 (老板 17:26)

老板原话:**"计数不设上限，显示真实访问数，每个初始从随机的百位数开始"**

```
新计数策略:
┌─────────────────────────────────────────────────────┐
│  初始 (上传后) :  100 ≤ base_value ≤ 999 (随机种子)  │
│  浏览 view    :  display = base + view_count        │
│  下载 download:  display = base + download_count    │
│  显示给用户  :  真实数字, 无区间                       │
│  不造假      :  基础值仅 1 次, 之后全是真实访问量       │
└─────────────────────────────────────────────────────┘
```

**设计意图** (黑冷峻解读):
- ✅ **社会证明**: 新资源不显 "0 浏览" 看起来冷清 → 100-999 基础量
- ✅ **不撒谎**: 基础值一次性, 之后全是真实累计, 不动态追加假数据
- ✅ **无上限**: 区别于 v0.34 v1 的"10+"区间显示, 更显诚意
- ✅ **随机而非固定**: 避免不同资源看起来完全一样 (e.g. 都从 100 起)
- ⚠️ **隐私**: 完全公开的精确数字, 不做去重 (但 view 去重 24h/ip_hash)

---

## 📌 老板保留需求 (15:14 拍板)

1. **删除 video 格式数据** — DB + 物理文件, server 端**永久禁止** video/*
2. **媒体 → 资源** — URL/逻辑一致改动
3. **暂时不做付费** — Q1=虎皮椒 / Q1=当面付 全部暂停, v0.35 单开
4. **用户能正常浏览** — 列表 + 分类筛选 + 预览 + (浏览/下载真实计数)
5. 评论:不要 (仍)

---

## 🔧 实施步骤 (~3 工作日)

### P0: Schema + 数据迁移 (半天)

```sql
-- 1) 物理清理: 删所有 video 类
DELETE FROM media_items WHERE mime_type LIKE 'video/%';
-- 同步 unlink 物理文件:
--   node: sqlite 导出 url, fs.unlink 每条

-- 2) 加 category 字段 (image/document/audio 三选)
ALTER TABLE media_items ADD COLUMN category TEXT NOT NULL DEFAULT 'image' 
  CHECK (category IN ('image','document','audio'));

-- 3) 重新归类历史数据 (按 mime)
UPDATE media_items SET category = CASE 
  WHEN mime_type LIKE 'image/%' THEN 'image'
  WHEN mime_type LIKE 'audio/%' THEN 'audio'
  WHEN mime_type LIKE 'application/pdf' 
    OR mime_type LIKE 'application/%word%'
    OR mime_type LIKE 'application/%sheet%'
    OR mime_type LIKE 'application/%zip%'
    OR mime_type LIKE 'text/%' THEN 'document'
  ELSE 'image' 
END;

-- 4) 加 is_paid 字段 (默认 0, 暂不启用, 为付费扩展预留)
ALTER TABLE media_items ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;

-- 5) 加浏览/下载计数 + 真实种子 (老板 17:26 决策)
CREATE TABLE media_counters (
  media_id TEXT PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
  base_value INTEGER NOT NULL,              -- 100-999 随机种子, 创建时一次性写入
  view_count INTEGER NOT NULL DEFAULT 0,   -- 真实浏览累计
  download_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at INTEGER,
  last_downloaded_at INTEGER,
  created_at INTEGER NOT NULL
);
-- 注意: 没有合成字段, 显示端做 base + count 实时计算

-- 6) 访问流水 (审计 + 24h 去重)
CREATE TABLE media_access_logs (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('view','download')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  country TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_media_access_logs_media ON media_access_logs(media_id);
CREATE INDEX idx_media_access_logs_dedupe ON media_access_logs(media_id, access_type, ip_hash, created_at);

-- 7) 历史 counter 初始化 (老板 Q3 决策):
--    每个现存 media_item 分配一次 base_value 100-999
--    不能固定, 每次迁移应使用 sqlite RANDOM()
INSERT INTO media_counters (media_id, base_value, created_at)
SELECT id, 100 + ABS(RANDOM() % 900), strftime('%s','now') * 1000
FROM media_items
WHERE id NOT IN (SELECT media_id FROM media_counters);
```

**base_value 生成规则** (lib/repo.ts 写入时):
```ts
function genBaseValue(): number {
  return 100 + Math.floor(Math.random() * 900); // [100, 999]
}

// 上传资源 (admin POST) → mediaRepo.create() 内:
//   同时 INSERT media_counters (base_value = genBaseValue())
```

**is_paid 字段保留意义**: 未来 v0.35 接付费时,只需加 `media_orders` 表 + 改上传 UI,无需 schema migration。

### P1: URL 改名 /media → /resources (1 天)

**文件改名**:
```
app/media/page.tsx                          → app/resources/page.tsx
app/media/_components/MediaGrid.tsx          → ResourceGrid.tsx
app/media/_components/MediaPreviewModal.tsx  → ResourcePreviewModal.tsx
app/admin/(admin)/media/page.tsx             → admin/resources/page.tsx
app/admin/(admin)/media/_components/MediaUploader.tsx → ResourceUploader.tsx
app/admin/(admin)/media/_components/MediaGrid.tsx    → ResourceAdminGrid.tsx
app/api/admin/media/route.ts                 → api/admin/resources/route.ts
app/api/admin/media/[id]/route.ts            → api/admin/resources/[id]/route.ts
```

**重定向**: 旧 `/media` 公开页 301 → `/resources` (SEO 友好)
**别名处理**:
- `mediaRepo` → `resourceRepo` (lib/repo.ts)
- `MediaItem` type → `Resource` (lib/types.ts) **OR 保留 MediaItem 别名** (我推荐后者,改动小)
- 字段名:`mime_type` 保留 (语义对),`category` 加在 media_items 上 (3 类筛选用)

**保留 `MediaItem` type 不改**: 因为 DB 列名是 media_items,MIME 兼容 image/document/audio 三类,type 改名会引起广泛影响。
- **决策**: type 仍叫 MediaItem,只是 category 字段加上去

**admin 上传改造**:
- `ALLOWED_MIME_PREFIXES = ["image/", "audio/", "application/pdf"]` (砍 video)
- alt 必填 (因为这是浏览页面,alt 是核心)
- 表单新增 category 单选 (image/document/audio 自动从 MIME 检测)
- **写入时**: 同时 INSERT media_counters (base_value = genBaseValue())

### P2: 公开 /resources + 计数 (1 天)

**新公开页 `/resources`**:
- 顶部 3 tabs: 📷 图片 / 📄 文档 / 🎵 音频
- 卡片显示:缩略图(图片用 img,文档/音频用图标) + 文件名 + **真实计数** (👁 145 / ⬇ 12)
- 点击卡片 → ResourcePreviewModal (已有 MediaPreviewModal,改 mime preview 覆盖三类的)
- 预览按钮 + 下载按钮(直接 download link)

**计数显示逻辑** (老板 Q3 真实数):
```ts
// lib/counter.ts (新工具)
function displayView(c: { base_value: number; view_count: number }): number {
  return c.base_value + c.view_count;
}
function displayDownload(c: { base_value: number; download_count: number }): number {
  return c.base_value + c.download_count;
}
// 直接渲染数字, 无区间, 无模糊化
// 例: 显示 234 浏览 + 12 下载 (用户每次看到同一资源是固定数, 真实累计)
```

**浏览 +1 触发**:
```
API: POST /api/resources/[id]/view
  ├── 24h 内同 ip_hash + view 已 +1 → 跳过 (不写日志, 不加计数)
  └── 否则:
      ├── mediaCountersRepo.incView(id)       -- view_count++
      ├── mediaAccessLogs.insert(access_type='view', ip_hash=...)
      └── return 200 { display: base + view_count }

触发时机: 客户端打开详情页(modal open)时调 1 次
去重: 同 ip_hash + 24h 内只 +1
```

**下载 +1 触发**:
```
API: GET /api/resources/[id]/download
  ├── 校验 (auth 暂时不需要, 日后加付费再加)
  ├── mediaCountersRepo.incDownload(id)        -- download_count++
  ├── mediaAccessLogs.insert(access_type='download', ip_hash=...)
  └── 302 redirect to /uploads/{filename}
```

**显示原则**:
- 用户每次刷新看到的计数 = `base_value + count` (递增)
- 不做区间 (老板 17:26 决策)
- 不做隐私模糊 (基础种子一次性, 之后全真实)

### P3: 测试 + 文档 (0.5 天)

- e2e: /resources 列表 + 真实计数显示 + modal preview (image/audio/PDF 三类各 1)
- e2e: admin /resources 上传 PNG/MP3/PDF (验证 video 被拒) + **验证新建 base_value 在 [100,999]**
- e2e: view +1 / download +1 触发逻辑 (24h 去重测试)
- unit: genBaseValue (3 次采样验证 [100,999])
- unit: displayView / displayDownload (数学正确)
- integration: 数据迁移脚本幂等 (空 video + 历史 base_value 写入)
- 文档:PHASE3_STATUS_2026_07_04_V34.md 收官报告

---

## 📁 改动文件清单

```
M  lib/types.ts                              (保留 MediaItem, 加 category + is_paid 字段)
M  lib/repo.ts                               (resourceRepo + counter + access log 写入)
M  lib/db.ts                                 (ALTER TABLE 加字段 + CREATE media_counters + access_logs)
A  lib/counter.ts                            (新: displayView / displayDownload / genBaseValue)
M  scripts/migrate-resources-v2.mts          (新: 数据迁移脚本, 清理 video + 归类历史数据 + base_value)
A  app/resources/page.tsx                    (重命名 + 改)
A  app/resources/_components/                (新目录)
A  app/admin/(admin)/resources/page.tsx
A  app/admin/(admin)/resources/_components/
M  app/api/admin/resources/route.ts          (改 + 限 mime + 创建时写入 base_value)
M  + tests/integration/resources-migration.test.mts (迁移幂等 + base_value 范围)
M  tests/e2e/resources.spec.ts                (新覆盖 /resources + admin)
M  tests/unit/counter.test.mts                (新: genBaseValue 范围 + 显示函数)
M  docs/PHASE3_STATUS_2026_07_04_V34.md
```

---

## 🛡 复用 v0.33.x 基础设施 (无重写)

| 已建 | 复用 |
|------|------|
| ✅ busboy 流式上传 (race fix v0.33.3) | 保留,改 mime allowlist |
| ✅ XHR upload + 进度条 UI (MediaUploader) | 保留,改名 ResourceUploader |
| ✅ MediaPreviewModal (image/video/audio/PDF) | 改为只显示 image/document/audio 三类 |
| ✅ admin token auth (requireUser) | 保留 |

**新代码**:
- mediaCountersRepo (新方法:incView / incDownload / getByMedia / create with base_value)
- mediaAccessLogsRepo (新方法: insert + 24h dedupe 查询)
- 计数 API 路由 (POST view + GET download)
- lib/counter.ts (genBaseValue + display 函数)
- 公开页 + admin 改名 + UI 调 mime 屏蔽

---

## ⚠️ 数据迁移注意事项

### 现存 video 数据
- DB 里用 `mime_type LIKE 'video/%'` 找到的行 → **DELETE**
- 每个 url 对应 `public/uploads/{filename}.mp4|.mov|...` → `unlink`
- **回滚**: 可在迁移前加 git-tracked SQL 备份,失败回滚

### 历史 media_items base_value 初始化 (老板 17:26 Q3)
- 每个现存 media_item 在迁移时分配 1 次 base_value (RANDOM 100-999)
- **不是固定 100**, 避免历史资源看起来全是 100 浏览
- 迁移脚本幂等 (重复跑不重复分配)

### 现存 media_items 重命名
- 旧 `media_items` 表 **保留**(type + repository 不变)
- 只是**加 category 列**, 不重命名表, 不重命名 type
- 路径 `app/media/` → `app/resources/` 是物理改名 (git mv)

### 是否保留 `media_items` 数据库表名
- 保守:**保留** (改名风险大,迁移期间短暂停服)
- 激进:同时 rename `media_items` → `resources`
- **黑建议**: 保留表名 + `mediaRepo` 内部读取加 category 即可,**避免不必要迁移风险**

---

## 🎯 实施完成定义 (DoD)

- [ ] P0: 迁移脚本运行后, 0 video 残留, 所有 image_items 都有 base_value ∈ [100,999]
- [ ] P1: `/media` 全部 301 跳 `/resources`, admin URL 全改名, 无 404
- [ ] P2: 公开 tabs 三类齐全, 计数显示真实数字 (无区间), view/download +1 触发正常
- [ ] P3: verify:full 全过 (预计新增 ~25 tests, 总量 ~310)
- [ ] docs: PHASE3_STATUS_2026_07_04_V34.md 收官报告

---

## ⏭ 立即开 P0 → 30 min 完成 (老板 17:26 拍板)