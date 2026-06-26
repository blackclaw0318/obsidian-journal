// ============================================================
// obsidian-journal Seed (Phase 1 默认数据, Phase 3.1 升级 bcrypt)
// ============================================================
import bcrypt from "bcryptjs";
import {
  userRepo,
  siteConfigRepo,
  socialRepo,
  postRepo,
  novelRepo,
  volumeRepo,
  chapterRepo,
  videoSeriesRepo,
  videoRepo,
  resetAllData
} from "../lib/repo";
import { initSchema } from "../lib/db";

initSchema();

console.log("🌱 Seeding obsidian-journal...");

if (process.env.NODE_ENV !== "production") {
  console.log("🗑️  Cleaning existing data...");
  resetAllData();
}

// 1. Admin (Phase 3.1: bcrypt 哈希; 默认密码从 ADMIN_PASSWORD env 读, 缺省 "admin123")
const ADMIN_EMAIL = "admin@obsidian.local";
const ADMIN_DEFAULT_PASSWORD = "admin123";
const adminPassword = process.env.ADMIN_PASSWORD || ADMIN_DEFAULT_PASSWORD;
const admin = userRepo.create({
  email: ADMIN_EMAIL,
  password_hash: bcrypt.hashSync(adminPassword, 10),
  name: "上坤",
  role: "admin"
});
console.log(`✅ User: ${admin.email} (默认密码: ${adminPassword}${adminPassword === ADMIN_DEFAULT_PASSWORD ? " — 首次登录后必须改!" : ""})`);

// 2. SiteConfig
siteConfigRepo.upsert({
  site_name: "黑曜石日志",
  site_tagline: "用代码与数据说话",
  site_description: "HandFoot 商业帝国的工程笔记、AI 算法实战、个人创作。",
  site_keywords: "技术博客,AI,全栈,创业,黑曜石",
  default_theme: "light",
  allow_custom_html: 0,
  baidu_push_enabled: 1
});
console.log("✅ SiteConfig");

// 3. Socials
socialRepo.create({ platform: "github", label: "GitHub", url: "https://github.com/blackclaw0318", icon: "github", order: 1, visible: 1 });
socialRepo.create({ platform: "email", label: "Email", url: "mailto:admin@obsidian.local", icon: "mail", order: 2, visible: 1 });
socialRepo.create({ platform: "rss", label: "RSS", url: "/rss.xml", icon: "rss", order: 3, visible: 1 });
console.log("✅ 3 Socials");

// 4. Posts
postRepo.create({
  slug: "hello-obsidian",
  title: "你好, 黑曜石日志",
  excerpt: "obsidian-journal 0.6.0 发布 - Next.js 14 + 14 model + 13 Block 的个人博客平台正式开建。",
  content: `# 你好, 黑曜石日志

这是 obsidian-journal 项目的第一篇文章。

## 这是什么

obsidian-journal (黑曜石日志) 是 HandFoot 商业帝国的个人博客平台, 目标:

- 极致精简的内容创作
- Block 可视化编辑器
- SQLite + FTS5 全文搜索
- 自托管 + 2c4g 降级部署

## 技术栈

- Next.js 14 + TypeScript
- node:sqlite (内置) + 手写 Repo
- Tailwind CSS
- Vitest + Playwright

## 路线

Phase 1 骨架 → Phase 2 展示 → Phase 3 Admin → Phase 4 打磨。

> 这是 v0.6.0 seed 数据。`,
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "obsidian,blog,announcement",
  author_id: admin.id,
  published_at: Math.floor(Date.now() / 1000)
});

