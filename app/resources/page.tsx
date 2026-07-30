// ============================================================
// /resources - 资源库公开页 (v0.42 老板 2026-07-29 拍)
// 三类分支渲染:
//   - image (默认 + type=image): 分页网格 (12/页), 走 ResourceImageGrid + Pagination
//   - document (type=document): 列表, 走 ResourceList (全量, limit=200)
//   - audio    (type=audio):    列表, 走 ResourceList (全量, limit=200)
//   - q 搜索: 维持原 listAll 网格 (无 layout 拆分, 跨类不分页)
// 老板 2026-07-29 14:53 拍板: Q1=12 / Q2=不分页 / Q3=全部默认跳 image / Q4=5 字段
// ============================================================
import Link from "next/link";
import { mediaRepo } from "@/lib/repo";
import { canonical } from "@/lib/seo";
import { formatBytes } from "@/lib/utils";
import { ResourceImageGrid } from "./_components/ResourceImageGrid";
import { ResourceList } from "./_components/ResourceList";
import { Pagination } from "./_components/Pagination";
import type { MediaCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { type?: string; q?: string; page?: string };

const CATEGORIES: Array<{ value: MediaCategory | ""; label: string; emoji: string }> = [
  { value: "", label: "全部", emoji: "📦" },
  { value: "image", label: "图片", emoji: "🖼️" },
  { value: "document", label: "文档", emoji: "📄" },
  { value: "audio", label: "音频", emoji: "🎵" }
];

const PAGE_SIZE_IMAGE = 12; // Q1 老板拍板: 12/页
const LIMIT_LIST = 200; // Q2 老板拍板: 不分页, 全量, 上限 200

export function generateMetadata(): { title: string; alternates: { canonical: string } } {
  return {
    title: "资源库",
    alternates: { canonical: canonical("/resources") }
  };
}

// 默认走 image grid (Q3 老板拍板)
function normalizeType(type: string | undefined): MediaCategory | "" {
  if (!type) return "image" as unknown as MediaCategory | ""; // 空 type → image
  if (type === "image" || type === "document" || type === "audio") return type;
  return ""; // 非法值 (URL 篡改兜底) → 走混合 listAll (与搜索相同路径)
}

export default function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? "").trim();
  const isSearching = q.length > 0;
  const rawType = searchParams.type ?? "";
  const type = isSearching ? "" : normalizeType(searchParams.type);
  const cat = CATEGORIES.find((c) => c.value === rawType) ?? CATEGORIES[0];

  // ===== 数据查询 (按 type 分支) =====
  let imageData: { items: import("@/lib/types").MediaItem[]; total: number } | null = null;
  let listData: { items: import("@/lib/types").MediaItem[]; total: number } | null = null;
  let mixedItems: import("@/lib/types").MediaItem[] | null = null;
  let totalAll = 0;

  if (isSearching) {
    // 搜索: 跨类, 维持原 listAll (无 layout 拆分)
    const r = mediaRepo.listAll({ q, limit: 100 });
    mixedItems = r.items;
    totalAll = r.total;
  } else if (type === "image") {
    // 图片: 分页
    const pageRaw = parseInt(searchParams.page ?? "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const offset = (page - 1) * PAGE_SIZE_IMAGE;
    imageData = mediaRepo.listByCategory({ category: "image", limit: PAGE_SIZE_IMAGE, offset });
  } else if (type === "document" || type === "audio") {
    // 文档/音频: 列表全量
    listData = mediaRepo.listByCategory({ category: type, limit: LIMIT_LIST });
  }

  const totalSize = mediaRepo.totalSize();
  const allCount = mediaRepo.count();

  // v0.42: 不同分支渲染不同子组件
  const safeImageItems = imageData ? JSON.parse(JSON.stringify(imageData.items)) : [];
  const safeListItems = listData ? JSON.parse(JSON.stringify(listData.items)) : [];
  const safeMixedItems = mixedItems ? JSON.parse(JSON.stringify(mixedItems)) : [];

  // 分页元数据
  const currentPage =
    type === "image" && imageData
      ? Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)
      : 1;
  const totalPages =
    type === "image" && imageData
      ? Math.max(1, Math.ceil(imageData.total / PAGE_SIZE_IMAGE))
      : 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">📦 资源库</h1>
        <p className="mt-2 text-fg-muted">
          共 <strong>{allCount}</strong> 个文件 · 总大小 {formatBytes(totalSize)}
          {isSearching
            ? ` · 搜索 "${q}": ${totalAll} 个匹配`
            : type === "image" && imageData
              ? ` · 图片 第 ${currentPage} / ${totalPages} 页 (共 ${imageData.total} 张)`
              : listData
                ? ` · ${cat.label} ${listData.total} 个 (上限 ${LIMIT_LIST})`
                : ""}
        </p>
      </header>

      {/* tabs (image/audio/document/all) */}
      <form className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => {
            const isActive = (c.value || "all") === (rawType || "all");
            return (
              <Link
                key={c.value || "all"}
                href={c.value ? `/resources?type=${c.value}` : "/resources"}
                className={`rounded px-3 py-1.5 text-sm ${isActive ? "bg-accent text-white" : "border border-border bg-bg text-fg hover:border-accent/40"}`}
              >
                {c.emoji} {c.label}
              </Link>
            );
          })}
        </div>
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索 filename / alt..."
          className="ml-auto rounded border border-border bg-bg px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded border border-border bg-bg px-3 py-1.5 text-sm">搜索</button>
      </form>

      {/* ===== 主渲染区 (按 type 分支) ===== */}
      {isSearching ? (
        safeMixedItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
            未找到匹配 "{q}" 的文件
          </div>
        ) : (
          // 搜索: 维持原 4 列网格 (跨类不分 layout, 视觉一致)
          <SearchResultsGrid items={safeMixedItems} />
        )
      ) : type === "image" ? (
        <>
          {safeImageItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
              该分类暂无文件
            </div>
          ) : (
            <>
              <ResourceImageGrid items={safeImageItems} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/resources?type=image"
              />
            </>
          )}
        </>
      ) : type === "document" || type === "audio" ? (
        <ResourceList items={safeListItems} category={type} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-bg-muted p-12 text-center text-fg-muted">
          未知的资源类型
        </div>
      )}
    </div>
  );
}

// ============================================================
// 搜索结果网格 (跨类搜索时复用, 走原 ResourceGrid 的 image-like 渲染)
// 简化版: 不引 modal, 直接 <a href={url} target="_blank"> 打开
// ============================================================
function SearchResultsGrid({ items }: { items: import("@/lib/types").MediaItem[] }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      data-testid="resources-search-grid"
    >
      {items.map((m) => {
        const isImage = m.mime_type.startsWith("image/");
        return (
          <a
            key={m.id}
            href={isImage ? m.url : `/api/resources/${m.id}/download`}
            target="_blank"
            rel="noreferrer"
            data-testid="resource-search-card"
            data-mime={m.mime_type}
            data-category={m.category}
            className="group overflow-hidden rounded-lg border border-border bg-bg-card transition hover:border-accent/60 hover:shadow-md"
          >
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-bg-muted">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt={m.alt ?? m.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="text-5xl">
                  {m.category === "audio" ? "🎵" : "📄"}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium" title={m.filename}>
                {m.alt ?? m.filename}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-fg-muted">
                <span>{formatBytes(m.size)}</span>
                <span className="rounded bg-bg-muted px-1.5 py-0.5">{m.mime_type.split("/")[1]}</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}