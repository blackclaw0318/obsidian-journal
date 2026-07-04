// tests/unit/counter.test.mts — v0.34 Phase 4
// 验证: genBaseValue 范围 + display 函数 + mime 检测 (image/document/audio)

import { describe, it, expect } from "vitest";
import {
  genBaseValue,
  displayView,
  displayDownload,
  isAllowedResourceMime,
  categoryFromMime,
  VIEW_DEDUPE_WINDOW_SEC
} from "@/lib/counter";

describe("counter.ts (v0.34 Phase 4)", () => {
  describe("genBaseValue", () => {
    it("100 次采样应全部 ∈ [100, 999]", () => {
      const samples = Array.from({ length: 100 }, () => genBaseValue());
      for (const v of samples) {
        expect(v).toBeGreaterThanOrEqual(100);
        expect(v).toBeLessThanOrEqual(999);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it("100 次采样应有合理多样性 (不全相同)", () => {
      const samples = Array.from({ length: 100 }, () => genBaseValue());
      const unique = new Set(samples);
      // 期望多样性 > 50% (100 个随机整数基本不会撞)
      expect(unique.size).toBeGreaterThan(50);
    });

    it("单次调用应返回整数", () => {
      const v = genBaseValue();
      expect(Number.isInteger(v)).toBe(true);
    });
  });

  describe("displayView", () => {
    it("base=100 view=0 → 显示 100", () => {
      expect(displayView({ base_value: 100, view_count: 0 })).toBe(100);
    });
    it("base=500 view=23 → 显示 523", () => {
      expect(displayView({ base_value: 500, view_count: 23 })).toBe(523);
    });
    it("base=999 view=10000 → 显示 10999 (无上限)", () => {
      expect(displayView({ base_value: 999, view_count: 10000 })).toBe(10999);
    });
    it("不应做区间化 (始终返回精确整数)", () => {
      const v = displayView({ base_value: 123, view_count: 4567 });
      expect(v).toBe(4690);
      expect(typeof v).toBe("number");
    });
  });

  describe("displayDownload", () => {
    it("base=200 download=0 → 显示 200", () => {
      expect(displayDownload({ base_value: 200, download_count: 0 })).toBe(200);
    });
    it("base=300 download=45 → 显示 345", () => {
      expect(displayDownload({ base_value: 300, download_count: 45 })).toBe(345);
    });
    it("view 与 download 独立计数 (不串扰)", () => {
      const counter = { base_value: 500, view_count: 10, download_count: 3 };
      expect(displayView(counter)).toBe(510);
      expect(displayDownload(counter)).toBe(503);
    });
  });

  describe("isAllowedResourceMime (老板 15:14 砍 video 决策)", () => {
    it("image 类允许", () => {
      expect(isAllowedResourceMime("image/png")).toBe(true);
      expect(isAllowedResourceMime("image/jpeg")).toBe(true);
      expect(isAllowedResourceMime("image/webp")).toBe(true);
      expect(isAllowedResourceMime("image/gif")).toBe(true);
      expect(isAllowedResourceMime("image/svg+xml")).toBe(true);
    });
    it("audio 类允许", () => {
      expect(isAllowedResourceMime("audio/mpeg")).toBe(true);
      expect(isAllowedResourceMime("audio/wav")).toBe(true);
      expect(isAllowedResourceMime("audio/ogg")).toBe(true);
    });
    it("document 类允许 (application/pdf)", () => {
      expect(isAllowedResourceMime("application/pdf")).toBe(true);
    });
    it("video 类禁止 (老板决策)", () => {
      expect(isAllowedResourceMime("video/mp4")).toBe(false);
      expect(isAllowedResourceMime("video/webm")).toBe(false);
      expect(isAllowedResourceMime("video/quicktime")).toBe(false);
    });
    it("其他 application 类禁止 (非 PDF)", () => {
      // v0.34 仅放开 PDF, .doc/.docx/.zip 暂不放 (简化模型)
      expect(isAllowedResourceMime("application/zip")).toBe(false);
      expect(isAllowedResourceMime("application/msword")).toBe(false);
      expect(isAllowedResourceMime("application/octet-stream")).toBe(false);
    });
    it("text 类禁止", () => {
      expect(isAllowedResourceMime("text/plain")).toBe(false);
      expect(isAllowedResourceMime("text/html")).toBe(false);
    });
  });

  describe("categoryFromMime", () => {
    it("image/* → 'image'", () => {
      expect(categoryFromMime("image/png")).toBe("image");
      expect(categoryFromMime("image/jpeg")).toBe("image");
      expect(categoryFromMime("image/svg+xml")).toBe("image");
    });
    it("audio/* → 'audio'", () => {
      expect(categoryFromMime("audio/mpeg")).toBe("audio");
      expect(categoryFromMime("audio/wav")).toBe("audio");
    });
    it("application/pdf → 'document'", () => {
      expect(categoryFromMime("application/pdf")).toBe("document");
    });
    it("其他 application → 'document' (保守归类)", () => {
      expect(categoryFromMime("application/zip")).toBe("document");
      expect(categoryFromMime("application/octet-stream")).toBe("document");
    });
    it("text → 'document'", () => {
      expect(categoryFromMime("text/plain")).toBe("document");
    });
  });

  describe("VIEW_DEDUPE_WINDOW_SEC", () => {
    it("应为 86400 (24h)", () => {
      expect(VIEW_DEDUPE_WINDOW_SEC).toBe(86400);
    });
  });
});