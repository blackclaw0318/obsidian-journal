// ============================================================
// POST /api/_test-reset-db — dev-only test helper
// 重置 DB 到 seed 状态 (e2e 跨 spec 隔离用)
// ⚠️ 严禁生产使用: 进程级 NODE_ENV === 'production' 时返回 403
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetAllData, userRepo, siteConfigRepo, socialRepo, postRepo, novelRepo, volumeRepo, chapterRepo, videoSeriesRepo, videoRepo } from "@/lib/repo";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "forbidden_in_production" }, { status: 403 });
  }
  // 清所有数据 + 重新 seed
  resetAllData();

  // 1. Admin (bcrypt 默认密码 admin123, 可被 ADMIN_PASSWORD 覆盖)
  const bcrypt = await import("bcryptjs");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const admin = userRepo.create({
    email: "admin@obsidian.local",
    password_hash: bcrypt.default.hashSync(adminPassword, 10),
    name: "上坤",
    role: "admin"
  });

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

  // 3. Socials
  socialRepo.create({ platform: "github", label: "GitHub", url: "https://github.com/blackclaw0318", icon: "github", order: 1, visible: 1 });
  socialRepo.create({ platform: "email", label: "Email", url: "mailto:admin@obsidian.local", icon: "mail", order: 2, visible: 1 });
  socialRepo.create({ platform: "rss", label: "RSS", url: "/rss.xml", icon: "rss", order: 3, visible: 1 });

  // 4. Posts
  postRepo.create({
    slug: "hello-obsidian",
    title: "你好, 黑曜石日志",
    excerpt: "obsidian-journal 0.6.0 发布 - Next.js 14 + 14 model + 13 Block 的个人博客平台正式开建。",
    content: `# 你好, 黑曜石日志\n\n这是 obsidian-journal 项目的第一篇文章。\n\n## 这是什么\n\nobsidian-journal (黑曜石日志) 是 HandFoot 商业帝国的个人博客平台。`,
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
    content: `# 部署三档\n\nobsidian-journal 设计了三档部署模式。`,
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
    content: `# 测试金字塔\n\n4 层测试, 比例 35/30/25/10。`,
    cover_image: null,
    status: "published",
    category: "tech",
    tags: "testing,quality",
    author_id: admin.id,
    published_at: Math.floor(Date.now() / 1000) - 2 * 86400
  });

  // 5. Novel
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
    content: `# 第一章 觉醒\n\n那天夜里, 星光比往常更亮。`,
    published: true,
    published_at: Math.floor(Date.now() / 1000) - 7 * 86400
  });

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

  return NextResponse.json({ ok: true, message: "DB reset to seed state" });
}