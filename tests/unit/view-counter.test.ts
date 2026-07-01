// ============================================================
// view-counter.test.ts - 防刷逻辑单元测试 (v0.21.1 P1-13)
// 走 vitest 模式, 与 utils.test.ts / blocks.test.ts 对齐
// ============================================================
import { describe, it, expect } from "vitest";
import { shouldCountView, viewCookieKey, VIEW_TTL_SEC } from "@/lib/view-counter";

const NOW = 1_700_000_000_000; // 固定 now, 避免 flaky

describe("viewCookieKey", () => {
  it("应该拼接 entity_type 和 slug", () => {
    expect(viewCookieKey("post", "hello-world")).toBe("oj_view_post_hello-world");
    expect(viewCookieKey("chapter", "ch-1")).toBe("oj_view_chapter_ch-1");
  });
});

describe("VIEW_TTL_SEC", () => {
  it("必须是 86400 (24h)", () => {
    expect(VIEW_TTL_SEC).toBe(86400);
  });
});

describe("shouldCountView (防刷核心)", () => {
  it("未见过 → true", () => {
    expect(shouldCountView(undefined, NOW)).toBe(true);
    expect(shouldCountView("", NOW)).toBe(true);
  });

  it("见过 1h 内 → false", () => {
    const ts = NOW - 60 * 60 * 1000;
    expect(shouldCountView(String(ts), NOW)).toBe(false);
  });

  it("见过 23h59m → false", () => {
    const ts = NOW - 23 * 60 * 60 * 1000 - 59 * 60 * 1000;
    expect(shouldCountView(String(ts), NOW)).toBe(false);
  });

  it("见过超过 24h → true (刷新)", () => {
    const ts = NOW - 25 * 60 * 60 * 1000;
    expect(shouldCountView(String(ts), NOW)).toBe(true);
  });

  it("cookie 值非法 → true (重置)", () => {
    expect(shouldCountView("garbage", NOW)).toBe(true);
    expect(shouldCountView("NaN", NOW)).toBe(true);
    expect(shouldCountView("Infinity", NOW)).toBe(true);
  });

  it("边界 (正好 24h) → false (等于 TTL 不算过期)", () => {
    const ts = NOW - VIEW_TTL_SEC * 1000;
    expect(shouldCountView(String(ts), NOW)).toBe(false);
  });

  it("边界 (24h + 1ms) → true (超过 24h 即刷新)", () => {
    const ts = NOW - VIEW_TTL_SEC * 1000 - 1;
    expect(shouldCountView(String(ts), NOW)).toBe(true);
  });
});
