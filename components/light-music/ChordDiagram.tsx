import { chordNotes, guitarShape, noteName } from "@/lib/light-music/theory";

export function ChordDiagram({
  chord,
  instrument,
  flats
}: {
  chord: string;
  instrument: "guitar" | "piano";
  flats: boolean;
}) {
  const notes = chordNotes(chord);
  if (instrument === "piano") {
    const white = [0, 2, 4, 5, 7, 9, 11];
    const black = [
      { note: 1, x: 15 },
      { note: 3, x: 35 },
      { note: 6, x: 75 },
      { note: 8, x: 95 },
      { note: 10, x: 115 }
    ];
    return (
      <figure className="light-chord-card">
        <figcaption>{chord}</figcaption>
        {notes ? (
          <>
            <svg
              viewBox="0 0 140 88"
              role="img"
              aria-label={`${chord} 钢琴和弦：${notes.map((n) => noteName(n, flats)).join("、")}`}
            >
              {white.map((n, i) => (
                <rect
                  key={n}
                  x={i * 20 + 1}
                  y="1"
                  width="19"
                  height="84"
                  rx="2"
                  fill={notes.includes(n) ? "#d7e3b3" : "#fffef8"}
                  stroke="#2d3b34"
                />
              ))}
              {black.map(({ note, x }) => (
                <rect
                  key={note}
                  x={x}
                  y="1"
                  width="11"
                  height="52"
                  rx="1"
                  fill={notes.includes(note) ? "#b36e56" : "#2d3b34"}
                />
              ))}
            </svg>
            <span>{notes.map((n) => noteName(n, flats)).join(" · ")}</span>
          </>
        ) : (
          <span>此和弦暂无键位图</span>
        )}
      </figure>
    );
  }
  const shape = guitarShape(chord);
  const pressed = shape?.filter((n) => n > 0) ?? [];
  const start = pressed.length ? Math.max(1, Math.min(...pressed)) : 1;
  const position = Math.max(...pressed, 0) > 4 ? start : 1;
  return (
    <figure className="light-chord-card">
      <figcaption>{chord}</figcaption>
      {shape ? (
        <svg
          viewBox="0 0 110 116"
          role="img"
          aria-label={`${chord} 吉他指法，六弦至一弦：${shape.map((n) => (n < 0 ? "不弹" : n === 0 ? "空弦" : `${n}品`)).join("、")}`}
        >
          {position > 1 && (
            <text x="3" y="42" fontSize="10" fill="currentColor">
              {position}
            </text>
          )}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="25"
              x2="95"
              y1={28 + i * 18}
              y2={28 + i * 18}
              stroke="currentColor"
              strokeWidth={i === 0 && position === 1 ? 3 : 1}
            />
          ))}
          {shape.map((fret, i) => (
            <g key={i}>
              <line x1={25 + i * 14} x2={25 + i * 14} y1="28" y2="100" stroke="currentColor" />
              {fret > 0 ? (
                <circle cx={25 + i * 14} cy={28 + (fret - position + 0.5) * 18} r="5" fill="currentColor" />
              ) : (
                <text x={25 + i * 14} y="19" textAnchor="middle" fontSize="12" fill="currentColor">
                  {fret < 0 ? "×" : "○"}
                </text>
              )}
            </g>
          ))}
        </svg>
      ) : (
        <span>
          {notes ? `和弦音 ${notes.map((n) => noteName(n, flats)).join(" · ")}` : "此和弦暂无指法图"}
        </span>
      )}
    </figure>
  );
}
