import { describe, expect, it } from "vitest";
import abcjs from "abcjs";
import fs from "node:fs";
import path from "node:path";
import { guitarCapoChords, midiToAbc, pianoArrangement } from "../../../lib/light-music/notation";

type Element = {
  el_type: string;
  duration?: number;
  startTriplet?: number;
  tripletMultiplier?: number;
  endTriplet?: boolean;
  type?: string;
  startEnding?: string;
};
function durations(tune: ReturnType<typeof abcjs.parseOnly>[number], staff: number) {
  const measures: number[] = [];
  let sum = 0,
    ratio = 1;
  for (const line of tune.lines ?? [])
    for (const el of (line.staff?.[staff]?.voices?.[0] ?? []) as Element[]) {
      if (el.el_type === "note") {
        if (el.startTriplet) ratio = el.tripletMultiplier ?? 1;
        sum += (el.duration ?? 0) * ratio;
        if (el.endTriplet) ratio = 1;
      } else if (el.el_type === "bar" && sum) {
        measures.push(sum);
        sum = 0;
      }
    }
  if (sum) measures.push(sum);
  return measures;
}
const parse = abcjs.parseOnly;

describe("Light 完整音符谱", () => {
  it("所有已校对歌曲保留完整旋律，并逐小节生成等长的左手声部", () => {
    for (const name of fs.readdirSync(path.resolve("public/music/scores"))) {
      const score = JSON.parse(fs.readFileSync(path.resolve("public/music/scores", name), "utf8"));
      const original = parse(score.abc)[0];
      const arranged = parse(pianoArrangement(score.abc, score.key, parse));
      expect(arranged.length, score.title).toBe(1);
      expect(arranged[0].warnings, score.title).toBeUndefined();
      const melody = durations(original, 0);
      expect(melody.length, score.title).toBeGreaterThan(12);
      expect(durations(arranged[0], 0), score.title).toEqual(melody);
      const bass = durations(arranged[0], 1);
      expect(bass.length, score.title).toBe(melody.length);
      bass.forEach((n, i) => expect(n, `${score.title} 第${i + 1}小节`).toBeCloseTo(melody[i], 6));
    }
  });
  it("弱起、附点、三连音及一二房结尾不会改变左右手拍数", () => {
    const abc =
      'X:1\nM:4/4\nL:1/8\nK:C\nG |: "C/E"(3CDE F2 G2 A2 | "F"A3/2B/ c2 d2 e2 |[1 "G7"G8 :|[2 "C"C6 z |]';
    const arranged = parse(pianoArrangement(abc, "C", parse))[0];
    expect(arranged.warnings).toBeUndefined();
    durations(arranged, 1).forEach((n, i) => expect(n).toBeCloseTo(durations(arranged, 0)[i], 6));
    expect(pianoArrangement(abc, "C", parse)).toContain("|[1");
    expect(pianoArrangement(abc, "C", parse)).toContain(":|[2");
    expect(pianoArrangement(abc, "C", parse)).toContain("=E,,");
  });
  it("变调夹只换算和弦指法，保留实际旋律音高及歌词", () => {
    const abc = 'X:1\nM:4/4\nK:C\n"C/E"C2 "Am7"D2 |\nw:一 起\n';
    expect(guitarCapoChords(abc, 2)).toContain('"A#/D"C2 "Gm7"D2');
    expect(guitarCapoChords(abc, 2)).toContain("w:一 起");
    expect(midiToAbc(60)).toBe("=C");
    expect(midiToAbc(36)).toBe("=C,,");
    expect(midiToAbc(68)).toBe("^G");
    expect(midiToAbc(68, true)).toBe("_A");
  });
});
