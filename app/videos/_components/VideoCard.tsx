// ============================================================
// VideoCard - 视频卡片 (v0.33 P0-3)
//  - 16:9 缩略图 + 标题 (可点跳详情) + series badge + duration
//  - cover_image 优先, fallback "🎬 暂无封面"
// ============================================================
import Link from "next/link";
import type { Video } from "@/lib/types";

interface Props {
  video: Video;
  seriesTitle?: string | null;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("zh-CN");
}

export function VideoCard({ video, seriesTitle }: Props) {
  const duration = formatDuration(video.duration);
  return (
    <Link
      href={`/videos/${video.slug}`}
      data-testid="video-card"
      data-slug={video.slug}
      className="group block overflow-hidden rounded-lg border border-border bg-bg-card transition hover:border-accent/60 hover:shadow-md"
    >
      {/* 16:9 缩略图 */}
      <div className="relative aspect-video w-full overflow-hidden bg-bg-muted">
        {video.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.cover_image}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-fg-muted">
            🎬
          </div>
        )}
        {duration && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-mono text-white">
            {duration}
          </div>
        )}
      </div>

      {/* info */}
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold group-hover:text-accent" title={video.title}>
          {video.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-fg-muted">
          {seriesTitle && (
            <span className="rounded bg-bg-muted px-1.5 py-0.5">{seriesTitle}</span>
          )}
          {video.published_at && <span>· {formatDate(video.published_at)}</span>}
        </div>
        {video.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-fg-muted">{video.description}</p>
        )}
      </div>
    </Link>
  );
}
