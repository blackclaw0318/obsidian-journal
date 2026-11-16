import type { Metadata } from "next";
import { MusicLibrary } from "@/components/MusicLibrary";
import { musicTracks } from "@/lib/music";
import Link from "next/link";
import { LightLibrary } from "@/components/light-music/LightLibrary";
import { lightSongs } from "@/lib/light-music";
import "./light-music.css";

export const metadata: Metadata = {
  title: "音乐 · 上坤",
  description: "上坤的原创音乐与 Light 团契赞美诗曲库。一起听歌、查看曲谱，为吉他与钢琴伴奏一键转调。",
  alternates: { canonical: "/music" }
};

export default function MusicPage({ searchParams }: { searchParams?: { library?: string } }) {
  const light = searchParams?.library === "light";
  return (
    <div className="sticker-page sticker-index sticker-music mx-auto max-w-5xl px-6 py-12">
      <header className="sticker-page-header">
        <h1>音乐</h1>
        <p>把想法写成歌，把一起唱过的旋律，留在生活里。</p>
      </header>
      <nav className="music-library-switch" aria-label="音乐曲库">
        <Link href="/music" aria-current={!light ? "page" : undefined}>
          <span>SIDE A</span>原创音乐
          <span className="music-library-count">{String(musicTracks.length).padStart(2, "0")}</span>
        </Link>
        <Link href="/music?library=light" aria-current={light ? "page" : undefined}>
          <span>SIDE B</span>Light 曲库
          <span className="music-library-count">{String(lightSongs.length).padStart(2, "0")}</span>
        </Link>
      </nav>
      {light ? <LightLibrary songs={lightSongs} /> : <MusicLibrary tracks={musicTracks} />}
    </div>
  );
}
