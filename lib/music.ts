import catalog from "./music-tracks.json";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  releasedAt?: string;
  coverUrl?: string;
  audioUrl?: string;
  platformUrl?: string;
  neteaseSongId?: string;
  lyrics?: string;
  lyricCredits?: string;
}

export function neteasePlayerUrl(songId: string) {
  return `https://music.163.com/outchain/player?type=2&id=${encodeURIComponent(songId)}&auto=0&height=66`;
}

// Only verified, published works belong here. No private artist-console URLs.
export const musicTracks = catalog as MusicTrack[];
