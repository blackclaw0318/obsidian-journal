// ============================================================
// ArticleCopyright - 文章/章节/小说末尾版权块 (v0.39)
//  - 老板 2026-07-09 拍: 移除 AI 声明 / 版权 / 永久链接 3 段
//  - 整站统一 Footer 留 License 一行即可, 文章末尾不再重复
//  - 保留组件占位以避免大范围引用方改动 (返回 null)
// ============================================================

export type ArticleCopyrightType = "post" | "chapter" | "novel";

export function ArticleCopyright(_props: {
  type: ArticleCopyrightType;
  slug: string;
}) {
  return null;
}
