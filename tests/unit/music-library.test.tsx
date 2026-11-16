import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MusicLibrary } from "../../components/MusicLibrary";
import type { MusicTrack } from "../../lib/music";

// Entirely synthetic fixtures; no requests to the music provider.
const tracks: MusicTrack[] = [
  { id: "qa-a", title: "测试曲目甲", artist: "测试作者", album: "测试专辑甲", coverUrl: "/qa/cover-a.svg", lyrics: "第一句测试文本\n\n第二段测试文本" },
  { id: "qa-b", title: "测试曲目乙", artist: "测试作者", album: "测试专辑乙", coverUrl: "/qa/cover-b.svg", lyrics: "另一首测试文本", lyricCredits: "测试署名" },
];
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const safeMedia = () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
};

describe("音乐封面与歌词", () => {
  it("选曲时同步更换主封面和歌词，列表使用每首作品自己的封面", () => {
    safeMedia();
    const { container } = render(<MusicLibrary tracks={tracks} />);
    expect(screen.getByAltText("测试专辑甲 专辑封面").getAttribute("src")).toBe("/qa/cover-a.svg");
    expect([...container.querySelectorAll(".music-track-art img")].map(img => img.getAttribute("src"))).toEqual(["/qa/cover-a.svg", "/qa/cover-b.svg"]);
    expect(container.querySelector(".music-lyrics-text")?.textContent).toBe(tracks[0].lyrics);
    fireEvent.click(screen.getByRole("button", { name: "选择 测试曲目乙" }));
    expect(screen.getByAltText("测试专辑乙 专辑封面").getAttribute("src")).toBe("/qa/cover-b.svg");
    expect(container.querySelector(".music-lyrics-text")?.textContent).toBe(tracks[1].lyrics);
    expect(container.querySelector(".music-lyrics")?.textContent).not.toContain("第一句测试文本");
    expect(screen.getByText("测试署名")).toBeTruthy();
  });
  it("主封面失败会回退，下一首有可用封面时可正常展示", () => {
    safeMedia();
    const { container } = render(<MusicLibrary tracks={tracks} />);
    fireEvent.error(screen.getByAltText("测试专辑甲 专辑封面"));
    expect(container.querySelector(".music-record img")).toBeNull();
    expect(container.querySelector(".music-vinyl")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "选择 测试曲目乙" }));
    expect(screen.getByAltText("测试专辑乙 专辑封面")).toBeTruthy();
    expect(container.querySelector(".music-vinyl")).toBeNull();
  });
  it("缺少原始素材时不伪造封面或歌词", () => {
    const { container } = render(<MusicLibrary tracks={[{ id: "qa-empty", title: "测试曲目", artist: "测试作者" }]} />);
    expect(container.querySelector(".music-record img")).toBeNull();
    expect(container.querySelector(".music-lyrics")).toBeNull();
  });
});
