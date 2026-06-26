"use client";

// ============================================================
// PostForm - 新建 / 编辑共用 (Phase 3.2)
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface PostFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string | null;
  status?: "draft" | "published" | "archived";
  category?: "tech" | "life";
  tags?: string;
}

export function PostForm({
  initial,
  mode
}: {
  initial?: PostFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [category, setCategory] = useState<"tech" | "life">(initial?.category ?? "tech");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [publishNow, setPublishNow] = useState(initial?.status === "published");
  const [error, setError] = useState<string | null>(null);

  // 自动 slug (仅 create 模式 + slug 为空)
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
      const url = mode === "create"
        ? "/api/admin/posts"
        : `/api/admin/posts/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        cover_image: coverImage.trim() || null,
        category,
        tags: tags.trim()
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
        router.push("/admin/posts");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          missing_content: "内容不能为空",
          invalid_category: "分类必须为 tech 或 life",
          invalid_status: "状态非法",
          not_found: "文章不存在",
          unauthorized: "未登录"
        };
        setError(errMap[data.error ?? ""] ?? `保存失败 (${data.error ?? res.status})`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 标题 + slug */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">标题 *</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
            placeholder="文章标题"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Slug * <span className="text-xs text-fg-muted">(URL 片段,英文/数字/中文/连字符)</span>
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            placeholder="my-post-slug"
          />
        </label>
      </div>

      {/* 分类 + 标签 */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">分类 *</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "tech" | "life")}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
          >
            <option value="tech">tech (技术)</option>
            <option value="life">life (生活)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            标签 <span className="text-xs text-fg-muted">(逗号分隔)</span>
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
            placeholder="nextjs, react, ai"
          />
        </label>
      </div>

      {/* 摘要 */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">摘要 <span className="text-xs text-fg-muted">(可选, 用于列表卡片)</span></span>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 outline-none focus:border-accent"
          placeholder="一句话介绍文章内容"
        />
      </label>

      {/* 封面图 */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">封面图 URL <span className="text-xs text-fg-muted">(可选)</span></span>
        <input
          value={coverImage ?? ""}
          onChange={(e) => setCoverImage(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          placeholder="https://... 或 /media/..."
        />
      </label>

      {/* 正文 Markdown */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">正文 * <span className="text-xs text-fg-muted">(Markdown, 公开页自动渲染)</span></span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={20}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          placeholder={`# 标题\n\n段落...\n\n## 子标题\n\n- 列表项 1\n- 列表项 2`}
        />
      </label>

      {/* 发布开关 (仅 create) */}
      {mode === "create" && (
        <label className="flex items-center gap-2 rounded border border-border bg-bg-card p-3">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">
            <strong>立即发布</strong> <span className="text-fg-muted">(否则保存为草稿)</span>
          </span>
        </label>
      )}

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "保存中..." : mode === "create" ? "创建" : "保存修改"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-card"
        >
          取消
        </button>
      </div>
    </form>
  );
}