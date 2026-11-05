import { describe, expect, it } from "vitest";
import { portfolioProjects, projectBySlug, characterScenes, canonicalProjectSlug, legacyProjectSlugs, projectCategories } from "@/lib/portfolio";

describe("public portfolio data", () => {
  it("uses unique, routable slugs and a chronological sequence with real date precision", () => {
    expect(portfolioProjects).toHaveLength(4);
    expect(new Set(portfolioProjects.map((project) => project.slug)).size).toBe(portfolioProjects.length);
    const dates = portfolioProjects.map((project) => project.date);
    expect(dates).toEqual([...dates].sort());
    for (const project of portfolioProjects) {
      expect(project.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(project.date).toMatch(/^20\d{2}-(0[1-9]|1[0-2])(?:-\d{2})?$/);
      expect(projectBySlug(project.slug)).toBe(project);
      expect(characterScenes[project.scene]).toBeDefined();
      expect(project.contributions.length).toBeGreaterThan(0);
      expect(project.outcome.length).toBeGreaterThan(0);
      expect(project.context.length).toBeGreaterThan(0);
      expect(project.phases.length).toBeGreaterThan(0);
      expect(project.scope.length).toBeGreaterThan(0);
      for (const phase of project.phases) {
        expect(phase.period).toMatch(/^20\d{2}-(0[1-9]|1[0-2])/);
        expect(phase.title.length).toBeGreaterThan(0);
        expect(phase.summary.length).toBeGreaterThan(0);
      }
    }
    expect(projectBySlug("does-not-exist")).toBeUndefined();
  });

  it("resolves every retired detail slug to one canonical project without duplicate entries", () => {
    expect(Object.keys(legacyProjectSlugs)).toHaveLength(5);
    const canonical = new Set(portfolioProjects.map((project) => project.slug));
    for (const [alias, slug] of Object.entries(legacyProjectSlugs)) {
      expect(canonical.has(alias)).toBe(false);
      expect(canonical.has(slug)).toBe(true);
      expect(canonicalProjectSlug(alias)).toBe(slug);
      expect(projectBySlug(alias)).toBe(projectBySlug(slug));
    }
    expect(canonicalProjectSlug("document-quality")).toBe("document-quality");
    expect(canonicalProjectSlug("constructor")).toBe("constructor");
    for (const category of projectCategories.filter((item) => item.id !== "all")) {
      expect(portfolioProjects.some((project) => project.category === category.id)).toBe(true);
    }
  });

  it("keeps distinct activity phases and qualified delivery claims after grouping", () => {
    const delivery = projectBySlug("delivery-standards")!;
    expect(delivery.phases.map((phase) => phase.period)).toEqual(["2025-12—2026-01", "2026-10"]);
    const video = projectBySlug("pedestrian-events")!;
    expect(video.contributions).toHaveLength(3);
    expect(video.phases.map((phase) => phase.period)).toEqual(["2026-06", "2026-09", "2026-10"]);
    expect(projectBySlug("resume-parser")!.scope).toContain("尚未核验原始上线记录");
    expect(projectBySlug("document-quality")!.status).toContain("部署验收待确认");
  });

  it("excludes credentials, internal addresses, raw-source metadata and other staff identities", () => {
    const text = JSON.stringify(portfolioProjects);
    expect(text).not.toMatch(/JSESSIONID|cookie|password|access_token|ssologinid|ticket=/i);
    expect(text).not.toMatch(/eip\.teamshub|gitlab|https?:\/\/|\b10\.\d+\.\d+\.\d+\b|\b192\.168\.\d+\.\d+\b/i);
    expect(text).not.toMatch(/source_ids|author_id|evidence|raw_html|source_url/);
  });
});
