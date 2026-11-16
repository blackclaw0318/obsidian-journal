import songs from "./songs.json";
import notation from "./score-manifest.json";
import { mergeSongEntries, type LightSong } from "./catalog";

// Keep the JSON out of the shared client helpers. The server passes it once.
export const lightSongs = mergeSongEntries(
  (songs as LightSong[]).map((song) => ({
    ...song,
    notation: (notation as Record<string, NonNullable<LightSong["notation"]>>)[song.id]
  }))
);
