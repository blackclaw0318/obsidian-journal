// ============================================================
// middleware-post-view.test.ts - v0.35.3 view_count 服务端 +1 逻辑单测
// 路径匹配 + slug 防御 + cookie dedup 单元测试
// ============================================================
import { describe, it, expect } from "vitest";
import { shouldCountView, viewCookieKey } from "@/lib/view-counter";

const NOW = 1_700_000_000_000;

/** 模拟 middleware 路径匹配逻辑 */
function matchPostSlug(pathname: string): string | null {
  const m = pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  if (raw.includes("/") || raw.includes("\0")) return null;
  return raw;
}

describe("matchPostSlug 路由识别", () => {
  it("匹配单段 /posts/hello", () => {
    expect(matchPostSlug("/posts/hello-obsidian")).toBe("hello-obsidian");
    expect(matchPostSlug("/posts/hello-obsidian/")).toBe("hello-obsidian");
  });

  it("不匹配 /posts (无 slug)", () => {
    expect(matchPostSlug("/posts")).toBeNull();
    expect(matchPostSlug("/posts/")).toBeNull();
  });

  it("不匹配 /posts/a/b (多段)", () => {
    expect(matchPostSlug("/posts/foo/bar")).toBeNull();
  });

  it("不匹配其他路径", () => {
    expect(matchPostSlug("/")).toBeNull();
    expect(matchPostSlug("/admin")).toBeNull();
    expect(matchPostSlug("/resources/123")).toBeNull();
    expect(matchPostSlug("/novels/x")).toBeNull();
  });

  it("slug 中含 URL 编码字符应解码", () => {
    expect(matchPostSlug("/posts/hello%20world")).toBe("hello world");
    expect(matchPostSlug("/posts/%E4%BD%A0")).toBe("你");
  });

  it("拒绝注入: slug 含 / 应返 null", () => {
    expect(matchPostSlug("/posts/foo/bar")).toBeNull();
  });

  it("拒绝注入: slug 含 null byte 应返 null", () => {
    expect(matchPostSlug("/posts/foo\0bar")).toBeNull();
  });
});

describe("viewCookieKey + shouldCountView (cookie dedup)", () => {
  it("post type 应拼接成 oj_view_post_<slug>", () => {
    expect(viewCookieKey("post", "x")).toBe("oj_view_post_x");
    expect(viewCookieKey("post", "hello-obsidian")).toBe("oj_view_post_hello-obsidian");
  });

  it("首次访问 (无 cookie) → should count", () => {
    expect(shouldCountView(undefined, NOW)).toBe(true);
    expect(shouldCountView("", NOW)).toBe(true);
  });

  it("1 小时前访问 → 仍在 24h 内 → 不应计", () => {
    expect(shouldCountView(String(NOW - 60 * 60 * 1000), NOW)).toBe(false);
  });

  it("25 小时前访问 → 超 24h → 应计", () => {
    expect(shouldCountView(String(NOW - 25 * 60 * 60 * 1000), NOW)).toBe(true);
  });

  it("cookie 损坏 → 重置 → 应计", () => {
    expect(shouldCountView("garbage", NOW)).toBe(true);
    expect(shouldCountView("NaN", NOW)).toBe(true);
  });
});
