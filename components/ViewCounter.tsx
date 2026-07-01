// ============================================================
// ViewCounter (client) - 触发文章 / 视频 / 章节 view 防刷计数
//  - 入参: type + slug + initialCount
//  - useEffect mount 触发 POST /api/{type}/[slug]/view
//  - 返回最新 view_count (来自服务端, 不是单纯 +1)
//  - 失败静默 (网络/防刷错误不影响 UI)
// ============================================================
"use client";

import { useEffect, useState } from "react";
import { formatCount } from "@/lib/utils";

export type ViewCounterType = "posts" | "chapters" | "videos" | "pages";

export function ViewCounter({
  type,
  slug,
  initialCount,
  prefix = "阅读",
  className
}: {
  type: ViewCounterType;
  slug: string;
  initialCount: number;
  /** 前缀文案, 默认 "阅读"; 视频用 "播放" */
  prefix?: string;
  className?: string;
}) {
  const [count, setCount] = useState<number>(initialCount);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/${type}/${encodeURIComponent(slug)}/view`;

    fetch(url, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { view_count?: number } | null) => {
        if (cancelled || !data || typeof data.view_count !== "number") return;
        setCount(data.view_count);
      })
      .catch(() => {
        // 静默: 网络错/防刷, 保持 initialCount 显示
      });

    return () => {
      cancelled = true;
    };
  }, [type, slug]);

  return (
    <span className={className}>
      {formatCount(count)} {prefix}
    </span>
  );
}
