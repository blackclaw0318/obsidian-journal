// ============================================================
// markdown-reveal.test.tsx - MarkdownReveal 组件单元测试 (v0.21 P1-8)
// 测: SSR HTML 透传 + useEffect 给 block 加 initial opacity 0
//     + mock IntersectionObserver 触发后渐入 + 卸载清理
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import React from "react";
import { MarkdownReveal } from "@/components/MarkdownReveal";

// ---- IntersectionObserver mock ----
type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

interface MockIOInstance {
  callback: IOCallback;
  options: IntersectionObserverInit | undefined;
  observed: Set<Element>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
}

let ioInstances: MockIOInstance[] = [];

class MockIntersectionObserver {
  callback: IOCallback;
  options: IntersectionObserverInit | undefined;
  observed: Set<Element>;
  _unobserve = vi.fn();
  _disconnect = vi.fn();
  private self: MockIOInstance;

  constructor(cb: IOCallback, opts?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = opts;
    this.observed = new Set();
    this.self = {
      callback: cb,
      options: opts,
      observed: this.observed,
      unobserve: this._unobserve,
      disconnect: this._disconnect,
      trigger: (entries) => cb(entries)
    };
    ioInstances.push(this.self);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
    this._unobserve(el);
  }
  disconnect() {
    this.observed.clear();
    this._disconnect();
  }
  /** 测试辅助: 手动触发一批 entries */
  trigger(entries: Array<{ isIntersecting: boolean; target: Element }>) {
    this.callback(entries);
  }
}

beforeEach(() => {
  ioInstances = [];
  // @ts-expect-error - mock 替换
  globalThis.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MarkdownReveal 基础渲染", () => {
  it("SSR HTML 完整透传到容器", () => {
    const html = "<p>第一段</p><h2>标题</h2><ul><li>列表项</li></ul>";
    const { container } = render(<MarkdownReveal html={html} />);
    const wrapper = container.firstChild as HTMLDivElement;
    // useEffect 注入了 initial opacity/transform style, 所以 outerHTML 会含 inline style,
    // 这里只验证 innerHTML 包含正文文本 (验证 SSR HTML 透传了)
    expect(wrapper.innerHTML).toContain("第一段");
    expect(wrapper.innerHTML).toContain("标题");
    expect(wrapper.innerHTML).toContain("列表项");
    // 结构验证: 3 个 block 元素都在
    expect(wrapper.querySelectorAll("p")).toHaveLength(1);
    expect(wrapper.querySelectorAll("h2")).toHaveLength(1);
    expect(wrapper.querySelectorAll("ul")).toHaveLength(1);
  });

  it("透传 className 到外层", () => {
    const { container } = render(
      <MarkdownReveal html="<p>x</p>" className="prose dark:prose-invert" />
    );
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toContain("prose");
    expect(wrapper.className).toContain("dark:prose-invert");
  });

  it("空 HTML 也能渲染 (无 block)", () => {
    const { container } = render(<MarkdownReveal html="" />);
    expect(container.firstChild).toBeTruthy();
    expect(ioInstances).toHaveLength(0); // 无 block 时不挂 Observer
  });

  it("非 block 标签 (div/span) 时不创建 Observer", () => {
    const html = "<div><span>hello</span></div>";
    render(<MarkdownReveal html={html} />);
    // querySelectorAll 返回空 → 直接 return → 不创建 IO
    expect(ioInstances).toHaveLength(0);
  });
});

