// ============================================================
// feed.test.ts — Phase 2.4 RSS 单测
// 严守 v0.6.1 schema: PostCategory ∈ {'tech','life'}
// ============================================================

import { describe, it, expect } from "vitest";
import { escapeXml, escapeAttr, toIso, entryId, buildAtomFeed, buildRssFeed } from "@/lib/feed";
import type { PostWithAuthor, SiteConfig } from "@/lib/types";

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
  analytics: null,
  updated_at: 1719120000 // 2024-06-23 13:20 CST
};

const basePost: PostWithAuthor = {
  id: "post_1",
  slug: "hello-obsidian",
  title: "你好, 黑曜石日志",
  excerpt: "开篇, 介绍 obsidian-journal",
  content: "# 你好\n\n这是**第一篇**文章。",
  cover_image: null,
  status: "published",
  category: "tech",
  tags: "obsidian,intro",
  author_id: "user_1",
  published_at: 1719120000,
  created_at: 1719120000,
  updated_at: 1719120000,
  view_count: 0,
  fts: null,
  author: { name: "上坤", email: "shangkun@handfoot.cn" }
};

describe("escapeXml", () => {
  it("应该转义 5 个 XML 预定义实体", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;");
  });
  it("null/undefined 应该返回空串", () => {
    expect(escapeXml(null)).toBe("");
    expect(escapeXml(undefined)).toBe("");
  });
});

describe("escapeAttr", () => {
  it("不转义单引号, 只转义双引号", () => {
    expect(escapeAttr(`O'Reilly & "X"`)).toBe("O&apos;Reilly &amp; &quot;X&quot;".replace("&apos;", "'"));
  });
});

describe("toIso", () => {
  it("0 → 1970-01-01 epoch", () => {
    expect(toIso(0)).toBe("1970-01-01T00:00:00.000Z");
  });
  it("null/undefined → 1970-01-01 epoch", () => {
    expect(toIso(null)).toBe("1970-01-01T00:00:00.000Z");
  });
  it("unix timestamp (秒) → ISO 8601", () => {
    // 1719120000 = 2024-06-23 13:20:00 CST = 2024-06-23 05:20:00 UTC
    expect(toIso(1719120000)).toBe("2024-06-23T05:20:00.000Z");
  });
});

describe("entryId", () => {
  it("应该生成 tag URI (RFC 4151)", () => {
    const id = entryId("https://obsidian.handfoot.cn", "hello");
    expect(id).toMatch(/^tag:obsidian\.handfoot\.cn,\d{4}:\/posts\/hello$/);
  });
});

describe("buildAtomFeed (v0.6.1 严守)", () => {
  const xml = buildAtomFeed({
    site: baseSite,
    siteUrl: "https://obsidian.handfoot.cn",
    posts: [basePost]
  });

  it("应该有 XML 头 + feed 根元素 + Atom namespace", () => {
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
  });

  it("应该有 feed 元数据 (id, title, subtitle, updated)", () => {
    expect(xml).toContain("<id>https://obsidian.handfoot.cn/</id>");
    expect(xml).toContain("<title>黑曜石日志</title>");
    expect(xml).toContain("<subtitle>用代码与数据说话</subtitle>");
    expect(xml).toContain("<updated>2024-06-23T05:20:00.000Z</updated>");
  });

  it("应该有 self + alternate 链接 (RFC 4287 §4.1)", () => {
    expect(xml).toContain('rel="self" type="application/atom+xml"');
    expect(xml).toContain('rel="alternate" type="text/html"');
  });

  it("应该包含 generator 字段 (v0.6.1)", () => {
    expect(xml).toContain("obsidian-journal");
    expect(xml).toContain('version="0.6.1"');
  });

  it("entry 应该有 8 个 Atom 必填/推荐字段", () => {
    expect(xml).toContain("<entry>");
    expect(xml).toContain("tag:obsidian.handfoot.cn");
    expect(xml).toContain("<title>你好, 黑曜石日志</title>");
    expect(xml).toContain('href="https://obsidian.handfoot.cn/posts/hello-obsidian"');
    expect(xml).toContain("<published>2024-06-23T05:20:00.000Z</published>");
    expect(xml).toContain("<updated>2024-06-23T05:20:00.000Z</updated>");
    expect(xml).toContain("<name>上坤</name>");
    expect(xml).toContain('term="tech"');
  });

  it("PostCategory 应该是 v0.6.1 严守的 'tech' (不能是 'novel' / 'video' / 'media')", () => {
    expect(xml).toContain('term="tech"');
    expect(xml).not.toContain('term="novel"');
  });

  it("应该对 title 做 XML escape", () => {
    const dirtyPost = { ...basePost, title: `Tom & Jerry "Best" <Friends>` };
    const xml2 = buildAtomFeed({ site: baseSite, siteUrl: "https://x.com", posts: [dirtyPost] });
    expect(xml2).toContain("&lt;Friends&gt;");
    expect(xml2).toContain("&quot;Best&quot;");
  });
});

describe("buildRssFeed (v0.6.1 严守)", () => {
  const xml = buildRssFeed({
    site: baseSite,
    siteUrl: "https://obsidian.handfoot.cn",
    posts: [basePost]
  });

  it("应该有 RSS 2.0 头 + rss 根 + channel", () => {
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("xmlns:content=");
    expect(xml).toContain("<channel>");
  });

  it("channel 必填: title / link / description", () => {
    expect(xml).toContain("<title>黑曜石日志</title>");
    expect(xml).toContain('<link>https://obsidian.handfoot.cn/</link>');
    expect(xml).toContain("<description>用代码与数据说话</description>");
  });

  it("应该有 atom:link self (RSS Best Practice)", () => {
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('rel="self" type="application/rss+xml"');
  });

  it("item 应该有 title / link / guid / pubDate / category", () => {
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>你好, 黑曜石日志</title>");
    expect(xml).toContain('<guid isPermaLink="true">');
    expect(xml).toContain("<pubDate>");
    expect(xml).toContain("<category>tech</category>");
  });

  it("content:encoded 应该用 CDATA 包裹", () => {
    expect(xml).toContain("<content:encoded><![CDATA[");
    expect(xml).toContain("]]></content:encoded>");
  });

  it("PostCategory 应该是 'tech' (v0.6.1 严守)", () => {
    expect(xml).toContain("<category>tech</category>");
  });
});

describe("多 post 测试 (life 分类)", () => {
  it("life 分类的 post 也能正常输出", () => {
    const lifePost: PostWithAuthor = { ...basePost, id: "post_2", slug: "life-1", category: "life", title: "生活杂感" };
    const xml = buildAtomFeed({ site: baseSite, siteUrl: "https://x.com", posts: [basePost, lifePost] });
    expect(xml).toContain('term="tech"');
    expect(xml).toContain('term="life"');
    expect(xml).toContain("生活杂感");
  });

  it("空 posts 数组应该输出无 entry 的 feed", () => {
    const xml = buildAtomFeed({ site: baseSite, siteUrl: "https://x.com", posts: [] });
    expect(xml).toContain("<feed");
    expect(xml).not.toContain("<entry>");
  });
});
