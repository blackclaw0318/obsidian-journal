import { describe, it, expect } from "vitest";
import {
  chordNotes,
  guitarShape,
  noteNumber,
  parseChordLine,
  transposeChord
} from "../../../lib/light-music/theory";
import { mergeSongEntries, type LightSong } from "../../../lib/light-music/catalog";

describe("Light 曲谱转调", () => {
  it("同时转换根音和斜杠低音，保留扩展和弦；不把正文当作和弦", () => {
    expect(transposeChord("Cmaj7/E", 2)).toBe("Dmaj7/F#");
    expect(transposeChord("Bm7b5/F", -2, true)).toBe("Am7b5/Eb");
    expect(transposeChord("Bb7", 14)).toBe("C7");
    expect(transposeChord("Bridge", 2)).toBe("Bridge");
    expect(transposeChord("N.C.", 2)).toBe("N.C.");
    expect(noteNumber("B#")).toBe(0);
  });
  it("12次升半音后回到相同音高，变调夹与指法调之和等于演唱调", () => {
    for (const chord of ["C", "F#m7", "Ebmaj7/Bb", "G7", "Am"]) {
      let shifted = chord;
      for (let i = 0; i < 12; i++) shifted = transposeChord(shifted, 1);
      expect(chordNotes(shifted)).toEqual(chordNotes(chord));
      expect(chordNotes(transposeChord(transposeChord(chord, 5 - 3), 3))).toEqual(
        chordNotes(transposeChord(chord, 5))
      );
    }
  });
  it("键位与吉他指法符合和弦音，未知扩展不生成错误图示", () => {
    expect(chordNotes("Cmaj7/E")).toEqual([4, 0, 7, 11]);
    expect(chordNotes("Bbm7")).toEqual([10, 1, 5, 8]);
    expect(chordNotes("C13#11")).toBeNull();
    const tuning = [4, 9, 2, 7, 11, 4];
    for (const root of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]) {
      for (const quality of ["", "m", "7", "m7", "maj7", "sus4"]) {
        const chord = root + quality;
        const expected = chordNotes(chord)!;
        const actual = guitarShape(chord)!.flatMap((fret, i) => (fret < 0 ? [] : [(fret + tuning[i]) % 12]));
        expect(
          actual.every((n) => expected.includes(n)),
          chord
        ).toBe(true);
        // Conventional dominant-seventh guitar voicings may omit the fifth.
        const required = quality === "7" ? expected.filter((_, i) => i !== 2) : expected;
        expect(
          required.every((n) => actual.includes(n)),
          chord
        ).toBe(true);
      }
    }
  });
  it("保留歌词空格与和弦对齐信息", () => {
    expect(parseChordLine("前奏 [G]同声 [D/F#]歌唱")).toEqual([
      { text: "前奏 " },
      { chord: "G", text: "同声 " },
      { chord: "D/F#", text: "歌唱" }
    ]);
  });
});

describe("Light 曲库按歌名合并", () => {
  const song: LightSong = {
    id: "one",
    title: "奇异恩典",
    category: "感恩",
    categoryReason: "感恩",
    sheets: [{ id: "a", label: "谱本一", instrument: "guitar", url: "/a.jpg" }]
  };
  it("同名不同图片合并为一首，保留两个谱本；残缺版本不会覆盖完整歌曲", () => {
    const result = mergeSongEntries([
      { ...song, incomplete: true },
      {
        ...song,
        id: "two",
        title: " 奇异恩典！",
        sheets: [{ id: "b", label: "谱本二", instrument: "piano", url: "/b.jpg" }]
      }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].sheets).toHaveLength(2);
    expect(result[0].category).toBe("感恩");
    expect(result[0].incomplete).toBe(false);
    expect(mergeSongEntries([{ ...song, incomplete: true }])[0].category).toBe("其他");
  });
});