describe("MarkdownReveal 入场动画", () => {
  it("mount 后给所有 block 加 opacity:0 + transform translateY", async () => {
    const html = "<p>A</p><h2>B</h2><ul><li>C</li></ul>";
    const { container } = render(<MarkdownReveal html={html} y={12} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const p = container.querySelector("p") as HTMLElement;
    const h2 = container.querySelector("h2") as HTMLElement;
    const ul = container.querySelector("ul") as HTMLElement;

    expect(p.style.opacity).toBe("0");
    expect(p.style.transform).toBe("translateY(12px)");
    expect(h2.style.opacity).toBe("0");
    expect(ul.style.opacity).toBe("0");
    // li 是 ul 的子元素,跟随 ul 渐入,本身不被 RevealOnScroll 直接控制
    expect(container.querySelector("li")!.style.opacity).toBe("");
  });

  it("IntersectionObserver threshold = 0.05 + rootMargin -10% bottom", () => {
    render(<MarkdownReveal html="<p>x</p>" />);
    expect(ioInstances[0].options).toEqual({
      threshold: 0.05,
      rootMargin: "0px 0px -10% 0px"
    });
  });

  it("触发 isIntersecting=true 后 block opacity 变 1, transform 归零", async () => {
    const html = "<p>A</p><h2>B</h2>";
    const { container } = render(<MarkdownReveal html={html} duration={0.3} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const p = container.querySelector("p") as HTMLElement;
    const h2 = container.querySelector("h2") as HTMLElement;

    expect(p.style.opacity).toBe("0");

    // 模拟进入视口
    await act(async () => {
      ioInstances[0].trigger([
        { isIntersecting: true, target: p },
        { isIntersecting: true, target: h2 }
      ]);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(p.style.opacity).toBe("1");
    expect(p.style.transform).toBe("translateY(0)");
    expect(p.style.transition).toContain("opacity 0.3s");
    expect(p.style.transition).toMatch(/transform 0\.3s/);

    expect(h2.style.opacity).toBe("1");
  });

  it("不进入视口的 block 不变", async () => {
    const html = "<p>A</p><p>B</p>";
    const { container } = render(<MarkdownReveal html={html} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const all = container.querySelectorAll("p");
    const pA = all[0] as HTMLElement;
    const pB = all[1] as HTMLElement;

    // 只 A 进入视口
    await act(async () => {
      ioInstances[0].trigger([{ isIntersecting: true, target: pA }]);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(pA.style.opacity).toBe("1");
    expect(pB.style.opacity).toBe("0");
  });

  it("stagger: 第 N 个进入视口的 block 延迟 N * staggerStep (max 5x)", async () => {
    const html = "<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p><p>G</p>";
    const { container } = render(
      <MarkdownReveal html={html} duration={0.5} staggerStep={0.04} />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const ps = Array.from(container.querySelectorAll("p")) as HTMLElement[];

    // 全部进入视口
    await act(async () => {
      ioInstances[0].trigger(ps.map((t) => ({ isIntersecting: true, target: t })));
      await new Promise((r) => setTimeout(r, 0));
    });

    // 提取每条 transition 的 delay
    function getDelaySec(transition: string): number {
      const m = transition.match(/(\d+(?:\.\d+)?)s\s*$/);
      return m ? parseFloat(m[1]) : 0;
    }

    const delays = ps.map((p) => getDelaySec(p.style.transition));
    // 0, 0.04, 0.08, 0.12, 0.16, 0.20 (封顶), 0.20 (封顶)
    expect(delays[0]).toBeCloseTo(0, 5);
    expect(delays[1]).toBeCloseTo(0.04, 5);
    expect(delays[2]).toBeCloseTo(0.08, 5);
    expect(delays[4]).toBeCloseTo(0.16, 5);
    // 第 6/7 个封顶 0.20
    expect(delays[5]).toBeCloseTo(0.2, 5);
    expect(delays[6]).toBeCloseTo(0.2, 5);
  });

  it("unobserve 已揭示的 block (避免重复触发)", async () => {
    const html = "<p>A</p>";
    const { container } = render(<MarkdownReveal html={html} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const p = container.querySelector("p") as HTMLElement;
    await act(async () => {
      ioInstances[0].trigger([{ isIntersecting: true, target: p }]);
      await new Promise((r) => setTimeout(r, 0));
    });

    // 调用过 unobserve
    expect(ioInstances[0].unobserve).toHaveBeenCalledWith(p);
  });
});

describe("MarkdownReveal 卸载清理", () => {
  it("unmount 后清掉 inline style", async () => {
    const html = "<p>A</p>";
    const { container, unmount } = render(<MarkdownReveal html={html} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const p = container.querySelector("p") as HTMLElement;
    expect(p.style.opacity).toBe("0");

    unmount();

    // 清理后 inline style 应该为空
    expect(p.style.opacity).toBe("");
    expect(p.style.transform).toBe("");
    expect(p.style.transition).toBe("");
    expect(p.style.willChange).toBe("");
  });

  it("unmount 后 disconnect Observer", async () => {
    const html = "<p>A</p>";
    const { unmount } = render(<MarkdownReveal html={html} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    unmount();
    expect(ioInstances[0].disconnect).toHaveBeenCalled();
  });
});

describe("MarkdownReveal 边界", () => {
  it("支持自定义 y", async () => {
    const html = "<p>A</p>";
    const { container } = render(<MarkdownReveal html={html} y={24} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const p = container.querySelector("p") as HTMLElement;
    expect(p.style.transform).toBe("translateY(24px)");
  });

  it("staggerStep=0 关闭 stagger (delay 一律 0)", async () => {
    const html = "<p>A</p><p>B</p><p>C</p>";
    const { container } = render(<MarkdownReveal html={html} staggerStep={0} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const ps = Array.from(container.querySelectorAll("p")) as HTMLElement[];
    await act(async () => {
      ioInstances[0].trigger(ps.map((t) => ({ isIntersecting: true, target: t })));
      await new Promise((r) => setTimeout(r, 0));
    });

    function getDelaySec(transition: string): number {
      const m = transition.match(/(\d+(?:\.\d+)?)s\s*$/);
      return m ? parseFloat(m[1]) : 0;
    }
    expect(getDelaySec(ps[0].style.transition)).toBe(0);
    expect(getDelaySec(ps[2].style.transition)).toBe(0);
  });

  it("3s fallback: 漏触发的 block 也强制显示", async () => {
    vi.useFakeTimers();
    const html = "<p>A</p><p>B</p>";
    const { container } = render(<MarkdownReveal html={html} duration={0.3} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // 不触发 IO, 直接跳到 3s 后
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const ps = container.querySelectorAll("p");
    expect((ps[0] as HTMLElement).style.opacity).toBe("1");
    expect((ps[1] as HTMLElement).style.opacity).toBe("1");
  });
});

describe("MarkdownReveal 11 种 block 选择器", () => {
  it.each([
    ["p"],
    ["h2"],
    ["h3"],
    ["h4"],
    ["ul"],
    ["ol"],
    ["blockquote"],
    ["pre"],
    ["img"],
    ["figure"],
    ["table"],
    ["hr"]
  ])("选择 <%s> 作为 block", async (tag) => {
    const html = `<${tag}>x</${tag}>`;
    const { container } = render(<MarkdownReveal html={html} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // 至少观察到了一个元素 (或观察集合有内容)
    // 注意: img/hr 等 void 元素,观察集合可能因为没匹配到而不增加
    // 我们只验证: IO 创建了 + 不报错
    expect(ioInstances).toHaveLength(1);
  });
});