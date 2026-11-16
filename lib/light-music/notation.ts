import { chordNotes, noteNumber, transposeChord, usesFlats } from "./theory";

export interface CompleteScore {
  title: string;
  key: string;
  abc: string;
  credit: string;
  sourceUrl?: string;
  reviewed: boolean;
}

interface AbcElement {
  el_type: string;
  duration?: number;
  chord?: { name: string; position?: string }[];
  type?: string;
  startEnding?: string;
  startTriplet?: number;
  tripletMultiplier?: number;
  endTriplet?: boolean;
}
interface ParsedTune {
  lines?: { staff?: { voices?: AbcElement[][] }[] }[];
}
type Parser = (abc: string) => unknown[];
const FRACTION = 1536;

/** Explicit accidentals make accompaniment pitches independent of key-signature state. */
export function midiToAbc(midi: number, flats = false) {
  const names = flats
    ? ["=C", "_D", "=D", "_E", "=E", "=F", "_G", "=G", "_A", "=A", "_B", "=B"]
    : ["=C", "^C", "=D", "^D", "=E", "=F", "^F", "=G", "^G", "=A", "^A", "=B"];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[((midi % 12) + 12) % 12];
  if (octave >= 5) return name.toLowerCase() + "'".repeat(octave - 5);
  return name + ",".repeat(Math.max(0, 4 - octave));
}

function lengthToken(duration: number) {
  let n = Math.round(duration * FRACTION),
    d = FRACTION / 8;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(n, d);
  n /= g;
  d /= g;
  return d === 1 ? (n === 1 ? "" : String(n)) : `${n}/${d}`;
}

function pitches(chord: string, fallback: string) {
  const match = /^([A-G][#b]?)(?:[^/]*)(?:\/([A-G][#b]?))?$/.exec(chord);
  const root = noteNumber(match?.[1] ?? fallback.replace(/m$/, "")) ?? 0;
  const tones = chordNotes(chord) ?? chordNotes(fallback) ?? [root, (root + 4) % 12, (root + 7) % 12];
  const bass = 36 + (noteNumber(match?.[2] ?? match?.[1] ?? "") ?? root);
  const rootMidi = 36 + root;
  const interval = (pc: number) => (((pc - root) % 12) + 12) % 12;
  const sorted = [...tones].sort((a, b) => interval(a) - interval(b));
  const third = sorted.find((pc) => [3, 4, 5, 2].includes(interval(pc))) ?? root;
  const fifth = sorted.find((pc) => [7, 6, 8].includes(interval(pc))) ?? root;
  const extension = sorted.find((pc) => [9, 10, 11].includes(interval(pc)));
  return [
    bass,
    rootMidi + interval(third),
    rootMidi + interval(fifth),
    rootMidi + (extension === undefined ? 12 : interval(extension))
  ];
}

/** Full left-hand score follows actual bar durations and harmony changes of the melody. */
export function pianoArrangement(abc: string, key: string, parse: Parser) {
  // Multi-voice scores already contain written parts; retain those parts intact.
  const declared = [...abc.matchAll(/^V:([^\s]+)/gm)].map((m) => m[1]);
  if (new Set(declared).size > 1) return abc;
  const tune = parse(abc)[0] as ParsedTune | undefined;
  if (!tune?.lines) throw new Error("曲谱没有可读取的音符");
  const measures: string[] = [];
  const lineCounts: number[] = [];
  let harmony = key;
  let prefix = "";
  let tuplet = 1;
  const compound = /^M:(6|9|12)\/8\s*$/m.test(abc);
  const pulse = compound ? 1 / 8 : 1 / 4;
  let segments: { chord: string; duration: number }[] = [];
  const flush = (bar = "|") => {
    if (!segments.length) {
      prefix += bar;
      return;
    }
    let at = 0;
    const notes: string[] = [];
    for (const segment of segments) {
      let remain = segment.duration;
      while (remain > 1 / FRACTION) {
        const next = (Math.floor((at + 1e-7) / pulse) + 1) * pulse;
        const duration = Math.min(remain, next - at);
        const tones = pitches(segment.chord, key);
        const pattern = compound ? [tones[0], tones[1], tones[2], tones[3], tones[2], tones[1]] : tones;
        notes.push(
          midiToAbc(pattern[Math.floor((at + 1e-7) / pulse) % pattern.length], usesFlats(key)) +
            lengthToken(duration)
        );
        remain -= duration;
        at += duration;
      }
    }
    measures.push(prefix + notes.join(" ") + " " + bar);
    prefix = "";
    segments = [];
  };
  for (const line of tune.lines) {
    const before = measures.length;
    for (const el of line.staff?.[0]?.voices?.[0] ?? []) {
      if (el.el_type === "bar") {
        const bars: Record<string, string> = {
          bar_right_repeat: ":|",
          bar_left_repeat: "|:",
          bar_dbl_repeat: ":|:",
          bar_thin_thick: "|]",
          bar_thin_thin: "||"
        };
        flush((bars[el.type ?? ""] ?? "|") + (el.startEnding ? `[${el.startEnding}` : ""));
      } else if (el.el_type === "note" && el.duration) {
        if (el.startTriplet) tuplet = el.tripletMultiplier ?? 1;
        const duration = el.duration * tuplet;
        const named = el.chord?.find((c) => c.position === "default" || !c.position)?.name;
        if (named && chordNotes(named)) harmony = named;
        const last = segments.at(-1);
        if (last?.chord === harmony) last.duration += duration;
        else segments.push({ chord: harmony, duration });
        if (el.endTriplet) tuplet = 1;
      }
    }
    if (line.staff?.[0]?.voices?.[0]?.some((el) => el.el_type === "note"))
      lineCounts.push(measures.length - before);
  }
  if (segments.length) {
    flush("|]");
    lineCounts[lineCounts.length - 1] += 1;
  }
  if (measures.length < 4) throw new Error("完整曲谱的小节数据不足");
  const lines = abc.split("\n");
  let started = false;
  const header: string[] = [];
  const body: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^%%(?:score|staves)/.test(line) || /^V:/.test(line)) continue;
    if (!started && (line.trim() === "" || line.startsWith("%") || /^[A-Za-z]:/.test(line)))
      header.push(line);
    else {
      started = true;
      body.push(line.replace(/\[V:[^\]]+\]/g, ""));
    }
  }
  const systems: string[][] = [];
  for (const line of body) {
    if (/^[wW]:|^%/.test(line)) systems.at(-1)?.push(line);
    else systems.push([line]);
  }
  let cursor = 0;
  const written = systems.flatMap((system, i) => {
    const count = lineCounts[i] ?? 0;
    const left = measures.slice(cursor, cursor + count).join(" ");
    cursor += count;
    return ["[V:RH]", ...system, "[V:LH]", left];
  });
  return [
    ...header,
    "%%score { RH | LH }",
    'V:RH clef=treble name="旋律"',
    'V:LH clef=bass name="伴奏"',
    ...written
  ].join("\n");
}

export function guitarCapoChords(abc: string, capo: number) {
  if (!capo) return abc;
  return abc.replace(/"([^"\n]+)"/g, (whole, chord: string) =>
    chordNotes(chord) ? `"${transposeChord(chord, -capo)}"` : whole
  );
}
