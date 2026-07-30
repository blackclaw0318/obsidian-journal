// ============================================================
// ResourceList 单测 (v0.42)
// 老板 2026-07-29 拍板: 列表行, icon + filename + alt/mime + size + date + 操作
// - audio: 点行就地展开 <audio controls>, 单开 (useState activeId)
// - document: 点文件名打开 modal
// RTL 默认 globals cleanup 不触发, 显式 afterEach cleanup()
// ============================================================
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { ResourceList } from "../../app/resources/_components/ResourceList";
import type { MediaItem } from "@/lib/types";

// 屏蔽 audio autoplay (happy-dom 不支持)
beforeAll(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => cleanup());

function makeItem(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: over.id ?? "med_1",
    filename: over.filename ?? "test.mp3",
    mime_type: over.mime_type ?? "audio/mpeg",
    size: over.size ?? 1024,
    width: null,
    height: null,
    alt: over.alt ?? null,
    url: over.url ?? "/uploads/test.mp3",
    storage_type: "local",
    category: over.category ?? "audio",
    is_paid: false,
    uploaded_at: over.uploaded_at ?? 1700000000
  };
}

describe("ResourceList (公开端, audio/document)", () => {
  it("audio: 渲染行 + 试听按钮 + 下载按钮", () => {
    render(<ResourceList items={[makeItem({ id: "a1" })]} category="audio" />);
    expect(screen.getByTestId("resources-list-audio")).toBeTruthy();
    expect(screen.getByTestId("resource-list-row")).toBeTruthy();
    // 单 item: 应该只有 1 个 audio-toggle / download
    expect(screen.getAllByTestId("resource-audio-toggle")).toHaveLength(1);
    expect(screen.getAllByTestId("resource-download")).toHaveLength(1);
    expect(screen.getByTestId("resource-download").getAttribute("href")).toBe(
      "/api/resources/a1/download"
    );
    // audio 元素初始不渲染 (收起状态)
    expect(screen.queryByTestId("resource-audio-player")).toBeNull();
  });

  it("audio: 点行展开 audio, 再点收起", () => {
    render(<ResourceList items={[makeItem({ id: "a1" })]} category="audio" />);
    const toggle = screen.getByTestId("resource-audio-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("resource-audio-player")).toBeTruthy();
    expect(screen.getByTestId("resource-audio-element").getAttribute("src")).toBe(
      "/uploads/test.mp3"
    );
    // 再点收起
    fireEvent.click(toggle);
    expect(screen.queryByTestId("resource-audio-player")).toBeNull();
  });

  it("audio: 2 行时点第二行收起第一行 (useState 单开)", () => {
    render(
      <ResourceList
        items={[
          makeItem({ id: "a1" }),
          makeItem({ id: "a2", filename: "b.mp3", url: "/uploads/b.mp3" })
        ]}
        category="audio"
      />
    );
    const toggles = screen.getAllByTestId("resource-audio-toggle");
    fireEvent.click(toggles[0]);
    expect(screen.getAllByTestId("resource-audio-player")).toHaveLength(1);
    fireEvent.click(toggles[1]);
    // 第二行展开, 第一行收起 (useState 单开)
    const players = screen.queryAllByTestId("resource-audio-player");
    expect(players).toHaveLength(1);
    expect((screen.getByTestId("resource-audio-element") as HTMLAudioElement).src).toContain(
      "/uploads/b.mp3"
    );
  });

  it("document: 渲染文件名 + alt + 下载 + 预览按钮", () => {
    render(
      <ResourceList
        items={[
          makeItem({
            id: "d1",
            filename: "report.pdf",
            mime_type: "application/pdf",
            category: "document",
            alt: "月报"
          })
        ]}
        category="document"
      />
    );
    expect(screen.getByTestId("resources-list-document")).toBeTruthy();
    expect(screen.getByTestId("resource-doc-open").textContent).toContain("月报");
    expect(screen.getByTestId("resource-download").getAttribute("href")).toBe(
      "/api/resources/d1/download"
    );
    // document 没有 audio-toggle, 没有 audio-player
    expect(screen.queryByTestId("resource-audio-toggle")).toBeNull();
    expect(screen.queryByTestId("resource-audio-player")).toBeNull();
  });

  it("document: 点文件名触发 modal (不应展开 audio)", () => {
    render(
      <ResourceList
        items={[
          makeItem({
            id: "d1",
            filename: "report.pdf",
            mime_type: "application/pdf",
            category: "document"
          })
        ]}
        category="document"
      />
    );
    fireEvent.click(screen.getByTestId("resource-doc-open"));
    // 不应展开 audio
    expect(screen.queryByTestId("resource-audio-player")).toBeNull();
  });

  it("空列表渲染空状态", () => {
    render(<ResourceList items={[]} category="audio" />);
    expect(screen.getByText("该分类暂无文件")).toBeTruthy();
  });
});