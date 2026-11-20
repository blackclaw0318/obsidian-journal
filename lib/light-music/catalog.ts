export const LIGHT_CATEGORIES = [
  "颂赞",
  "悔改认罪",
  "奉献",
  "爱慕",
  "祷告祈求",
  "感恩",
  "节期",
  "激励",
  "福音性",
  "纪念",
  "其他"
] as const;
export type LightCategory = (typeof LIGHT_CATEGORIES)[number];
export interface LightSheet {
  id: string;
  label: string;
  instrument: "guitar" | "piano" | "unknown";
  url: string;
  kind?: "image" | "page" | "pdf";
  incomplete?: boolean;
  sourceName?: string;
  format?: "弹唱谱" | "和弦谱" | "指弹谱" | "五线谱" | "和弦简谱";
  scoreKey?: string;
  arranger?: string;
}

export function isYopuSheet(sheet: LightSheet) {
  return sheet.kind === "page" && /^https:\/\/yopu\.co\/view\/[A-Za-z0-9]+$/.test(sheet.url);
}
export interface LightSong {
  id: string;
  title: string;
  aliases?: string[];
  artist?: string;
  category: LightCategory;
  categoryReason: string;
  originalKey?: string;
  timeSignature?: string;
  bpm?: number;
  audio?: {
    url: string;
    sourceUrl: string;
    label: string;
    verifiedAt: string;
    verification?: "range" | "source-page";
    preview?: boolean;
  };
  listeningUrl?: string;
  searchUrl?: string;
  archivedSheetCount?: number;
  notation?: { key: string; timeSignature?: string; reviewed: boolean; measures: number };
  sheets: LightSheet[];
  chart?: { kind?: "lead" | "chords"; credit: string; sections: { label: string; lines: string[] }[] };
  incomplete?: boolean;
}

// A named song remains one entry; distinct scans/arrangements are preserved as sheets.
export function normalizeSongTitle(title: string) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/祢/g, "你")
    .replace(/[\s·・！!，,。.:：;；'"“”‘’、?？《》〈〉]/g, "");
}
export function mergeSongEntries(entries: LightSong[]): LightSong[] {
  const grouped = new Map<string, LightSong>();
  for (const entry of entries) {
    const name = normalizeSongTitle(entry.title);
    const current = grouped.get(name);
    if (!current) {
      grouped.set(name, {
        ...entry,
        category: entry.incomplete ? "其他" : entry.category,
        sheets: [...entry.sheets]
      });
      continue;
    }
    const preferred = current.incomplete && !entry.incomplete ? entry : current;
    const incomplete = Boolean(current.incomplete && entry.incomplete);
    const audio = [preferred.audio, current.audio, entry.audio];
    grouped.set(name, {
      ...preferred,
      id: current.id,
      incomplete,
      category: incomplete ? "其他" : preferred.category,
      aliases: [...new Set([...(current.aliases ?? []), ...(entry.aliases ?? [])])],
      sheets: [...new Map([...current.sheets, ...entry.sheets].map((sheet) => [sheet.url, sheet])).values()],
      audio: audio.find((source) => source && !source.preview) ?? audio.find(Boolean),
      chart: preferred.chart ?? current.chart ?? entry.chart
    });
  }
  return [...grouped.values()];
}
export const lightFragments = [
  {
    id: "fragment-001",
    title: "无标题吉他残页",
    note: "缺少标题与开头，暂无法确认歌名。原图已在本地“其他”目录归档。"
  },
  {
    id: "fragment-027",
    title: "你的爱不离不弃 · 续页",
    note: "此图为单独的曲谱续页；完整歌曲已按歌名合并。",
    relatedTitle: "你的爱不离不弃"
  },
  {
    id: "fragment-195",
    title: "无标题简谱片段",
    note: "仅保留部分音符与和弦，无法确认完整歌曲。原图已在本地“其他”目录归档。"
  }
];

// Kept outside the repertoire: a clearly labelled, public-domain interaction sample.
export const transposeDemo: LightSong = {
  id: "transpose-demo",
  title: "奇异恩典",
  artist: "Amazing Grace · 传统圣诗",
  category: "感恩",
  categoryReason: "以蒙恩得救与感恩为主题。",
  originalKey: "G",
  timeSignature: "3/4",
  sheets: [],
  listeningUrl: "https://www.hymnal.net/en/hymn/h/313",
  chart: {
    credit: "传统曲调 NEW BRITAIN；John Newton 词（公版）。以下为本站简化伴奏示例。",
    sections: [
      {
        label: "第一节 · 和弦伴奏示例",
        lines: [
          "[G]Amazing grace! How [C]sweet the [G]sound,",
          "That saved a wretch like [D7]me!",
          "I [G]once was lost, but [C]now am [G]found,",
          "Was [Em]blind, but [D7]now I [G]see."
        ]
      }
    ]
  }
};
