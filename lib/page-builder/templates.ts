// ============================================================
// Page Builder 模板 (v0.25, v0.6.1 §21.4 模板化 v1)
// ============================================================
// 5-6 套预设模板 + 1 个空白选项
// 选模板时: 把 blocks 灌进 store, 用户可继续编辑
// 模板 ID 格式: tpl_<key>_<n> (避免与 createBlock 的 b_* 冲突)
//
// 设计原则:
//   - 6 套覆盖最常见场景 (关于/友链/首页/归档/项目/长文)
//   - 每套 block 数控制在 3-7 个, 用户上手后可任意加/删/改
//   - 所有模板均严守 v0.6.1 §6.1 13 种 Block, 不引入新类型
//   - 文本占位用 "..." 或具体例子, 让用户看到"应该填什么"
// ============================================================

import type { Block } from "@/lib/blocks";

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  blockCount: number;
  blocks: Block[];
}

// 模板 blocks 的 ID 工厂 (避免与 createBlock 的 b_* 时间戳冲突)
function tplId(key: string, n: number): string {
  return `tpl_${key}_${n}`;
}

// ============ 模板定义 ============

export const TEMPLATES: PageTemplate[] = [
  // 1. 空白页 (0 blocks, 用户从零开始)
  {
    id: "blank",
    name: "空白页",
    description: "从零开始,自己拖积木搭建",
    icon: "📄",
    blockCount: 0,
    blocks: []
  },

  // 2. 关于我 (heading + 3 段 + 1 引用)
  {
    id: "about",
    name: "关于我",
    description: "个人介绍 — heading + 几段文字 + 座右铭引用",
    icon: "👤",
    blockCount: 5,
    blocks: [
      { id: tplId("about", 1), type: "heading", level: 1, text: "关于我" },
      { id: tplId("about", 2), type: "text", theme: "light", content: "用一段话简单介绍自己 — 你在做什么,关注什么,擅长什么。" },
      { id: tplId("about", 3), type: "heading", level: 2, text: "我在做什么" },
      { id: tplId("about", 4), type: "text", theme: "light", content: "## 工作\n\n...\n\n## 兴趣\n\n..." },
      { id: tplId("about", 5), type: "quote", theme: "light", text: "一句话座右铭或最喜欢的话。", cite: "— 某人" }
    ]
  },

  // 3. 友情链接 (heading + 列表 + callout)
  {
    id: "links",
    name: "友情链接",
    description: "博客 / GitHub / 邮箱等外链清单",
    icon: "🔗",
    blockCount: 4,
    blocks: [
      { id: tplId("links", 1), type: "heading", level: 1, text: "友情链接" },
      { id: tplId("links", 2), type: "callout", theme: "light", variant: "info", title: "交换友链", content: "如果你也想交换友链,欢迎邮件联系 admin@obsidian.local" },
      { id: tplId("links", 3), type: "heading", level: 2, text: "技术博客" },
      { id: tplId("links", 4), type: "list", theme: "light", ordered: false, items: ["[博客名 1](https://example.com) — 一句话简介", "[博客名 2](https://example.com) — 一句话简介", "[博客名 3](https://example.com) — 一句话简介"] }
    ]
  },

  // 4. 首页 Hero (callout + heading + divider + text)
  {
    id: "home",
    name: "首页 Hero",
    description: "个人主页 — 顶部招呼 + 简介 + 行动号召",
    icon: "🏠",
    blockCount: 5,
    blocks: [
      { id: tplId("home", 1), type: "callout", theme: "light", variant: "success", title: "👋 你好,我是", content: "**你的名字** — 一句话介绍你做什么的。" },
      { id: tplId("home", 2), type: "divider", theme: "light" },
      { id: tplId("home", 3), type: "heading", level: 2, text: "我最近在做什么" },
      { id: tplId("home", 4), type: "text", theme: "light", content: "写 2-3 段最近的项目 / 学习 / 思考。每段 50-100 字即可。" },
      { id: tplId("home", 5), type: "callout", theme: "light", variant: "info", content: "📬 想联系?发邮件到 [你的邮箱](mailto:you@example.com)" }
    ]
  },

  // 5. 归档索引 (heading + divider + table)
  {
    id: "archive",
    name: "归档索引",
    description: "按年份 / 主题归档的内容目录页",
    icon: "📚",
    blockCount: 5,
    blocks: [
      { id: tplId("archive", 1), type: "heading", level: 1, text: "归档" },
      { id: tplId("archive", 2), type: "text", theme: "light", content: "按时间倒序整理的所有重要内容。" },
      { id: tplId("archive", 3), type: "divider", theme: "light" },
      { id: tplId("archive", 4), type: "heading", level: 2, text: "2026" },
      { id: tplId("archive", 5), type: "table", theme: "light", headers: ["日期", "标题", "分类"], rows: [["2026-07", "...", "tech"], ["2026-06", "...", "life"]] }
    ]
  },

  // 6. 项目展示 (heading + text + code + callout)
  {
    id: "project",
    name: "项目展示",
    description: "单个项目详细介绍 — 简介 + 技术栈 + 截图占位",
    icon: "🛠️",
    blockCount: 6,
    blocks: [
      { id: tplId("project", 1), type: "heading", level: 1, text: "项目名" },
      { id: tplId("project", 2), type: "text", theme: "light", content: "一句话项目介绍 — 它解决什么问题,为什么有趣。" },
      { id: tplId("project", 3), type: "heading", level: 2, text: "技术栈" },
      { id: tplId("project", 4), type: "code", theme: "light", language: "bash", code: "framework: Next.js 14\ndatabase: SQLite\ndeploy: 2c4g VPS" },
      { id: tplId("project", 5), type: "heading", level: 2, text: "踩过的坑" },
      { id: tplId("project", 6), type: "callout", theme: "light", variant: "warning", title: "⚠️ 性能教训", content: "项目里遇到的最有意思的问题和解决方法。" }
    ]
  },

  // 7. 长文阅读 (heading + 3 text 段落 + 1 引用 + 1 divider)
  {
    id: "reading",
    name: "长文阅读",
    description: "纯文字长文结构 — 标题 + 段落 + 中间引言 + 分割",
    icon: "📖",
    blockCount: 7,
    blocks: [
      { id: tplId("reading", 1), type: "heading", level: 1, text: "文章标题" },
      { id: tplId("reading", 2), type: "text", theme: "light", content: "开篇段落 — 引出主题, 100-200 字。" },
      { id: tplId("reading", 3), type: "heading", level: 2, text: "第一节" },
      { id: tplId("reading", 4), type: "text", theme: "light", content: "正文段落..." },
      { id: tplId("reading", 5), type: "quote", theme: "light", text: "文中要突出的金句", cite: "— 自己" },
      { id: tplId("reading", 6), type: "divider", theme: "light" },
      { id: tplId("reading", 7), type: "text", theme: "light", content: "结语 — 总结观点,引导行动。" }
    ]
  },

  // 8. v0.26 复合模板: 展示页 (Hero + Stats + Skills + Timeline + Posts)
  {
    id: "showcase",
    name: "作品展示页",
    description: "复合 Block 一键组合 — Hero + 数据 + 技能 + 时间线 + 最新文章",
    icon: "⭐",
    blockCount: 5,
    blocks: [
      { id: tplId("showcase", 1), type: "hero", theme: "light", title: "我的作品集", subtitle: "过去 5 年我做过的事", ctaText: "看项目", ctaUrl: "/posts" },
      { id: tplId("showcase", 2), type: "stats", theme: "light", items: [{ label: "项目数", value: 12, suffix: "+" }, { label: "总访问", value: 3500 }, { label: "代码提交", value: 1500 }, { label: "客户满意度", value: 98, suffix: "%" }], columns: 4 },
      { id: tplId("showcase", 3), type: "skills", theme: "light", items: [{ name: "TypeScript", level: 90 }, { name: "React/Next.js", level: 85 }, { name: "Node.js", level: 80 }, { name: "数据库设计", level: 75 }] },
      { id: tplId("showcase", 4), type: "timeline", theme: "light", items: [{ date: "2026-01", title: "启动 obsidian-journal", content: "黑曜石日志 项目开始" }, { date: "2025-06", title: "上一个项目交付", content: "..." }, { date: "2024-12", title: "独立全栈" }] },
      { id: tplId("showcase", 5), type: "posts", theme: "light", limit: 6, sortBy: "new" }
    ]
  }
];

/** 按 id 查模板 (返回深拷贝, 避免引用共享) */
export function getTemplate(id: string): PageTemplate | null {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  return {
    ...t,
    blocks: JSON.parse(JSON.stringify(t.blocks)) as Block[]
  };
}

/** 给 UI 用: 按 id 查 (返回原对象, 性能友好) */
export function findTemplate(id: string): PageTemplate | null {
  return TEMPLATES.find((x) => x.id === id) ?? null;
}