postRepo.create({
  slug: "deploy-mode-3-tiers",
  title: "部署三档: dev / prod-16g / prod-4g",
  excerpt: "obsidian-journal v0.4 部署方案 - 从 4c16g 开发到 2c4g 生产的完整配置。",
  content: `# 部署三档

obsidian-journal 设计了三档部署模式, 通过环境变量切换。

## 关键差异

| 配置 | dev (4c16g) | prod-16g | prod-4g |
|---|---|---|---|
| PM2 | fork | cluster=2 | fork |
| heap | 4G | 2G | 1.5G |
| sharp 并发 | 4 | 4 | 1 |
| Next.js | 标准 | standalone | standalone |
| SQLite | 默认 | WAL | WAL |
| swap | 无 | 无 | 2GB 必备 |

## 切换命令

\`\`\`bash
DEPLOY_MODE=prod-4g ./scripts/deploy.sh
\`\`\``,
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "deploy,ops",
  author_id: admin.id,
  published_at: Math.floor(Date.now() / 1000) - 86400
});

postRepo.create({
  slug: "testing-strategy",
  title: "测试金字塔 35/30/25/10",
  excerpt: "obsidian-journal v0.5 测试方案 - 4 层金字塔 + 覆盖率门禁 + 视觉回归。",
  content: `# 测试金字塔

4 层测试, 比例 35/30/25/10。

- Unit (35%): 纯函数 / 工具
- Component (30%): Block 渲染 / 交互
- Integration (25%): DB / API / FTS5
- E2E (10%): 老板最关心的"看得见"

## 覆盖率门禁

- 总体 ≥ 75%
- 核心 ≥ 90%`,
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "testing,quality",
  author_id: admin.id,
  published_at: Math.floor(Date.now() / 1000) - 2 * 86400
});
console.log("✅ 3 Posts");

// 5. Novel + Volume + Chapter
const novel = novelRepo.create({
  slug: "meta-realm",
  title: "元界",
  description: "一个关于意识、边界与觉醒的科幻故事。",
  cover_image: null,
  status: "ongoing"
});

const volume = volumeRepo.create({
  novel_id: novel.id,
  order: 1,
  title: "第一卷: 星海之始",
  description: "觉醒前的最后平静。"
});

chapterRepo.create({
  volume_id: volume.id,
  order: 1,
  slug: "chapter-1-awakening",
  title: "觉醒",
  excerpt: "那天夜里, 星光比往常更亮。",
  content: `# 第一章 觉醒

那天夜里, 星光比往常更亮。

小雅站在窗前, 看着远处那颗忽明忽暗的星。她不知道那是什么, 但她知道, 今晚的一切都会改变。

"醒了吗?" 身后传来低沉的声音。

她没有回头, 只是点了点头。

> 这是元界第一卷的第一章, 标志着故事的正式开始。`,
  status: "published",
  published_at: Math.floor(Date.now() / 1000) - 7 * 86400
});

chapterRepo.create({
  volume_id: volume.id,
  order: 2,
  slug: "chapter-2-realm",
  title: "元界",
  excerpt: "当意识跨过边界, 一切都将重新定义。",
  content: `# 第二章 元界

当意识跨过边界, 一切都将重新定义。

小雅第一次感受到了元界的呼吸 - 那是一种无法言说的韵律, 像潮汐, 又像心跳。`,
  status: "published",
  published_at: Math.floor(Date.now() / 1000) - 6 * 86400
});
console.log("✅ Novel + 1 Volume + 2 Chapters");

// 6. Video Series
const vs = videoSeriesRepo.create({
  slug: "tech-talk",
  title: "技术杂谈",
  description: "关于工程、AI 与创业的杂谈视频。",
  cover_image: null,
  order: 1
});

videoRepo.create({
  series_id: vs.id,
  slug: "first-video",
  title: "为什么做 obsidian-journal",
  description: "聊聊这个项目的缘起、设计与未来。",
  embed_url: "https://www.bilibili.com/video/BV1xxxxxxx",
  cover_image: null,
  duration: 600,
  status: "published",
  published_at: Math.floor(Date.now() / 1000)
});
console.log("✅ Video Series + 1 Video");

console.log("");
console.log("🌱 Seed 完成!");
console.log("📊 1 user + 1 siteConfig + 3 socials + 3 posts + 1 novel + 1 volume + 2 chapters + 1 video series + 1 video");