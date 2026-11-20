import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompleteNotation } from "../../../components/light-music/CompleteNotation";
import { LightScore } from "../../../components/light-music/LightScore";
import { LightLibrary } from "../../../components/light-music/LightLibrary";
import { normalizeSongTitle, type LightSong } from "../../../lib/light-music/catalog";
import { lightSongs } from "../../../lib/light-music";
import { chordNotes, parseChordLine } from "../../../lib/light-music/theory";
const song: LightSong = {
  id: "qa",
  title: "谱例",
  artist: "测试",
  category: "感恩",
  categoryReason: "测试分类",
  originalKey: "G",
  sheets: [{ id: "source", instrument: "piano", label: "原谱", url: "about:blank", kind: "pdf" }],
  chart: { credit: "合成测试数据", sections: [{ label: "测试", lines: ["[G]甲 [D/F#]乙 [Em7]丙"] }] }
};
afterEach(cleanup);

describe("Light 曲谱交互", () => {
  it("曲库中的每个参考和弦都具有可显示的真实音高", () => {
    for (const song of lightSongs) {
      for (const section of song.chart?.sections ?? []) {
        for (const line of section.lines) {
          for (const part of parseChordLine(line)) {
            if (part.chord) expect(chordNotes(part.chord), `${song.title}: ${part.chord}`).not.toBeNull();
          }
        }
      }
    }
  });
  it("切换到钢琴时按演唱调显示和弦，吉他变调夹不污染钢琴音高", () => {
    const { container } = render(<LightScore song={song} />);
    fireEvent.click(screen.getByRole("button", { name: "吉他和弦" }));
    fireEvent.change(screen.getByLabelText("演唱调"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("变调夹"), { target: { value: "2" } });
    expect(container.querySelector(".light-chart strong")?.textContent).toBe("G");
    fireEvent.click(screen.getByRole("button", { name: "钢琴和弦参考" }));
    expect([...container.querySelectorAll(".light-chart strong")].map((e) => e.textContent)).toEqual([
      "A",
      "E/G#",
      "F#m7"
    ]);
    fireEvent.click(screen.getByRole("button", { name: "来源曲谱 1" }));
    expect(screen.getByRole("link", { name: "打开 PDF" }).getAttribute("href")).toBe("about:blank");
    expect(screen.getByTitle("谱例 · 原谱").getAttribute("src")).toBe("about:blank");
    expect(screen.queryByLabelText("演唱调")).toBeNull();
  });
  it("完整吉他伴奏能渲染六线谱，并在改变调性时重新排版", async () => {
    const score = {
      title: "谱例",
      key: "G",
      abc: 'X:1\nT:谱例\nM:4/4\nL:1/8\nK:G\n"G"B8 | "D"A8 | "Em"G8 | "G"G8 |]',
      credit: "测试",
      reviewed: true
    };
    const bbox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 20, height: 12 })
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(score))));
    try {
      const { container, rerender } = render(
        <CompleteNotation id="qa" instrument="guitar" transpose={0} capo={0} fontSize={18} />
      );
      await waitFor(() => expect(container.querySelector("svg")?.textContent).toContain("吉他六线谱"));
      const original = container.querySelector("svg");
      rerender(<CompleteNotation id="qa" instrument="guitar" transpose={-2} capo={3} fontSize={18} />);
      await waitFor(() => {
        const transposed = container.querySelector("svg");
        expect(transposed).not.toBe(original);
        expect(transposed?.textContent).toContain("吉他六线谱");
      });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      if (bbox) Object.defineProperty(SVGElement.prototype, "getBBox", bbox);
      else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
    }
  });
  it("仅有站外谱源时直接显示站内和弦参考", () => {
    render(
      <LightScore
        song={{
          ...song,
          searchUrl: "https://yopu.co/explore",
          sheets: [
            {
              id: "yopu",
              instrument: "guitar",
              label: "有谱么",
              url: "https://yopu.co/view/9PxLmqvP",
              kind: "page",
              format: "和弦谱"
            }
          ]
        }}
      />
    );
    expect(screen.getByRole("button", { name: "吉他和弦" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("甲")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /有谱么/ })).toBeNull();
  });
  it("分类和标题搜索共同过滤，清空后恢复列表", () => {
    render(<LightLibrary songs={[song, { ...song, id: "qb", title: "祷告谱例", category: "祷告祈求" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "感恩 1" }));
    expect(screen.getByRole("button", { name: "查看 谱例" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "查看 祷告谱例" })).toBeNull();
    fireEvent.change(screen.getByLabelText("搜索赞美诗"), { target: { value: "不存在" } });
    expect(screen.getByText("还没找到这首歌")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "查看全部歌曲" }));
    expect(screen.getByRole("button", { name: "查看 祷告谱例" })).toBeTruthy();
  });
  it("真实曲库不重复歌名，引用均为公开HTTPS来源，残缺谱不混入主题类别", () => {
    const names = lightSongs.map((song) => normalizeSongTitle(song.title));
    expect(new Set(names).size).toBe(names.length);
    for (const song of lightSongs) {
      for (const url of [
        song.audio?.url,
        song.audio?.sourceUrl,
        song.listeningUrl,
        song.searchUrl,
        ...song.sheets.map((s) => s.url)
      ].filter(Boolean)) {
        expect(url?.startsWith("https://"), `${song.title}: ${url}`).toBe(true);
        expect(url).not.toContain("/Users/");
      }
      if (song.incomplete) expect(song.category).toBe("其他");
    }
  });
});
