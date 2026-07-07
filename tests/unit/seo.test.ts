// ============================================================
// seo.test.ts — Phase 2.3 SEO 单测
// 严守 v0.6.1 schema: PostCategory ∈ {tech, life}
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  siteUrl,
  absoluteUrl,
  canonical,
  jsonLdArticle,
  jsonLdBook,
  jsonLdVideo,
  jsonLdWebSite
} from "@/lib/seo";
import type { PostWithAuthor, Novel, Video, SiteConfig } from "@/lib/types";

const baseSite: SiteConfig = {
  id: "singleton",
  site_name: "黑曜石日志",
  site_tagline: "用代码与数据说话",
  site_description: "HandFoot 商业帝国的博客",
  site_keywords: "AI, 全栈, 创业",
  default_theme: "light",
  allow_custom_html: 0,
  baidu_push_enabled: 1,
  baidu_push_token: null,
  og_image: null,
  favicon: null,
  avatar_url: null,
  analytics: null,
  updated_at: 1719120000
};

const basePost: PostWithAuthor = {
  id: "post_1",
  slug: "hello-obsidian",
  title: "你好, 黑曜石日志",
  excerpt: "开篇介绍",
  content: "# 你好\n\n这是**第一篇**。",
  cover_image: "/uploads/cover.png",
  status: "published",
  category: "tech",
  tags: "obsidian,intro",
  author_id: "user_1",
  published_at: 1719120000,
  created_at: 1719120000,
  updated_at: 1719120000,
  view_count: 0,
  fts: null,
  external_id: null,
  idempotency_key: null,
  external_meta: null,
  author: { name: "上坤", email: "shangkun@handfoot.cn" }
};

const baseNovel: Novel = {
  id: "novel_1",
  slug: "meta-realm",
  title: "元界",
  description: "一个关于意识、边界与觉醒的科幻故事。",
  cover_image: null,
  status: "ongoing",
  deleted_at: null,
  created_at: 1719120000,
  updated_at: 1719120000
};

const baseVideo: Video = {
  id: "video_1",
  series_id: null,
  slug: "intro-v1",
  title: "obsidian-journal 介绍",
  description: "项目介绍视频",
  embed_url: "https://www.youtube.com/embed/abc",
  cover_image: null,
  duration: 120,
  status: "published",
  published_at: 1719120000,
  created_at: 1719120000,
  updated_at: 1719120000,
  view_count: 0
};

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

describe("siteUrl / absoluteUrl / canonical", () => {
  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("siteUrl 应该从 env 读, 默认 localhost", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe("http://localhost:3000");
    process.env.NEXT_PUBLIC_SITE_URL = "https://obsidian.handfoot.cn";
    expect(siteUrl()).toBe("https://obsidian.handfoot.cn");
  });

  it("absoluteUrl 应该防 // 双斜杠, 处理尾斜杠 + 头斜杠", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://obsidian.handfoot.cn/";
    expect(absoluteUrl("/posts/x")).toBe("https://obsidian.handfoot.cn/posts/x");
    expect(absoluteUrl("posts/x")).toBe("https://obsidian.handfoot.cn/posts/x");
    expect(absoluteUrl("/")).toBe("https://obsidian.handfoot.cn/");
  });

  it("canonical 跟 absoluteUrl 一致 (无尾斜杠)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://obsidian.handfoot.cn";
    expect(canonical("/posts/x")).toBe("https://obsidian.handfoot.cn/posts/x");
  });
});

describe("jsonLdArticle (v0.6.1 PostCategory 严守)", () => {
  it("应该输出 schema.org/Article 完整字段", () => {
    const json = jsonLdArticle({ post: basePost, site: baseSite });
    const ld = JSON.parse(json);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("你好, 黑曜石日志");
    expect(ld.articleSection).toBe("tech"); // 严守
    expect(ld.inLanguage).toBe("zh-CN");
    expect(ld.keywords).toBe("obsidian, intro");
    expect(ld.author["@type"]).toBe("Person");
    expect(ld.author.name).toBe("上坤");
    expect(ld.publisher["@type"]).toBe("Organization");
    expect(ld.publisher.name).toBe("黑曜石日志");
    expect(ld.isPartOf["@type"]).toBe("Blog");
  });

  it("articleSection 应该 ∈ {tech, life}, 严禁 novel/video/media", () => {
    const lifePost = { ...basePost, id: "p2", slug: "life-1", category: "life" as const };
    expect(JSON.parse(jsonLdArticle({ post: lifePost, site: baseSite })).articleSection).toBe("life");
    expect(JSON.parse(jsonLdArticle({ post: basePost, site: baseSite })).articleSection).toBe("tech");
  });

  it("cover_image 应该有绝对 URL 数组", () => {
    const ld = JSON.parse(jsonLdArticle({ post: basePost, site: baseSite }));
    expect(ld.image).toEqual([absoluteUrl("/uploads/cover.png")]);
  });

  it("无 cover_image 时 image 字段应该 undefined", () => {
    const noCover = { ...basePost, cover_image: null };
    const ld = JSON.parse(jsonLdArticle({ post: noCover, site: baseSite }));
    expect(ld.image).toBeUndefined();
  });

  it("无 excerpt 时 description 字段应该 undefined", () => {
    const noExcerpt = { ...basePost, excerpt: null };
    const ld = JSON.parse(jsonLdArticle({ post: noExcerpt, site: baseSite }));
    expect(ld.description).toBeUndefined();
  });

  it("@id / url 应该是绝对 URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://obsidian.handfoot.cn";
    const ld = JSON.parse(jsonLdArticle({ post: basePost, site: baseSite }));
    expect(ld["@id"]).toBe("https://obsidian.handfoot.cn/posts/hello-obsidian");
    expect(ld.url).toBe("https://obsidian.handfoot.cn/posts/hello-obsidian");
  });
});

