import { describe, expect, it } from "vitest";
import { portfolioProjects, projectBySlug, characterScenes } from "@/lib/portfolio";

describe("public portfolio data", () => {
  it("uses unique, routable slugs and a chronological sequence with real date precision", () => {
    expect(portfolioProjects.length).toBeGreaterThan(0);
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
    }
    expect(projectBySlug("does-not-exist")).toBeUndefined();
  });

  it("excludes credentials, internal addresses, raw-source metadata and other staff identities", () => {
    const text = JSON.stringify(portfolioProjects);
    expect(text).not.toMatch(/JSESSIONID|cookie|password|access_token|ssologinid|ticket=/i);
    expect(text).not.toMatch(/eip\.teamshub|gitlab|https?:\/\/|\b10\.\d+\.\d+\.\d+\b|\b192\.168\.\d+\.\d+\b/i);
    expect(text).not.toMatch(/source_ids|author_id|evidence|raw_html|source_url/);
  });
});
