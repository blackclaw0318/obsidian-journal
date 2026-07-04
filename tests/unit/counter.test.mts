// tests/unit/counter.test.mts — v0.34 Phase 4 + v0.35 (种子可控)
// 验证: genBaseValue 范围 + display 函数 + mime 检测 + v0.35 seed_enabled 开关 + view/dl 独立种子

import { describe, it, expect } from "vitest";
import {
  genBaseValue,
  genSeedDownload,
  displayView,
  displayDownload,
  realView,
  realDownload,
  viewSeed,
  downloadSeed,
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
    it("应为 1800 (30 分钟, 老板 22:20 反馈)", () => {
      expect(VIEW_DEDUPE_WINDOW_SEC).toBe(1800);
    });
  });

  // ============================================================
  // v0.35 Phase 4: 种子可控 (老板 2026-07-04 20:37 需求)
  // ============================================================

  describe("v0.35: seed_enabled 开关", () => {
    it("seed_enabled=1 → 显示 seed + real (默认行为)", () => {
      expect(displayView({ base_value: 100, view_count: 5, seed_enabled: 1 })).toBe(105);
      expect(displayDownload({ base_value: 100, download_count: 3, seed_enabled: 1 })).toBe(103);
    });

    it("seed_enabled=0 → 只显示 real (老板关闭装饰场景)", () => {
      expect(displayView({ base_value: 999, view_count: 5, seed_enabled: 0 })).toBe(5);
      expect(displayDownload({ base_value: 999, download_count: 3, seed_enabled: 0 })).toBe(3);
    });

    it("seed_enabled 未定义 → 默认 1 (不破坏 v0.34 逻辑)", () => {
      expect(displayView({ base_value: 200, view_count: 5 })).toBe(205);
      expect(displayDownload({ base_value: 200, download_count: 3 })).toBe(203);
    });
  });

  describe("v0.35: view/download 独立种子", () => {
    it("view seed=base_value, download seed=seed_download_count", () => {
      const c = {
        base_value: 100,
        seed_download_count: 50,
        view_count: 10,
        download_count: 3,
        seed_enabled: 1,
      };
      expect(displayView(c)).toBe(110);  // 100 + 10
      expect(displayDownload(c)).toBe(53);  // 50 + 3
    });

    it("seed_download_count 缺省 → 兑底 base_value (老数据兼容)", () => {
      const c = { base_value: 200, view_count: 0, download_count: 5 };
      expect(displayDownload(c)).toBe(205);
    });

    it("view/dl 种子独立可调 (老板装门面场景: view 500, download 50)", () => {
      const c = {
        base_value: 500,        // view seed 顶高
        seed_download_count: 50, // download seed 低调
        view_count: 100,
        download_count: 2,
        seed_enabled: 1,
      };
      expect(displayView(c)).toBe(600);   // 500+100
      expect(displayDownload(c)).toBe(52); // 50+2
    });
  });

  describe("v0.35: realView / realDownload (不含种子)", () => {
    it("返回原始真实数", () => {
      expect(realView({ view_count: 123 })).toBe(123);
      expect(realDownload({ download_count: 45 })).toBe(45);
    });
  });

  describe("v0.35: viewSeed / downloadSeed (只返回种子值)", () => {
    it("seed_enabled=1 返回对应种子", () => {
      expect(viewSeed({ base_value: 500, seed_enabled: 1 })).toBe(500);
      expect(downloadSeed({ base_value: 500, seed_enabled: 1, seed_download_count: 50 })).toBe(50);
    });

    it("seed_enabled=0 返回 0 (不装门面)", () => {
      expect(viewSeed({ base_value: 500, seed_enabled: 0 })).toBe(0);
      expect(downloadSeed({ base_value: 500, seed_enabled: 0, seed_download_count: 50 })).toBe(0);
    });

    it("downloadSeed 缺省 seed_download_count → 兑底 base_value", () => {
      expect(downloadSeed({ base_value: 300, seed_enabled: 1 })).toBe(300);
    });
  });

  describe("v0.35: genSeedDownload", () => {
    it("默认 base_value 输入应返回 ≥ 50", () => {
      expect(genSeedDownload(100)).toBeGreaterThanOrEqual(50);
    });

    it("base_value=200 → seed_download 100 (50% of base)", () => {
      expect(genSeedDownload(200)).toBe(100);
    });

    it("base_value=300 → seed_download 150", () => {
      expect(genSeedDownload(300)).toBe(150);
    });

    it("默认参数 (100) → 应返回 ≥ 50", () => {
      const v = genSeedDownload();
      expect(v).toBeGreaterThanOrEqual(50);
    });
  });
});