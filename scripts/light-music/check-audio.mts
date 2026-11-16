import fs from "node:fs/promises";
import validation from "../../lib/light-music/audio-validation";
const { inspectMp3Header } = validation;
const input = process.argv[2] ?? ".local/light-music/sources/audio-candidates.json";
const candidates = JSON.parse(await fs.readFile(input, "utf8"));
const report: Record<string, unknown> = {};
for (const [title, audio] of Object.entries(candidates) as [string, { url: string }][]) {
  try {
    const response = await fetch(audio.url, {
      headers: { Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(15000)
    });
    const type = response.headers.get("content-type");
    const reader = response.body?.getReader();
    const chunk = await reader?.read();
    await reader?.cancel();
    const inspection = inspectMp3Header(chunk?.value ?? new Uint8Array(), {
      status: response.status,
      contentType: type,
      contentRange: response.headers.get("content-range"),
      contentLength: response.headers.get("content-length")
    });
    report[title] = {
      status: response.status,
      type,
      ...inspection,
      range: response.headers.get("content-range"),
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    report[title] = { valid: false, error: String(error) };
  }
  console.log(title, JSON.stringify(report[title]));
  await fs.writeFile(input.replace(/\.json$/, "-report.json"), JSON.stringify(report, null, 2));
}
