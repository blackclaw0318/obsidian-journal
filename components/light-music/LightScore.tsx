"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { ArrowUpRight, FileImage, Guitar, Minus, Music2, Plus, RotateCcw } from "lucide-react";
import type { LightSong } from "@/lib/light-music/catalog";
import {
  KEYS,
  mod12,
  noteName,
  noteNumber,
  parseChordLine,
  transposeChord,
  usesFlats
} from "@/lib/light-music/theory";
import { ChordDiagram } from "./ChordDiagram";
import { CompleteNotation } from "./CompleteNotation";

export function LightScore({ song, demo = false }: { song: LightSong; demo?: boolean }) {
  const sheets = song.sheets.filter((sheet) => sheet.kind !== "page");
  const [view, setView] = useState<"guitar" | "piano" | "original">(
    song.notation || (song.chart && !sheets.length) ? "guitar" : "original"
  );
  const [offset, setOffset] = useState(0);
  const [capo, setCapo] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [sheetId, setSheetId] = useState(sheets[0]?.id);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [audioError, setAudioError] = useState(false);
  const sourceKey = song.notation?.key ?? song.originalKey;
  const base = noteNumber(sourceKey?.replace(/m$/, "") ?? "");
  const minor = sourceKey?.endsWith("m") ? "m" : "";
  const targetKey =
    base === undefined ? undefined : noteName(base + offset, usesFlats(sourceKey ?? "")) + minor;
  const flats = usesFlats(targetKey ?? "");
  const shift = offset - (view === "guitar" ? capo : 0);
  const canTranspose = Boolean((song.notation || song.chart) && base !== undefined);
  const transposed = (chord: string) => (canTranspose ? transposeChord(chord, shift, flats) : chord);
  const chords = [
    ...new Set(
      song.chart?.sections.flatMap((section) =>
        section.lines.flatMap((line) =>
          parseChordLine(line).flatMap((part) => (part.chord ? [transposed(part.chord)] : []))
        )
      ) ?? []
    )
  ];
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];

  return (
    <section className="light-score" aria-label={`${song.title} 曲谱`}>
      <header className="light-score-heading">
        <div>
          <p className="music-kicker">{demo ? "TRY THE TRANSPOSER / 功能体验" : "LIGHT / SONGBOOK"}</p>
          <h2>
            {song.title}
            <span>{song.artist}</span>
          </h2>
        </div>
        <span className="light-category-label">{demo ? "示例曲目" : song.category}</span>
      </header>
      {demo && <p className="light-demo-note">用一首熟悉的旋律，试试适合你的调。此示例不计入团契曲库。</p>}
      {!demo && <p className="light-demo-note">{song.categoryReason}</p>}
      <div className="light-audio">
        {song.audio ? (
          <>
            <audio
              key={song.id}
              src={song.audio.url}
              controls
              preload="none"
              aria-label={`播放 ${song.title}`}
              onError={() => setAudioError(true)}
            />
            <div className="light-audio-links">
              <a href={song.audio.sourceUrl} target="_blank" rel="noopener noreferrer">
                {song.audio.label}
                <ArrowUpRight size={13} />
              </a>
              {song.audio.preview && song.listeningUrl?.startsWith("https://open.spotify.com/track/") && (
                <a href={song.listeningUrl} target="_blank" rel="noopener noreferrer">
                  在 Spotify 收听
                  <ArrowUpRight size={13} />
                </a>
              )}
            </div>
            {audioError && <p role="status">音频暂时无法加载，可打开来源页面收听。</p>}
          </>
        ) : (
          <p>
            {demo ? "" : "站内音源待补充。"}
            {song.listeningUrl && (
              <a href={song.listeningUrl} target="_blank" rel="noopener noreferrer">
                {song.listeningUrl.includes("/search/") ? "搜索音源" : "前往来源页面收听"}
                <ArrowUpRight size={13} />
              </a>
            )}
          </p>
        )}
      </div>
      <nav className="light-score-tabs" aria-label="曲谱视图">
        {(song.notation || song.chart) && (
          <>
            <button type="button" aria-pressed={view === "guitar"} onClick={() => setView("guitar")}>
              <Guitar size={16} />
              {song.notation ? "吉他完整谱" : "吉他和弦"}
            </button>
            <button type="button" aria-pressed={view === "piano"} onClick={() => setView("piano")}>
              <Music2 size={16} />
              {song.notation ? "钢琴双手谱" : "钢琴和弦参考"}
            </button>
          </>
        )}
        {sheets.length > 0 && (
          <button type="button" aria-pressed={view === "original"} onClick={() => setView("original")}>
            <FileImage size={16} />
            来源曲谱 <span>{sheets.length}</span>
          </button>
        )}
      </nav>
      {view !== "original" && (song.notation || song.chart) && (
        <>
          {canTranspose && (
            <div className="light-score-toolbar">
              <label>
                演唱调
                <select
                  aria-label="演唱调"
                  value={mod12(base! + offset)}
                  onChange={(event) => setOffset(mod12(Number(event.target.value) - base!))}
                >
                  {KEYS.map((key, n) => (
                    <option key={key} value={n}>
                      {key}
                      {minor}
                    </option>
                  ))}
                </select>
              </label>
              <div className="light-stepper">
                <button type="button" aria-label="降半音" onClick={() => setOffset((n) => n - 1)}>
                  <Minus size={16} />
                </button>
                <span>半音</span>
                <button type="button" aria-label="升半音" onClick={() => setOffset((n) => n + 1)}>
                  <Plus size={16} />
                </button>
              </div>
              {view === "guitar" && (
                <label>
                  变调夹
                  <select
                    aria-label="变调夹"
                    value={capo}
                    onChange={(event) => setCapo(Number(event.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, n) => (
                      <option key={n} value={n}>
                        {n ? `${n} 品` : "不夹"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                className="light-reset"
                onClick={() => {
                  setOffset(0);
                  setCapo(0);
                }}
              >
                <RotateCcw size={14} />
                复位
              </button>
              <label className="light-font-size">
                字号
                <select
                  aria-label="曲谱字号"
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                >
                  {[16, 18, 22, 26].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className="light-score-meta" aria-live="polite">
            {sourceKey && `参考谱调 ${sourceKey}`}
            <span>演唱 {targetKey ?? song.originalKey ?? "调号待核对"}</span>
            {view === "guitar" && canTranspose && (
              <span>
                指法 {noteName(base! + offset - capo, flats)}
                {minor} · {capo ? `夹 ${capo} 品` : "不夹"}
              </span>
            )}
            {(song.notation?.timeSignature ?? song.timeSignature) && (
              <span>{song.notation?.timeSignature ?? song.timeSignature}</span>
            )}
            {song.bpm && <span>♩ = {song.bpm}</span>}
          </p>
          {song.notation ? (
            <CompleteNotation
              id={song.id}
              instrument={view}
              transpose={offset}
              capo={capo}
              fontSize={fontSize}
            />
          ) : (
            <>
              <div className="light-chart" style={{ fontSize }}>
                {song.chart!.sections.map((section, n) => (
                  <section key={n}>
                    <h3>{section.label}</h3>
                    {section.lines.map((line, i) => (
                      <p className="light-chord-line" key={i}>
                        {parseChordLine(line).map((part, j) => (
                          <span className="light-chord-segment" key={j}>
                            {part.chord && <strong>{transposed(part.chord)}</strong>}
                            <span>{part.text || "\u00a0"}</span>
                          </span>
                        ))}
                      </p>
                    ))}
                  </section>
                ))}
              </div>
              <details className="light-chord-guide" open>
                <summary>
                  {view === "guitar" ? "吉他指法参考" : "钢琴和弦键位"}
                  <span>{chords.length} CHORDS</span>
                </summary>
                <p>
                  {view === "guitar"
                    ? "指法图按六弦到一弦排列；× 不弹，○ 空弦。横按请按自己的习惯安排手指。"
                    : "彩色琴键标出和弦音。此视图为和弦伴奏参考，完整五线谱请查看原始曲谱。"}
                </p>
                <div className="light-chord-diagrams">
                  {chords.map((chord) => (
                    <ChordDiagram key={chord} chord={chord} instrument={view} flats={flats} />
                  ))}
                </div>
              </details>
              <p className="light-score-credit">{song.chart!.credit}</p>
            </>
          )}
          {canTranspose && (
            <p className="light-score-credit">
              {song.notation ? "音符、调号、和弦与六线谱同步转调；" : "转调适用于上方和弦谱；"}
              录音与原始曲谱保留原调。
            </p>
          )}
        </>
      )}
      {view === "original" && (
        <div className="light-original">
          {sheet ? (
            <>
              <div className="light-original-toolbar">
                <label>
                  谱本
                  <select
                    aria-label="选择原始曲谱"
                    value={sheet.id}
                    onChange={(event) => setSheetId(event.target.value)}
                  >
                    {sheets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                        {item.incomplete ? "（残缺）" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <a href={sheet.url} target="_blank" rel="noopener noreferrer">
                  {sheet.kind === "pdf" ? "打开 PDF" : "打开大图"}
                  <ArrowUpRight size={14} />
                </a>
              </div>
              <p className="light-score-credit">
                {sheet.sourceName ?? "原始谱本"}
                {sheet.format ? ` · ${sheet.format}` : ""}
                {sheet.instrument === "guitar" ? " · 吉他" : sheet.instrument === "piano" ? " · 钢琴" : ""}
                {sheet.incomplete ? " · 此谱不完整" : ""}
                {sheet.scoreKey ? ` · ${sheet.scoreKey} 调` : ""}
                {sheet.arranger ? ` · ${sheet.arranger} 编配` : ""}
              </p>
              {sheet.kind === "pdf" ? (
                <iframe
                  className="light-pdf-viewer"
                  src={sheet.url}
                  title={`${song.title} · ${sheet.label}`}
                  loading="lazy"
                />
              ) : failedImages.includes(sheet.url) ? (
                <p role="status">曲谱图片暂时无法加载，请稍后重试。</p>
              ) : (
                <img
                  key={sheet.url}
                  src={sheet.url}
                  alt={`${song.title} · ${sheet.label}${sheet.incomplete ? "（残缺谱）" : ""}`}
                  loading="lazy"
                  onError={() => setFailedImages((items) => [...items, sheet.url])}
                />
              )}
            </>
          ) : (
            <p>站内曲谱待整理。</p>
          )}
        </div>
      )}
    </section>
  );
}
