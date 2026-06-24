# 更新日志 (Changelog)

## v0.3 — 2026-06-24 (基于老板第二批 9 条反馈)

### 🔴 关键问题 (3, 已修复)

1. **CustomHtmlBlock 开启路径缺失** → 加 **Q9b 决策项** + SiteConfig.allowCustomHtml 开关 + Settings 显式开启 + 保存时 DOMPurify 二次清洗 + Block 库 disabled 灰显
2. **Cloudflare Worker 仓库结构未规划** → 加 **§22 Worker 仓库结构** 章节 + **Q10 决策项** (独立 repo / monorepo, 黑推荐独立 repo)
3. **小说"作品 (Novel)" 实体缺失** → 加 Novel + NovelVolume 双层模型, Chapter 挂 NovelVolume 不再挂 Series

### 🟡 中等问题 (4, 已修复)

4. **媒体引用追踪缺实现** → 加 MediaUsage 中间表 (多态关联 post/chapter/page/video)
5. **SiteConfig.socials String JSON 不严谨** → 加 Social 表规范化 (platform/label/url/icon/order/visible)
6. **FTS5 同步失败无降级** → 明确同步失败降级 + warning log + Admin"重建索引"按钮 + 定时 cron
7. **Video.series String 不严谨** → 加 VideoSeries 表 + 外键 (统一数据模型)

### 🟢 小问题 (4, 已修复)

8. **BlockBase 缺 theme 字段** → 加 `theme?: 'light' | 'dark' | 'auto'`, Block 容器动态加 className
9. **MarqueeBlock 凑数** → **移除** (现代博客几乎不用)
10. **MusicBlock 反人类** → 保留但**标"高级"**, 加使用场景文档警告
11. **CalloutBlock 新增** → 替代 Marquee, 现代博客高频 (info/warning/success/danger)
12. **view 计数方案缺失** → 加 **§23 View 计数方案** 章节 (DB UPDATE + 同 IP 24h 防刷)

### Block 类型清单变更

| Block | v0.2 | v0.3 |
|---|---|---|
| Hero / Text / Gallery / Stats / Skills / Timeline / Links / Posts / Videos / Divider / CustomHtml | ✅ | ✅ |
| **Marquee** | ✅ | ❌ 移除 |
| **Music** | ✅ | ⚠️ 保留 (标"高级", 默认折叠) |
| **Callout** 🆕 | — | ✅ 新增 |

**总 Block 数**: 13 → **13** (12 常规 + 1 高级 Music)

### 数据模型变更

| 表 | v0.2 | v0.3 |
|---|---|---|
| User / SiteConfig / Post / Page / Media / DailyStat | ✅ | ✅ |
| Series (tech 文章系列) | ✅ | ✅ (限定 tech/life) |
| Chapter (小说章节) | ✅ | ✅ (改挂 NovelVolume) |
| **Novel** 🆕 | — | 小说作品 (元界) |
| **NovelVolume** 🆕 | — | 小说卷 (元界 第一卷) |
| **Social** 🆕 | — | 友链/社交规范化 |
| **MediaUsage** 🆕 | — | 媒体引用追踪 |
| **VideoSeries** 🆕 | — | 视频系列外键 |
| Video.series String | — | 改 seriesId 外键 → VideoSeries |

### 新增决策项

- **Q9b** 🆕: CustomHtmlBlock 是否允许开启 (黑推荐: 默认禁用, Settings 显式开启)
- **Q10** 🆕: Worker 仓库结构 (黑推荐: 独立 repo)
- **Q11** 🆕: Novel 模型设计采用 (黑推荐: Novel + NovelVolume 双层)

### 文档规模
- v0.2: 1835 行
- v0.3: ~2200 行 (+20%)

---

## v0.2 — 2026-06-24

### 🔴 关键 (3)
- Page Builder 升级 Page + Block[]
- 百度改 B 方案 + C 降级
- 数据模型严谨化

### 🟡 中等 (4)
- Page Builder 3 栏 UI
- SQLite FTS5 搜索
- 媒体库模块
- Post/Chapter 拆表

### 🟢 小 (3)
- 默认亮色
- content/ gitignore 明细
- Series/合集页

---

## v0.1 — 2026-06-24 (初稿, 已废)

### 已废原因
- Page Builder 太弱 (老板指出)
- 百度方案 C 不算"直接播放"
- 数据模型不严谨
- 缺媒体库
- 缺 Novel 层
- FTS5 无降级
- 媒体无引用追踪
- Social 字段不规范化
- Block 类型有凑数
- Worker 仓库结构未规划
