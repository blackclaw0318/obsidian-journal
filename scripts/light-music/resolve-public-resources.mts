import fs from "node:fs/promises";
const normalizeSongTitle = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/祢/g, "你")
    .replace(/[\s·・！!，,。.:：;；'"“”‘’、?？《》〈〉]/g, "");

// Uses only the normal, unauthenticated search form and media URLs printed by it.
// No cookies, private APIs, full audio downloads or retrying access restrictions.
const songs = JSON.parse(await fs.readFile("lib/light-music/songs.json", "utf8"));
const output = process.argv[2] ?? "/tmp/light-public-research.json";
const results: Record<string, unknown> = {};
const blocked = new Set<string>();
const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
for (const song of songs.filter((s: { audio?: unknown }) => !s.audio)) {
  const searchUrl = `https://www.cbann.com/?type=song&s=${encodeURIComponent(song.title)}`;
  try {
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(20000) });
    if ([401, 403, 429].includes(response.status)) {
      results[song.title] = { blocked: response.status, searchUrl };
      await fs.writeFile(output, JSON.stringify(results, null, 2));
      console.log("Stopped on search access restriction", response.status);
      break;
    }
    const html = await response.text();
    const candidates = [...html.matchAll(/<button\b[^>]*data-src="[^"]+"[^>]*>/g)]
      .map(([tag]) => {
        const attrs = Object.fromEntries(
          [...tag.matchAll(/(data-[\w-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])])
        );
        return {
          title: attrs["data-title"] ?? "",
          artist: attrs["data-artist"] ?? "",
          url: attrs["data-src"],
          id: attrs["data-post"]
        };
      })
      .filter(
        (c) =>
          normalizeSongTitle(c.title.replace(/\s*\/\s*Living Hope/i, "")) === normalizeSongTitle(song.title)
      );
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
      url: decode(m[1]),
      title: decode(m[2].replace(/<[^>]*>/g, "").trim())
    }));
    const checked = [];
    for (const candidate of candidates.slice(0, 5)) {
      const sourceUrl =
        links.find((link) => normalizeSongTitle(link.title) === normalizeSongTitle(candidate.title))?.url ??
        searchUrl;
      const host = new URL(candidate.url).host;
      if (blocked.has(host)) {
        checked.push({ ...candidate, sourceUrl, valid: false, restrictedHost: true });
        continue;
      }
      try {
        const audio = await fetch(candidate.url, {
          headers: { Range: "bytes=0-1023" },
          signal: AbortSignal.timeout(12000)
        });
        if ([401, 403, 429].includes(audio.status)) blocked.add(host);
        const reader = audio.body?.getReader();
        const first = await reader?.read();
        await reader?.cancel();
        const bytes = first?.value;
        const id3 = bytes?.[0] === 0x49 && bytes?.[1] === 0x44 && bytes?.[2] === 0x33;
        const frame =
          bytes && [...bytes.slice(0, 1023)].some((b, i) => b === 255 && ((bytes[i + 1] ?? 0) & 224) === 224);
        checked.push({
          ...candidate,
          sourceUrl,
          valid:
            Number(
              audio.headers.get("content-range")?.match(/\/(\d+)$/)?.[1] ??
                audio.headers.get("content-length")
            ) >= 131072 &&
            audio.ok &&
            Boolean(id3 || frame) &&
            !audio.headers.get("content-type")?.includes("text/html"),
          status: audio.status,
          type: audio.headers.get("content-type"),
          range: audio.headers.get("content-range")
        });
      } catch (error) {
        checked.push({ ...candidate, sourceUrl, valid: false, error: String(error) });
      }
    }
    results[song.title] = { searchUrl, candidates: checked };
    console.log(song.title, checked.length, "candidates", checked.filter((c) => c.valid).length, "valid");
  } catch (error) {
    results[song.title] = { searchUrl, error: String(error) };
    console.log(song.title, "unavailable");
  }
  await fs.writeFile(output, JSON.stringify(results, null, 2));
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
