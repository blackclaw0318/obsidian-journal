import fs from "node:fs/promises";
const songs = JSON.parse(await fs.readFile("lib/light-music/songs.json", "utf8"));
const notation = JSON.parse(await fs.readFile("lib/light-music/score-manifest.json", "utf8"));
const rows = [
  [
    "歌名",
    "分类",
    "MP3状态",
    "MP3地址",
    "音源来源",
    "吉他站内完整转调谱",
    "钢琴站内双手转调谱",
    "已有曲谱来源",
    "待补链接（可填写）"
  ]
];
for (const song of songs) {
  const audio = song.audio;
  const full = notation[song.id]?.reviewed;
  rows.push([
    song.title,
    song.category,
    audio?.verification === "range"
      ? "已验证文件头与完整文件长度"
      : audio
        ? "官网公开地址，待逐首试听"
        : "未找到可用MP3",
    audio?.url ?? "",
    audio?.sourceUrl ?? song.listeningUrl ?? "",
    full ? "已完成" : "待补齐",
    full ? "已完成" : "待补齐",
    song.sheets.map((s: { url: string }) => s.url).join(" | "),
    ""
  ]);
}
const csv =
  "\uFEFF" +
  rows
    .map((row) => row.map((cell: string) => '"' + String(cell).replace(/"/g, '""') + '"').join(","))
    .join("\r\n") +
  "\r\n";
await fs.mkdir("public/music", { recursive: true });
await fs.writeFile("public/music/light-resource-checklist.csv", csv);
console.log(
  JSON.stringify({
    songs: songs.length,
    audio: songs.filter((s: { audio?: unknown }) => s.audio).length,
    completeScores: Object.values(notation).length
  })
);
