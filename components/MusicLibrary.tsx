"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Disc3, Music2, Play } from "lucide-react";
import { neteasePlayerUrl, type MusicTrack } from "@/lib/music";

function MusicArtwork({ track, large = false }: { track?: MusicTrack; large?: boolean }) {
  const source = track?.coverUrl;
  const [failed, setFailed] = useState<string>();
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (source && image.current?.complete && image.current.naturalWidth === 0) setFailed(source);
  }, [source]);
  if (source && failed !== source) return <img ref={image} src={source}
    alt={large ? `${track?.album || track?.title} 专辑封面` : ""} loading={large ? "eager" : "lazy"}
    onError={() => setFailed(source)} />;
  return large ? <div className="music-vinyl" aria-hidden="true"><span><Disc3 size={36} strokeWidth={1} /></span></div> : <Music2 size={22} />;
}

export function MusicLibrary({ tracks }: { tracks: MusicTrack[] }) {
  const [selectedId, setSelectedId] = useState(tracks[0]?.id);
  const selected = tracks.find(track => track.id === selectedId);
  const audio = useRef<HTMLAudioElement>(null);
  const playerFrame = useRef<HTMLDivElement>(null);
  const [playerScale, setPlayerScale] = useState(1);
  useEffect(() => {
    const element = playerFrame.current;
    if (!element) return;
    const resize = () => setPlayerScale(Math.min(1, element.getBoundingClientRect().width / 330));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected?.neteaseSongId]);
  const [message, setMessage] = useState("");
  const select = (track: MusicTrack) => {
    setSelectedId(track.id);
    setMessage("");
    if (audio.current) {
      audio.current.pause();
      if (track.audioUrl) {
        audio.current.src = track.audioUrl;
        audio.current.play().catch(() => setMessage("点击播放器的播放按钮，开始收听。"));
      } else {
        audio.current.removeAttribute("src");
        audio.current.load();
      }
    }
  };
  return <div className="music-library">
    <section className="music-listening-room" aria-label="音乐播放器">
      <div className="music-record" data-testid="music-selected-artwork"><MusicArtwork track={selected} large /></div>
      <div className="music-now-playing">
        <p className="music-kicker">SIDE A / {selected ? "ON THE RECORD" : "TAKE A MOMENT"}</p>
        <h2>{selected?.title || "给旋律，留一点时间。"}</h2>
        <p>{selected ? `${selected.artist}${selected.album ? ` · ${selected.album}` : ""}` : "写下的歌，唱过的心事。慢慢听，慢慢认识。"}</p>
        {/* One audio element owns playback, so choosing a track never overlaps songs. */}
        <audio ref={audio} src={selected?.audioUrl} controls preload="none" aria-label={selected ? `播放 ${selected.title}` : "音乐播放器"}
          hidden={!selected?.audioUrl} onError={() => setMessage("暂时无法播放这首作品，请稍后再试。")} />
        {selected?.platformUrl && <a className="music-platform-link" href={selected.platformUrl} target="_blank" rel="noopener noreferrer">在网易云音乐收听<ArrowUpRight size={14} /></a>}
        {selected?.neteaseSongId && !selected.audioUrl && <div className="music-embed">
          <div ref={playerFrame} className="music-player-frame" style={{ height: 86 * playerScale }}>
            <iframe key={selected.id} src={neteasePlayerUrl(selected.neteaseSongId)} style={{ transform: `scale(${playerScale})` }}
              title={`网易云音乐播放器 · ${selected.title}`} height="86" loading="lazy" allow="autoplay; encrypted-media" />
          </div>
          <p>点击播放器收听；若平台暂时无法加载，可使用上方链接打开作品。</p>
        </div>}
        <p role="status" className="music-player-message">{message}</p>
      </div>
    </section>
    <section className="music-track-section" aria-labelledby="music-tracks-title">
      <div className="music-section-heading"><h2 id="music-tracks-title">音乐作品</h2><span>{tracks.length ? `${String(tracks.length).padStart(2, "0")} TRACKS` : "IN THE MAKING"}</span></div>
      {tracks.length ? <ol className="music-track-list">{tracks.map((track, index) => <li key={track.id} data-music-track={track.id}>
        <button type="button" onClick={() => select(track)} aria-pressed={selectedId === track.id} aria-label={`选择 ${track.title}`}>
          <span className="music-track-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="music-track-art" aria-hidden="true"><MusicArtwork track={track} /></span>
          <span className="music-track-title"><strong>{track.title}</strong><span>{track.artist}{track.album ? ` / ${track.album}` : ""}</span></span>
          {track.releasedAt && <time dateTime={track.releasedAt}>{track.releasedAt.replace(/-/g, ".")}</time>}
          <Play size={17} aria-hidden="true" />
        </button>
      </li>)}</ol> : <div className="music-empty"><Music2 size={24} strokeWidth={1.4} /><p>作品正在整理，新的旋律会在这里留下来。</p></div>}
    </section>
    {selected?.lyrics?.trim() && <details key={selected.id} className="music-lyrics" open>
      <summary><span>歌词</span><span>{selected.title}</span><span className="music-lyrics-toggle" aria-hidden="true">⌄</span></summary>
      {selected.lyricCredits && <p className="music-lyric-credits">{selected.lyricCredits}</p>}
      <p className="music-lyrics-text">{selected.lyrics}</p>
    </details>}
  </div>;
}
