# 更新日志 (Changelog)

## v0.2 — 2026-06-24 (基于老板反馈重写)

### 🔴 关键问题 (3)

1. **Page Builder 升级**: `PageSection` → `Page` + `Block[]` 联合类型
   - 13 种 block: hero / text / gallery / stats / skills / timeline / links / posts / videos / divider / customHTML / marquee / music
   - 站长可在任意页面**添加/删除/拖拽排序/配置**任意 block
   - 后台 UI: 左 Block 库 + 中实时预览 + 右配置表单 (dnd-kit + react-hook-form + zod)
2. **百度网盘改为"主推 B 真直接播"**: 老板明确要"直接播放", 黑不再推 C 方案
   - 默认走 B (第三方解析服务), 标注合规风险 + 服务稳定性风险
   - 提供降级 C 方案, 站长一键切换
3. **数据模型严谨化**:
   - Prisma enum 替换 String 字段 (PostType / PostCategory / BlockType / MediaType)
   - `Post` (tech/life 文章) 与 `Chapter` (小说章节) 拆开
   - 新增 `Series` 表 (技术系列/小说卷)
   - 新增 `Media` 表 (图片/视频/文件)

### 🟡 中等问题 (4)

4. **页面装饰后台补全**: §7.2 表格更新, 明确"添加/删除 block"入口
5. **搜索改 SQLite FTS5**: 替代 Fuse.js, 零依赖, 万级数据 < 50ms
6. **媒体库模块 (新增 §19)**: Phase 3 加媒体管理 (上传/多尺寸/blurhash/URL 替换)
7. **小说与文章数据分离**: `Chapter` 独立表, 关联 `seriesId` + `chapterNo`

### 🟢 小问题 (3)

8. **默认亮色 + 暗色切换**: 改默认亮色 (现代博客风), 暗色仍高质量实现
9. **content/ gitignore 明细化**: 列出具体忽略类型
10. **系列/合集页**: §20 新增 Series 列表 + 详情页设计

### 新增决策项 (Q7-Q9)

- Q7: 第三方解析服务选择 (黑推荐: 自建 Cloudflare Worker 转发 + 多家备用)
- Q8: 媒体库是否独立子域名 (cdn.xxx.com)
- Q9: Page Builder 是"自由搭建"还是"模板驱动"

---

## v0.1 — 2026-06-24 (初稿, 已废)

- 项目立项 + GitHub 仓库创建
- 基础架构设计 (Next.js 14 + Prisma + Auth.js)
- 6 大文档 (DESIGN/ARCHITECTURE/ROADMAP/DECISIONS/README/PUSH_NOTES)
- 2 commits on main

**已废原因**: 老板审核指出 Page Builder 太弱、百度方案 C 不算"直接播放"、数据模型不严谨、缺媒体库。

---

## 决策项变化

| 项 | v0.1 | v0.2 |
|---|---|---|
| Q3 百度网盘 | C (中间页+提取码) | **B (真直接播)** + C 降级 |
| Q5 默认主题 | 暗色 | **亮色** + 暗色切换 |
| Q9 默认搜索 | Fuse.js | **SQLite FTS5** |
| Page Builder | PageSection (固定) | **Page + Block[] 联合类型** |
| 数据模型 | Post 单表 String category | **Post + Chapter 拆表 + enum + Series + Media** |
| 媒体管理 | 无 | **Media 表 + 媒体库后台** |
| 系列页面 | 无 | **Series 列表 + 详情页** |
