// ============================================================
// Block Palette 清单 (v0.14 + v0.26, v0.6.1 §21.2)
// v0.14: 13 种基础 Block
// v0.26: + 7 种复合 Block (Hero/Stats/Skills/Timeline/Links/Posts/Videos)
// ============================================================

import type { BlockPaletteItem } from "./types";
export type { BlockPaletteItem } from "./types";

export const BLOCK_PALETTE: BlockPaletteItem[] = [
  { type: "text",        label: "文本",        description: "Markdown 段落",            category: "basic" },
  { type: "heading",     label: "标题",        description: "H1-H6 标题",                category: "basic" },
  { type: "image",       label: "图片",        description: "单图 + 说明文字",           category: "basic" },
  { type: "video",       label: "视频",        description: "本地 / CDN 视频",          category: "basic" },
  { type: "gallery",     label: "相册",        description: "2-4 列图片网格",            category: "basic" },
  { type: "quote",       label: "引用",        description: "引文 + 出处",              category: "typography" },
  { type: "callout",     label: "标注",        description: "4 变体提示框 (info/warn/success/danger)", category: "typography" },
  { type: "code",        label: "代码",        description: "代码块 + 语言标签",         category: "typography" },
  { type: "divider",     label: "分割线",      description: "水平分隔线",                category: "typography" },
  { type: "list",        label: "列表",        description: "有序/无序列表",            category: "list" },
  { type: "table",       label: "表格",        description: "表头 + 数据行",             category: "list" },
  { type: "custom_html", label: "自定义 HTML", description: "⚠️ 默认禁用 (需 SiteConfig)", category: "advanced", advanced: true, locked: true },
  { type: "music",       label: "音乐",        description: "音频嵌入 (高级)",          category: "advanced", advanced: true },

  // v0.26 复合 Block (v0.6.1 §21.2)
  { type: "hero",        label: "Hero 招呼区",  description: "标题 + 副标题 + CTA 按钮",         category: "composite" },
  { type: "stats",       label: "数据统计",     description: "数字网格 (2/3/4 列)",            category: "composite" },
  { type: "skills",      label: "技能进度条",   description: "name + 水平进度条 (level 0-100)", category: "composite" },
  { type: "timeline",    label: "时间线",       description: "按日期排列的事件列表",            category: "composite" },
  { type: "links",       label: "链接卡片",     description: "外链卡片网格 (name/url/desc)",    category: "composite" },
  { type: "posts",       label: "最新文章",     description: "自动拉取 published posts",         category: "composite" },
  { type: "videos",      label: "最新视频",     description: "自动拉取 published videos",        category: "composite" }
];

/** 简化版: 排除 advanced/locked (普通用户默认看到的 11 种) */
export const BASIC_PALETTE = BLOCK_PALETTE.filter((b) => !b.advanced);

/** 按 category 分组 (供 BlockPalette 渲染) */
export function groupByCategory(items: BlockPaletteItem[] = BLOCK_PALETTE): Record<string, BlockPaletteItem[]> {
  const groups: Record<string, BlockPaletteItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export const CATEGORY_LABELS: Record<string, string> = {
  basic: "基础",
  typography: "排版",
  list: "列表",
  advanced: "高级 (默认折叠)",
  composite: "复合 (一键组合)"
};
