"use client";

// ============================================================
// PageForm - 页面新建/编辑 (Phase 3.5)
// Block 数组存为 JSON 字符串 (沿用 v0.6.1 schema, 暂不引 PageBuilder v1)
// 3.7 PageBuilder 升级时只改前端编辑, API/storage 不动
// ============================================================
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface PageFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  blocks?: string; // JSON
  status?: "draft" | "published" | "archived";
}

export function PageForm({
  initial,
  mode
}: {
  initial?: PageFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [blocksText, setBlocksText] = useState<string>(() => {
    if (initial?.blocks) {
      try { return JSON.stringify(JSON.parse(initial.blocks), null, 2); } catch { return initial.blocks; }
    }
    return "[]";
  });
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

    // 客户端预校验 blocks JSON
    let blocksNormalized = blocksText.trim() || "[]";
    try {
      JSON.parse(blocksNormalized);
    } catch {
      setError("blocks 字段不是合法 JSON,检查括号/逗号/引号");
      return;
    }

    startTransition(async () => {
      const url = mode === "create" ? "/api/admin/pages" : `/api/admin/pages/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body: any = {
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim() || null,
        blocks: blocksNormalized
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
        router.push("/admin/pages");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          slug_exists: "slug 已存在,换一个",
          missing_slug: "slug 不能为空",
          missing_title: "标题不能为空",
          invalid_blocks_json: "blocks 字段不是合法 JSON",
          invalid_status: "状态非法",
          not_found: "页面不存在",
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

      <Field label="slug" required hint="URL: /{slug}">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 font-mono text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field label="描述" hint="可选,SEO 摘要">
        <input
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>

      <Field
        label="blocks (JSON 数组)"
        hint="3.7 PageBuilder 升级时换成可视化编辑; 暂用手写 JSON,见 DESIGN §7"
      >
        <textarea
          rows={14}
          value={blocksText}
          onChange={(e) => setBlocksText(e.target.value)}
          spellCheck={false}
          className="w-full rounded border border-border bg-bg-base px-3 py-1.5 font-mono text-xs outline-none focus:border-accent"
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
          onClick={() => router.push("/admin/pages")}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-bg-base"
        >
          取消
        </button>
        {mode === "edit" && initial?.id && (
          <a
            href={`/admin/pages/${initial.id}/builder`}
            className="rounded border border-fg bg-fg/5 px-4 py-2 text-sm hover:bg-fg/10"
            title="v0.6.1 §21 Page Builder (v0.14) — 三栏 + dnd-kit 拖拽"
          >
            🎨 打开 Page Builder
          </a>
        )}
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
