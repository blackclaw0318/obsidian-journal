# Phase 4 / v0.34 计划 — 资源页面 v2 (精简, 仅浏览) — 2026-07-04

> **状态**: 📋 方案稿,等老板拍 Q1-Q3
> **触发**: 老板 15:14 精简需求 — 砍掉 video 上传 + 砍掉付费功能,先做基础浏览
> **相比 v1 (Phase 4 plan)**: ❌ 移除支付 (P3) / 砍掉 video / 维持本地存储

---

## 🎯 老板精简需求 (15:14)

1. **删除 video 格式数据** — DB + 物理文件,server 端**永久禁止** video/*
2. **媒体 → 资源** — URL/逻辑一致改动
3. **暂时不做付费** — Q1=虎皮椒 / Q1=当面付 全部暂停
4. **用户能正常浏览** — 列表 + 分类筛选 + 预览 + (浏览/下载计数)
5. 评论:不要 (仍)

---

## 📌 老板保留选项 (默认推,等决策)

| Q | 默认推 | 备选 |
|---|--------|------|
| **Q1: 存储** | **本地** (维持现状,日后上云单开) | R2 / OSS / 双写 |
| **Q2: URL 改名** | **`/resources`** (公开 + admin + API 全部改) | 保留 `/media` 仅改 UI |
| **Q3: 计数显示** | **区间 (10+)** | 精确数 / 仅自己看 |

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

-- 5) 加浏览/下载计数 (无评论)
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

CREATE TABLE media_counters (
  media_id TEXT PRIMARY KEY REFERENCES media_items(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at INTEGER,
  last_downloaded_at INTEGER
);
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

### P2: 公开 /resources + 计数 (1 天)

**新公开页 `/resources`**:
- 顶部 3 tabs: 📷 图片 / 📄 文档 / 🎵 音频
- 卡片显示:缩略图(图片用 img,文档/音频用图标) + 文件名 + 计数 (👁 12+ / ⬇ 3+)
- 点击卡片 → ResourcePreviewModal (已有 MediaPreviewModal,改 mime preview 覆盖三类的)
- 预览按钮 + 下载按钮(直接 download link)

**浏览 +1 触发**:
```
API: POST /api/resources/[id]/view
  └── mediaCountersRepo.incView(id)
  └── mediaAccessLogs.insert(...)
  
触发时机: 客户端打开详情页(modal open)时调 1 次
去重: 同 ip_hash + 24h 内只 +1
```

**下载 +1 触发**:
```
API: GET /api/resources/[id]/download
  ├── 校验 (auth 暂时不需要,日后加付费再加)
  ├── mediaCountersRepo.incDownload(id)
  ├── mediaAccessLogs.insert(access_type='download')
  └── 302 redirect to /uploads/{filename}
```

**计数显示策略** (Q3 区间):
```ts
function displayCount(n: number): string {
  if (n < 10) return String(n);
  if (n < 100) return `${Math.floor(n / 10) * 10}+`;
  return `${Math.floor(n / 100) * 100}+`;
}
```

### P3: 测试 + 文档 (0.5 天)

- e2e: /resources 列表 + 计数 + modal preview (image/audio/PDF 三类各 1)
- e2e: admin /resources 上传 PNG/MP3/PDF (验证 video 被拒)
- unit: mediaRepo.category 字段测试
- integration: 数据迁移脚本幂等 (空视频数据)
- 文档:PHASE3_STATUS_2026_07_04_V34.md 收官报告

---

## 📁 改动文件清单

```
M  lib/types.ts                              (Resource type 或保留 MediaItem)
M  lib/repo.ts                               (resourceRepo + counter 方法 + access log 写入)
M  lib/db.ts                                 (ALTER TABLE 加字段)
M  scripts/migrate-resources-v2.mts          (新: 数据迁移脚本, 清理 video + 归类历史数据)
A  app/resources/page.tsx                    (重命名 + 改)
A  app/resources/_components/                (新目录)
A  app/admin/(admin)/resources/page.tsx
A  app/admin/(admin)/resources/_components/
M  app/api/admin/resources/route.ts          (改 + 限 mime)
M  + tests/integration/resources-migration.test.mts (迁移幂等)
M  tests/e2e/resources.spec.ts                (新覆盖 /resources + admin)
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
- mediaCountersRepo (新方法:incView / incDownload / getByMedia)
- mediaAccessLogsRepo (新方法: insert + 查询)
- 计数 API 路由 (POST view + GET download)
- 公开页 + admin 改名 + UI 调 mime 屏蔽

---

## ⚠️ 数据迁移注意事项 (老板要决策)

### 现存 video 数据
- DB 里用 `mime_type LIKE 'video/%'` 找到的行 → **DELETE**
- 每个 url 对应 `public/uploads/{filename}.mp4|.mov|...` → `unlink`
- **回滚**: 可在迁移前加 git-tracked SQL 备份,失败回滚

### 现存 media_items 重命名
- 旧 `media_items` 表 **保留**(type + repository 不变)
- 只是**加 category 列**, 不重命名表, 不重命名 type
- 路径 `app/media/` → `app/resources/` 是物理改名 (git mv)

### 是否保留 `media_items` 数据库表名
- 保守:**保留** (改名风险大,迁移期间短暂停服)
- 激进:同时 rename `media_items` → `resources`
- **黑建议**: 保留表名 + `mediaRepo` 内部读取加 category 即可,**避免不必要迁移风险**

---

## 🎯 老板需决策 (Q1-Q3)

| Q | 问题 | 默认 | 黑推荐 |
|---|------|------|--------|
| **Q1** | 存储方案 | **本地** 维持现状,日后单独上云 | 老板慢慢来 |
| **Q2** | URL 改名 | **`/resources`** 公开 + admin + API 全部 | `/resources` 语义清晰 |
| **Q3** | 计数显示 | **区间 (10+)** | 公开浏览友好 |

P3 (付费) 等老板后续决策 (大概率虎皮椒) 单独开 v0.35。

---

## ⏸ 等老板 Q1-Q3 拍板,Black 立即开 P0-P3 (~3 工作日)
