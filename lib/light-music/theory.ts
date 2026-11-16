// Pure music operations shared by the score renderer and catalog validation.
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function noteNumber(note: string): number | undefined {
  const match = /^([A-G])([#b♯♭]?)$/.exec(note);
  if (!match) return undefined;
  return mod12(NATURAL[match[1]] + (/[#♯]/.test(match[2]) ? 1 : /[b♭]/.test(match[2]) ? -1 : 0));
}

export function noteName(number: number, preferFlats = false) {
  return (preferFlats ? KEYS : SHARPS)[mod12(number)];
}

export function usesFlats(key: string) {
  return /b|♭/.test(key) || key === "F" || key === "Dm";
}

export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  // Never interpret arbitrary prose as a chord. Slash bass is transposed separately.
  const match = /^([A-G][#b♯♭]?)([^/\s]*)(?:\/([A-G][#b♯♭]?))?$/.exec(chord);
  if (!match || !/^(?:m|maj|min|dim|aug|sus|add|M|Δ|ø|°|\+|-|\d|\(|\)|#|b|♭|♯)*$/.test(match[2]))
    return chord;
  const root = noteNumber(match[1]);
  if (root === undefined) return chord;
  const bass = match[3] ? noteNumber(match[3]) : undefined;
  return (
    noteName(root + semitones, preferFlats) +
    match[2] +
    (bass === undefined ? "" : `/${noteName(bass + semitones, preferFlats)}`)
  );
}

const INTERVALS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "2": [0, 2, 4, 7],
  add2: [0, 2, 4, 7],
  add9: [0, 4, 7, 14],
  "9": [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14]
};

export function chordNotes(chord: string): number[] | null {
  const match = /^([A-G][#b♯♭]?)([^/]*)(?:\/([A-G][#b♯♭]?))?$/.exec(chord);
  if (!match) return null;
  const root = noteNumber(match[1]);
  const intervals = INTERVALS[match[2]];
  if (root === undefined || !intervals) return null;
  const notes = intervals.map((n) => mod12(root + n));
  const bass = match[3] ? noteNumber(match[3]) : undefined;
  return [...new Set(bass === undefined ? notes : [bass, ...notes])];
}

// Low E to high E; -1 is muted. Movable shapes keep uncommon keys usable.
const OPEN_SHAPES: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  D: [-1, -1, 0, 2, 3, 2],
  E: [0, 2, 2, 1, 0, 0],
  F: [1, 3, 3, 2, 1, 1],
  G: [3, 2, 0, 0, 0, 3],
  A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  Dm: [-1, -1, 0, 2, 3, 1],
  Em: [0, 2, 2, 0, 0, 0],
  C7: [-1, 3, 2, 3, 1, 0],
  D7: [-1, -1, 0, 2, 1, 2],
  E7: [0, 2, 0, 1, 0, 0],
  G7: [3, 2, 0, 0, 0, 1],
  A7: [-1, 0, 2, 0, 2, 0],
  B7: [-1, 2, 1, 2, 0, 2],
  Am7: [-1, 0, 2, 0, 1, 0],
  Em7: [0, 2, 0, 0, 0, 0],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3],
  Asus2: [-1, 0, 2, 2, 0, 0],
  "G/B": [-1, 2, 0, 0, 0, 3],
  "D/F#": [2, 0, 0, 2, 3, 2],
  "C/E": [0, 3, 2, 0, 1, 0],
  "C/G": [3, 3, 2, 0, 1, 0],
  "F/A": [-1, 0, 3, 2, 1, 1],
  "A/C#": [-1, 4, 2, 2, 2, 0]
};
const E_SHAPES: Record<string, number[]> = {
  "": [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  "7": [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0]
};
const A_SHAPES: Record<string, number[]> = {
  "": [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  "7": [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus4: [-1, 0, 2, 2, 3, 0]
};

export function guitarShape(chord: string): number[] | null {
  if (OPEN_SHAPES[chord]) return OPEN_SHAPES[chord];
  const match = /^([A-G][#b]?)(.*)$/.exec(chord);
  if (!match) return null;
  const root = noteNumber(match[1]);
  if (root === undefined || !E_SHAPES[match[2]]) return null;
  const eFret = mod12(root - 4),
    aFret = mod12(root - 9);
  const base = aFret < eFret ? A_SHAPES[match[2]] : E_SHAPES[match[2]];
  const fret = Math.min(aFret, eFret);
  return base.map((n) => (n < 0 ? -1 : n + fret));
}

export interface ChordSegment {
  chord?: string;
  text: string;
}
export function parseChordLine(line: string): ChordSegment[] {
  const result: ChordSegment[] = [];
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)];
  if (!matches.length) return [{ text: line }];
  if (matches[0].index! > 0) result.push({ text: line.slice(0, matches[0].index) });
  matches.forEach((match, index) =>
    result.push({
      chord: match[1],
      text: line.slice(match.index! + match[0].length, matches[index + 1]?.index ?? line.length)
    })
  );
  return result;
}
