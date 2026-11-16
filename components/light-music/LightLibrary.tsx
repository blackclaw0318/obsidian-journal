"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Music2, Search, Sun } from "lucide-react";
import {
  LIGHT_CATEGORIES,
  lightFragments,
  type LightSong,
  transposeDemo,
  normalizeSongTitle
} from "@/lib/light-music/catalog";
import { LightScore } from "./LightScore";

export function LightLibrary({ songs }: { songs: LightSong[] }) {
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [completeOnly, setCompleteOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(
    (
      songs.find((song) => song.title === "安静" && song.notation?.reviewed) ??
      songs.find((song) => song.audio?.verification === "range" && song.notation?.reviewed) ??
      songs.find((song) => song.audio?.verification === "range" && song.chart?.kind === "lead") ??
      songs.find((song) => song.audio?.verification === "range") ??
      songs[0]
    )?.id
  );
  const selected = songs.find((song) => song.id === selectedId);
  const filtered = useMemo(
    () =>
      songs.filter(
        (song) =>
          (category === "全部" || song.category === category) &&
          (!completeOnly || song.notation?.reviewed) &&
          normalizeSongTitle([song.title, ...(song.aliases ?? []), song.artist ?? ""].join(" ")).includes(
            normalizeSongTitle(query)
          )
      ),
    [songs, category, query, completeOnly]
  );
  const groups = LIGHT_CATEGORIES.map((name) => ({
    name,
    songs: filtered.filter((song) => song.category === name)
  })).filter((group) => group.songs.length);
  const fragments =
    !completeOnly && (category === "全部" || category === "其他")
      ? lightFragments.filter((item) => normalizeSongTitle(item.title).includes(normalizeSongTitle(query)))
      : [];
  const countFor = (name: string) =>
    name === "全部"
      ? songs.length
      : songs.filter((song) => song.category === name).length + (name === "其他" ? lightFragments.length : 0);
  return (
    <div className="light-library">
      <section className="light-intro" aria-labelledby="light-title">
        <div className="light-intro-copy">
          <p className="music-kicker">SING TOGETHER / LIGHT FELLOWSHIP</p>
          <h2 id="light-title">
            我们唱过的，
            <br />
            也成为我们的光。
          </h2>
          <p>
            从颂赞到祷告，把一起唱过的歌，
            <br className="light-desktop-break" />
            和每一次相聚的记忆，收藏在这里。
          </p>
          <a href="#light-songs">
            翻开曲库
            <ArrowDown size={15} />
          </a>
        </div>
        <div className="light-songbook" aria-hidden="true">
          <span className="light-book-spine" />
          <p>
            THE LIGHT
            <br />
            SONGBOOK
          </p>
          <Sun className="light-book-sun" size={84} strokeWidth={1} />
          <span className="light-book-note">一同歌唱 · 一路有光</span>
          <span className="light-book-number">VOL. 01</span>
        </div>
        <div className="light-intro-footer">
          <span>
            <strong>{String(songs.length).padStart(2, "0")}</strong> 首共同的旋律
          </span>
          <span>WORSHIP · PRAYER · GRACE</span>
        </div>
      </section>
      <section id="light-songs" className="light-catalog" aria-labelledby="light-songs-title">
        <div className="music-section-heading">
          <h2 id="light-songs-title">Light 曲库</h2>
          <span>{songs.length} SONGS / 11 CATEGORIES</span>
        </div>
        <div className="light-filter-toolbar">
          <label className="light-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="搜索赞美诗"
              placeholder="找一首我们唱过的歌…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="light-complete-filter"
            aria-pressed={completeOnly}
            onClick={() => setCompleteOnly((value) => !value)}
          >
            完整转调谱 {songs.filter((song) => song.notation?.reviewed).length}
          </button>
          <span role="status">{filtered.length} 首歌曲</span>
        </div>
        <nav className="light-categories" aria-label="歌曲分类">
          {["全部", ...LIGHT_CATEGORIES].map((name) => (
            <button
              type="button"
              key={name}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
              <span>
                {countFor(name)}
                {name === "其他" ? " 残谱" : ""}
              </span>
            </button>
          ))}
        </nav>
        <details className="light-resource-log">
          <summary>
            待补清单 · {songs.filter((song) => !song.audio).length} 首音源 /{" "}
            {songs.filter((song) => !song.notation?.reviewed).length} 首完整转调谱
          </summary>
          <p>
            下面这些歌曲尚缺可用
            MP3。其余未标“完整转调谱”的歌曲，目前提供来源谱本或和弦参考；吉他完整谱与钢琴双手编配仍待补齐。
          </p>
          <div className="light-missing-songs">
            {songs
              .filter((song) => !song.audio)
              .map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(song.id);
                    document
                      .getElementById("light-selected-score")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {song.title}
                </button>
              ))}
          </div>
          <a href="/music/light-resource-checklist.csv" download>
            下载完整待补清单 CSV <ArrowUpRight size={13} />
          </a>
        </details>
        <div className="light-workspace">
          <div className="light-results" data-lenis-prevent>
            {groups.length + fragments.length > 0 ? (
              <div className="light-song-groups">
                {groups.map((group) => (
                  <section key={group.name}>
                    <h3>
                      {group.name}
                      <span>{String(group.songs.length).padStart(2, "0")}</span>
                    </h3>
                    <ol>
                      {group.songs.map((song, n) => (
                        <li key={song.id}>
                          <button
                            type="button"
                            aria-label={`查看 ${song.title}`}
                            aria-pressed={selectedId === song.id}
                            onClick={() => {
                              setSelectedId(song.id);
                              document
                                .getElementById("light-selected-score")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                          >
                            <span className="music-track-number">{String(n + 1).padStart(2, "0")}</span>
                            <Music2 size={20} strokeWidth={1.4} />
                            <span className="light-song-title">
                              <strong>{song.title}</strong>
                              <span>
                                {song.artist || "Light 团契"} · {song.sheets.length} 个谱源
                                {song.notation?.reviewed ? " · 完整转调谱" : ""}
                                {song.incomplete ? " · 残缺谱" : ""}
                              </span>
                            </span>
                            <span className="light-song-key">
                              {song.notation?.key || song.originalKey || "—"}
                            </span>
                            <span className="light-song-status">
                              {song.audio?.verification === "range"
                                ? "可播放"
                                : song.audio
                                  ? "官方音源"
                                  : "音源待补"}
                            </span>
                            <ArrowUpRight size={17} />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            ) : (
              <div className="light-catalog-empty">
                <Sun size={30} strokeWidth={1.2} />
                <h3>{songs.length ? "还没找到这首歌" : "曲谱整理中，旋律即将归档。"}</h3>
                <p>
                  {songs.length
                    ? "换个歌名，或试试其他分类。"
                    : "团契曲目将在这里按主题收藏。先用下方示例，试试一键转调。"}
                </p>
                {(query || category !== "全部" || completeOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("全部");
                      setCompleteOnly(false);
                    }}
                  >
                    查看全部歌曲
                  </button>
                )}
              </div>
            )}
            {fragments.length > 0 && (
              <section className="light-fragments">
                <h3>
                  其他 · 残缺谱本 <span>{fragments.length} 份</span>
                </h3>
                {fragments.map((item) => (
                  <article key={item.id}>
                    <h4>{item.title}</h4>
                    <p>{item.note}</p>
                    {item.relatedTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          const song = songs.find((song) => song.title === item.relatedTitle);
                          if (song) setSelectedId(song.id);
                        }}
                      >
                        查看完整歌曲 →
                      </button>
                    )}
                  </article>
                ))}
              </section>
            )}
          </div>
          {selected && (
            <div id="light-selected-score" className="light-selected-score">
              <LightScore key={selected.id} song={selected} />
            </div>
          )}
        </div>
      </section>
      <details className="light-demo" open={!songs.length}>
        <summary>
          <span>试试一键转调</span>
          <span>吉他 / 钢琴伴奏</span>
          <PlusMark />
        </summary>
        <LightScore song={transposeDemo} demo />
      </details>
      <p className="light-library-footnote">LIGHT FELLOWSHIP · 愿每一次歌唱，都让我们更靠近光。</p>
    </div>
  );
}

function PlusMark() {
  return (
    <span className="light-demo-toggle" aria-hidden="true">
      ＋
    </span>
  );
}
