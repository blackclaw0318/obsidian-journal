"use client";

// ============================================================
// VideoForm - 视频新建/编辑 (Phase 3.4)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface VideoFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  series_id?: string | null;
  embed_url?: string;
  cover_image?: string | null;
  duration?: number | null;
  status?: "draft" | "published" | "archived";
}

export interface VideoSeriesOption {
  id: string;
  title: string;
}

export function VideoForm({
  initial,
  mode,
  seriesList
}: {
  initial?: VideoFormInitial;
  mode: "create" | "edit";
  seriesList: VideoSeriesOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [seriesId, setSeriesId] = useState<string>(initial?.series_id ?? "");
  const [embedUrl, setEmbedUrl] = useState(initial?.embed_url ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [duration, setDuration] = useState<string>(initial?.duration?.toString() ?? "");
  const [publishNow, setPublishNow] = useState(initial?.status === "published");
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (mode === "create" && !slug) {
      setSlug(
        v
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 80)
      );
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const url = mode === "create" ? "/api/admin/videos" : `/api/admin/videos/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || null,
        series_id: seriesId || null,
        embed_url: embedUrl.trim(),
        cover_image: coverImage.trim() || null,
        duration: duration ? parseInt(duration, 10) : null
      };
      if (mode === "create") {
        body.publish = publishNow;
        body.status = publishNow ? "published" : "draft";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        router.push("/admin/videos");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          missing_embed_url: "embed_url 不能为空",
          series_not_found: "系列不存在",
          invalid_status: "状态非法",
          not_found: "视频不存在",
          unauthorized: "未登录",
          input_too_long: "slug 或标题过长 (≤200)"
        };
        setError(errMap[data.error ?? ""] ?? `保存失败 (${data.error ?? res.status})`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <Field label="标题" required>
        <input
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="slug" required hint="URL: /videos/{slug}">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 font-mono text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="embed_url" required hint="B 站/YouTube iframe src 或 mp4 直链">
        <input
          required
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://www.youtube.com/embed/xxx 或 https://example.com/v.mp4"
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="系列" hint="可选,留空表示独立视频">
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="">— 无系列 —</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </Field>
        <Field label="时长 (秒)" hint="可选,留空自动隐藏">
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
        </Field>
      </div>

      <Field label="封面图 URL" hint="可选,留空从 embed 自动取">
        <input
          value={coverImage ?? ""}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="描述" hint="可选,支持纯文本">
        <textarea
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      {mode === "create" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="rounded"
          />
          <span>立即发布</span>
        </label>
      )}

      <div className="flex gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "保存中..." : mode === "create" ? "创建" : "保存"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/videos")}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-base"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-fg-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
