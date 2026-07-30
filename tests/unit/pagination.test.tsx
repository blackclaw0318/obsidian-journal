// ============================================================
// Pagination 单测 (v0.42)
// 老板 2026-07-29 拍板: 简单数字按钮, URL ?type=image&page=N, 总数 ≤ 1 不渲染
// vitest + happy-dom: 没有 jest-dom, 用 .classList.contains() 替代 toHaveClass
// RTL 默认 globals cleanup 不触发, 显式 afterEach cleanup()
// ============================================================
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { Pagination } from "../../app/resources/_components/Pagination";

afterEach(() => cleanup());

function getDisabledHref(label: string): string | null {
  // RTL: <span> 不可点击, 用 aria-label 找
  const all = screen.getAllByLabelText(label);
  return all[0]?.getAttribute("href") ?? null;
}

describe("Pagination (公开端)", () => {
  it("总数 ≤ 1 不渲染", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} basePath="/resources?type=image" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("第 1 页: 首页/上一页 disabled span, 下一页/末页 是 Link", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={5} basePath="/resources?type=image" />
    );
    // 首页/上一页: 渲染 disabled <span>, 没有 href
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    // 下一页: Link, href 带 page=2
    expect(screen.getByLabelText("下一页").getAttribute("href")).toBe(
      "/resources?type=image&page=2"
    );
    expect(screen.getByLabelText("末页").getAttribute("href")).toBe(
      "/resources?type=image&page=5"
    );
    // 首页和上一页应该存在但不是 Link (即 getByLabelText 会返回 0 个 a)
    expect(screen.queryByRole("link", { name: "首页" })).toBeNull();
    expect(screen.queryByRole("link", { name: "上一页" })).toBeNull();
  });

  it("末页: 下一页/末页 是 disabled span, 上一页/首页 是 Link", () => {
    render(<Pagination currentPage={5} totalPages={5} basePath="/resources?type=image" />);
    expect(screen.queryByRole("link", { name: "下一页" })).toBeNull();
    expect(screen.queryByRole("link", { name: "末页" })).toBeNull();
    expect(screen.getByLabelText("上一页").getAttribute("href")).toBe(
      "/resources?type=image&page=4"
    );
    expect(screen.getByLabelText("首页").getAttribute("href")).toBe("/resources?type=image");
  });

  it("中间页: 显示 1 ... N-1 N N+1 ... total", () => {
    const { container } = render(
      <Pagination currentPage={5} totalPages={10} basePath="/resources?type=image" />
    );
    // 当前页是 active span (aria-current=page)
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe("5");
    // 数字 1, 4, 6, 10 都应该作为 Link 渲染
    expect(screen.getByRole("link", { name: "第 1 页" }).getAttribute("href")).toBe(
      "/resources?type=image"
    );
    expect(screen.getByRole("link", { name: "第 4 页" }).getAttribute("href")).toBe(
      "/resources?type=image&page=4"
    );
    expect(screen.getByRole("link", { name: "第 6 页" }).getAttribute("href")).toBe(
      "/resources?type=image&page=6"
    );
    expect(screen.getByRole("link", { name: "第 10 页" }).getAttribute("href")).toBe(
      "/resources?type=image&page=10"
    );
  });

  it("URL 拼接: basePath 原 query 保留", () => {
    render(<Pagination currentPage={2} totalPages={5} basePath="/resources?type=image" />);
    expect(screen.getByLabelText("下一页").getAttribute("href")).toBe(
      "/resources?type=image&page=3"
    );
  });

  it("URL 拼接: 第 1 页链接不带 page= 参数", () => {
    render(<Pagination currentPage={2} totalPages={5} basePath="/resources?type=image" />);
    expect(screen.getByLabelText("首页").getAttribute("href")).toBe("/resources?type=image");
  });

  it("preserveQuery: 额外保留 q= 参数", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        basePath="/resources?type=image"
        preserveQuery={{ q: "test" }}
      />
    );
    expect(screen.getByLabelText("首页").getAttribute("href")).toBe(
      "/resources?type=image&q=test"
    );
    expect(screen.getByLabelText("下一页").getAttribute("href")).toBe(
      "/resources?type=image&q=test&page=3"
    );
  });

  it("总数 ≤ 7 页不显示省略号", () => {
    const { container } = render(
      <Pagination currentPage={3} totalPages={6} basePath="/resources?type=image" />
    );
    // 1, 2, 4, 5, 6 是 Link; 3 是当前页 (active span)
    for (const i of [1, 2, 4, 5, 6]) {
      expect(screen.getByRole("link", { name: `第 ${i} 页` })).toBeTruthy();
    }
    // 当前页 3 渲染为 aria-current=page 的 span
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("3");
    expect(container.textContent).not.toContain("…");
  });
});