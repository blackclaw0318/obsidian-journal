import { describe, expect, it } from "vitest";
import abcjs from "abcjs";
import fs from "node:fs";
import path from "node:path";
import { guitarArrangement, guitarCapoChords, midiToAbc, pianoArrangement } from "../../../lib/light-music/notation";
import scoreManifest from "../../../lib/light-music/score-manifest.json";

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
  it("所有已校对歌曲保留旋律，并逐小节生成等长的钢琴与吉他伴奏声部", () => {
    const directory = path.resolve("public/music/scores");
    expect(fs.readdirSync(directory).sort()).toEqual(
      Object.keys(scoreManifest).map((id) => `${id}.json`).sort()
    );
    for (const [id, entry] of Object.entries(scoreManifest)) {
      const score = JSON.parse(fs.readFileSync(path.join(directory, `${id}.json`), "utf8"));
      const original = parse(score.abc)[0];
      const melody = durations(original, 0);
      expect(melody.length, score.title).toBe(entry.measures);
      const arrangements = [
        { abc: pianoArrangement(score.abc, score.key, parse), melodyStaff: 0 },
        { abc: guitarArrangement(score.abc, score.key, parse, -2, 3), melodyStaff: 1 }
      ];
      for (const { abc, melodyStaff } of arrangements) {
        const arranged = parse(abc);
        expect(arranged.length, score.title).toBe(1);
        expect(arranged[0].warnings, score.title).toBeUndefined();
        expect(durations(arranged[0], melodyStaff), score.title).toEqual(melody);
        const backing = durations(arranged[0], 1 - melodyStaff);
        expect(backing.length, score.title).toBe(melody.length);
        backing.forEach((n, i) => expect(n, `${score.title} 第${i + 1}小节`).toBeCloseTo(melody[i], 6));
      }
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
  it("吉他伴奏保留旋律原八度，并按目标调和变调夹选择实际低音", () => {
    const abc = 'X:1\nM:4/4\nL:1/8\nK:G\n"G"B8 | "G/B"d8 | "Am7"e8 | "D7"f8 |]';
    const original = parse(abc)[0].setUpAudio({ chordsOff: true }).tracks[0];
    const arranged = parse(guitarArrangement(abc, "G", parse, 2, 2))[0];
    const [backing, melody] = arranged.setUpAudio({ chordsOff: true }).tracks;
    const notes = (track: typeof original) =>
      track.flatMap((event) =>
        event.cmd === "note" ? [[event.pitch, event.start, event.duration]] : []
      );
    expect(notes(melody)).toEqual(notes(original));
    const picked = backing.flatMap((event) => event.cmd === "note" ? [event.pitch] : []);
    expect(picked).toHaveLength(32);
    expect(picked[0]).toBe(43);
    expect(picked[8]).toBe(47);
    expect(Math.min(...picked) + 2).toBeGreaterThanOrEqual(42);
  });
});
