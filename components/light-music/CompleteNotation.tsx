"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { guitarCapoChords, pianoArrangement, type CompleteScore } from "@/lib/light-music/notation";

export function CompleteNotation({
  id,
  instrument,
  transpose,
  capo,
  fontSize
}: {
  id: string;
  instrument: "guitar" | "piano";
  transpose: number;
  capo: number;
  fontSize: number;
}) {
  const paper = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState<CompleteScore>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    setScore(undefined);
    setError("");
    setLoading(true);
    fetch(`/music/scores/${encodeURIComponent(id)}.json`, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("完整谱面暂时无法载入");
        return r.json();
      })
      .then((data: CompleteScore) => {
        if (!abort.signal.aborted) setScore(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(String(e.message));
      });
    return () => abort.abort();
  }, [id]);
  useEffect(() => {
    if (!score || !paper.current) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    import("abcjs")
      .then((module) => {
        if (cancelled || !paper.current) return;
        const abcjs = module.default;
        const abc =
          instrument === "piano"
            ? pianoArrangement(score.abc, score.key, abcjs.parseOnly)
            : guitarCapoChords(score.abc, capo);
        const rendered = abcjs.renderAbc(paper.current, abc, {
          responsive: "resize",
          staffwidth: 760,
          visualTranspose: transpose,
          add_classes: true,
          paddingtop: 20,
          paddingbottom: 25,
          scale: 1,
          wrap: { minSpacing: 1.8, maxSpacing: 2.8, preferredMeasuresPerLine: 4 },
          tablature:
            instrument === "guitar" ? [{ instrument: "guitar", label: "吉他六线谱 · %T", capo }] : undefined
        });
        if (!rendered.length) throw new Error("谱面音符无法排版");
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [score, instrument, transpose, capo, fontSize]);
  return (
    <div className="light-complete-notation">
      {loading && !error && <p role="status">正在排版完整曲谱…</p>}
      {error && <p role="alert">{error}</p>}
      {score && !score.reviewed && <p className="light-score-credit">音符转写校对中，请同时核对来源谱本。</p>}
      <p className="light-notation-hint">可左右滑动查看整行曲谱，使用“字号”放大谱面。</p>
      <div
        ref={paper}
        tabIndex={0}
        style={{ "--light-score-scale": fontSize / 18 } as CSSProperties}
        className="light-notation-paper"
        aria-label={`${score?.title ?? "歌曲"} · ${instrument === "piano" ? "双手钢琴谱" : "完整吉他谱"}`}
      />
      {score && (
        <p className="light-score-credit">
          {score.credit}
          {instrument === "piano"
            ? " 左手为 Light 分解和弦伴奏编配，右手保留原曲旋律。"
            : " 五线谱与六线谱同步转调，变调夹按实际品位换算。"}
        </p>
      )}
    </div>
  );
}
