"use client";

// ============================================================
// VideoSeriesForm - 系列新建/编辑 (Phase 3.4)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface VideoSeriesFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  cover_image?: string | null;
  order?: number;
}

export function VideoSeriesForm({
  initial,
  mode
}: {
  initial?: VideoSeriesFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [order, setOrder] = useState<string>(initial?.order?.toString() ?? "0");
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
      const url = mode === "create" ? "/api/admin/video-series" : `/api/admin/video-series/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || null,
        cover_image: coverImage.trim() || null,
        order: parseInt(order, 10) || 0
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        router.push("/admin/video-series");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          not_found: "系列不存在",
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

      <Field label="slug" required hint="URL: /videos/series/{slug}">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 font-mono text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="排序" hint="数字越小越靠前,新建时自动取 max+1">
        <input
          type="number"
          min="0"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="w-32 rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="封面图 URL" hint="可选">
        <input
          value={coverImage ?? ""}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="描述" hint="可选">
        <textarea
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

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
          onClick={() => router.push("/admin/video-series")}
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