describe("jsonLdBook (Novel 独立 model, Q11)", () => {
  it("应该输出 schema.org/Book + BookSeries", () => {
    const ld = JSON.parse(jsonLdBook(baseNovel, 2, 10));
    expect(ld["@type"]).toBe("Book");
    expect(ld.name).toBe("元界");
    expect(ld.inLanguage).toBe("zh-CN");
    expect(ld.numberOfPages).toBe(10);
    expect(ld.isPartOf["@type"]).toBe("BookSeries");
    expect(ld.isPartOf.numberOfBooks).toBe(2);
  });
});

describe("jsonLdVideo (Video 独立 model)", () => {
  it("应该输出 schema.org/VideoObject + ISO duration", () => {
    const ld = JSON.parse(jsonLdVideo(baseVideo, baseSite));
    expect(ld["@type"]).toBe("VideoObject");
    expect(ld.name).toBe("obsidian-journal 介绍");
    expect(ld.duration).toBe("PT120S"); // ISO 8601 duration
    expect(ld.embedUrl).toBe("https://www.youtube.com/embed/abc");
  });

  it("无 duration 时应该不输出 duration 字段", () => {
    const noDur = { ...baseVideo, duration: null };
    const ld = JSON.parse(jsonLdVideo(noDur, baseSite));
    expect(ld.duration).toBeUndefined();
  });
});

describe("jsonLdWebSite (首页 + SearchAction)", () => {
  it("应该输出 schema.org/WebSite + SearchAction", () => {
    const ld = JSON.parse(jsonLdWebSite(baseSite));
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("黑曜石日志");
    expect(ld.potentialAction["@type"]).toBe("SearchAction");
    expect(ld.potentialAction.target).toContain("/posts?q=");
  });
});

// ============================================================
// P2-20/21: getOgImage fallback 链 (v0.31)
// 优先 cover → 次选 og_image → 末选 avatar → undefined
// ============================================================
import { getOgImage } from "@/lib/seo";

describe("getOgImage (P2-21 fallback 链)", () => {
  // 注意: 上一 describe block 的 afterEach 已还原 env, 保险起见 beforeEach 重置
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("有 cover 时优先用 cover", () => {
    const result = getOgImage("/posts/cover.jpg", baseSite);
    expect(result).toEqual(["http://localhost:3000/posts/cover.jpg"]);
  });

  it("无 cover + 有 og_image 时用 og_image", () => {
    const site = { ...baseSite, og_image: "/uploads/og.png" };
    const result = getOgImage(null, site);
    expect(result).toEqual(["http://localhost:3000/uploads/og.png"]);
  });

  it("无 cover + 无 og_image + 有 avatar 时 fallback 到 avatar (P2-21)", () => {
    const site = { ...baseSite, avatar_url: "/uploads/avatars/me.webp" };
    const result = getOgImage(null, site);
    expect(result).toEqual(["http://localhost:3000/uploads/avatars/me.webp"]);
  });

  it("无 cover + og_image 优先于 avatar (P2-21 顺序)", () => {
    const site = {
      ...baseSite,
      og_image: "/uploads/og.png",
      avatar_url: "/uploads/avatars/me.webp"
    };
    const result = getOgImage(null, site);
    expect(result).toEqual(["http://localhost:3000/uploads/og.png"]);
  });

  it("cover 优先于 og_image + avatar", () => {
    const site = {
      ...baseSite,
      og_image: "/uploads/og.png",
      avatar_url: "/uploads/avatars/me.webp"
    };
    const result = getOgImage("/posts/cover.jpg", site);
    expect(result).toEqual(["http://localhost:3000/posts/cover.jpg"]);
  });

  it("全空时返回 undefined", () => {
    expect(getOgImage(null, baseSite)).toBeUndefined();
    expect(getOgImage(undefined, baseSite)).toBeUndefined();
    expect(getOgImage(null, null)).toBeUndefined();
  });
});
