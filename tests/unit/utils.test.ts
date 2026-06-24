import { describe, it, expect } from "vitest";
import { cn, slugify, truncate, formatCount, formatDate } from "@/lib/utils";

describe("cn()", () => {
  it("应该合并多个 class", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("应该处理 falsy 值", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("应该去重 Tailwind 冲突", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("slugify()", () => {
  it("应该转小写", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("中文应该保留", () => {
    expect(slugify("黑曜石")).toBe("黑曜石");
  });

  it("应该去除首尾连字符", () => {
    expect(slugify("---test---")).toBe("test");
  });
});

describe("truncate()", () => {
  it("不超过 max 不截断", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("超过 max 加省略号", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});

describe("formatCount()", () => {
  it("< 1000 直接返回", () => {
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("1k - 999k 转 k", () => {
    expect(formatCount(1000)).toBe("1.0k");
    expect(formatCount(1234)).toBe("1.2k");
    expect(formatCount(999_999)).toBe("1000.0k");
  });

  it(">= 1M 转 M", () => {
    expect(formatCount(1_000_000)).toBe("1.0M");
    expect(formatCount(1_500_000)).toBe("1.5M");
  });
});

describe("formatDate()", () => {
  it("应该格式化 Date 对象", () => {
    const date = new Date("2026-06-24T00:00:00Z");
    const result = formatDate(date);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/6/);
    expect(result).toMatch(/24/);
  });

  it("应该接受字符串", () => {
    const result = formatDate("2026-06-24T00:00:00Z");
    expect(result).toContain("2026");
  });
});