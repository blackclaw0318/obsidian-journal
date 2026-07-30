// ============================================================
// Pagination (公开端) - 图片分页按钮 (v0.42 老板 2026-07-29 拍)
// 老板 2026-07-29 14:53 拍板: 简单数字按钮 + 首末上下页, 不引第三方库
// URL 格式: ?type=image&page=N (server 组件, Link 拼接)
// 总数 ≤ 1 不渲染
// ============================================================
import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages: number;
  basePath: string; // e.g. "/resources?type=image" (不含 page=)
  preserveQuery?: Record<string, string | undefined>; // 额外保留 search params (如 q)
}

function pageHref(basePath: string, page: number, preserve?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  // basePath 可能已带 query (e.g. "/resources?type=image"), 解析出来
  const [path, qs] = basePath.split("?");
  if (qs) {
    for (const part of qs.split("&")) {
      const [k, v] = part.split("=");
      if (k) params.set(k, v ?? "");
    }
  }
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function buildPageNumbers(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  // 大量页: 1 ... (current-1) current (current+1) ... total
  const out: Array<number | "..."> = [1];
  if (current > 3) out.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push("...");
  out.push(total);
  return out;
}

export function Pagination({ currentPage, totalPages, basePath, preserveQuery }: Props) {
  if (totalPages <= 1) return null;

  const numbers = buildPageNumbers(currentPage, totalPages);
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  const baseClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded border border-border bg-bg px-3 text-sm transition hover:bg-bg-muted";
  const activeClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded border border-accent bg-accent px-3 text-sm font-semibold text-white";
  const disabledClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded border border-border bg-bg-muted px-3 text-sm text-fg-muted opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-1"
      aria-label="分页"
      data-testid="resources-pagination"
      data-current-page={currentPage}
      data-total-pages={totalPages}
    >
      {isFirst ? (
        <span className={disabledClass} aria-hidden="true">«</span>
      ) : (
        <Link href={pageHref(basePath, 1, preserveQuery)} className={baseClass} aria-label="首页">«</Link>
      )}
      {isFirst ? (
        <span className={disabledClass} aria-hidden="true">‹</span>
      ) : (
        <Link href={pageHref(basePath, prev, preserveQuery)} className={baseClass} aria-label="上一页">‹</Link>
      )}

      {numbers.map((n, i) =>
        n === "..." ? (
          <span key={`e${i}`} className="px-2 text-fg-muted">…</span>
        ) : n === currentPage ? (
          <span key={n} className={activeClass} aria-current="page">{n}</span>
        ) : (
          <Link
            key={n}
            href={pageHref(basePath, n, preserveQuery)}
            className={baseClass}
            aria-label={`第 ${n} 页`}
          >
            {n}
          </Link>
        )
      )}

      {isLast ? (
        <span className={disabledClass} aria-hidden="true">›</span>
      ) : (
        <Link href={pageHref(basePath, next, preserveQuery)} className={baseClass} aria-label="下一页">›</Link>
      )}
      {isLast ? (
        <span className={disabledClass} aria-hidden="true">»</span>
      ) : (
        <Link href={pageHref(basePath, totalPages, preserveQuery)} className={baseClass} aria-label="末页">»</Link>
      )}
    </nav>
  );
}