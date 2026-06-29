// ============================================================
// MdUploader - MD 内容粘贴 + frontmatter 解析 (客户端组件)
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SeriesOpt { id: string; name: string; category: string }
interface VolumeOpt { id: string; title: string; order: number }
interface NovelOpt { id: string; title: string; volumes: VolumeOpt[] }

interface Props {
  series: SeriesOpt[];
  novels: NovelOpt[];
}

interface Parsed {
  frontmatter: Record<string, string>;
  body: string;
  slug: string;
  title: string;
}

function parseMd(raw: string): Parsed {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    // 无 frontmatter, 整篇是 body
    const firstLine = raw.trim().split("\n")[0].replace(/^#\s*/, "").trim();
    const slug = (firstLine || "untitled").toLowerCase().replace(/[^a-z0-9\s\u4e00-\u9fa5-]/g, "").replace(/\s+/g, "-").slice(0, 200);
    return { frontmatter: {}, body: raw, title: firstLine || "未命名", slug };
  }
  const [, fmYaml, body] = fmMatch;
  const fm: Record<string, string> = {};
  for (const line of fmYaml.split("\n")) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  const title = fm.title || body.trim().split("\n")[0].replace(/^#\s*/, "").trim() || "未命名";
  const slug = fm.slug || title.toLowerCase().replace(/[^a-z0-9\s\u4e00-\u9fa5-]/g, "").replace(/\s+/g, "-").slice(0, 200);
  return { frontmatter: fm, body: body.trim(), title, slug };
}

export function MdUploader({ series, novels }: Props) {
  const router = useRouter();
  const [md, setMd] = useState("");
  const [type, setType] = useState<"article" | "chapter">("article");
  const [category, setCategory] = useState("tech");
  const [seriesId, setSeriesId] = useState("");
  const [novelId, setNovelId] = useState("");
  const [volumeId, setVolumeId] = useState("");
  const [publish, setPublish] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);

  function handlePreview() {
    setParsed(parseMd(md));
  }

  // 选中 novel 时清空 volume
  function handleNovelChange(id: string) {
    setNovelId(id);
    setVolumeId("");
  }

  async function handleSubmit() {
    if (!md.trim()) { setResult({ ok: false, message: "内容为空" }); return; }
    setSubmitting(true); setResult(null);
    try {
      const p = parsed || parseMd(md);
      if (type === "article") {
        if (!p.slug || !p.title) { setResult({ ok: false, message: "slug/title 缺失" }); setSubmitting(false); return; }
        const res = await fetch("/api/admin/upload/article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: p.slug, title: p.title, content: p.body,
            excerpt: p.frontmatter.excerpt ?? null,
            cover_image: p.frontmatter.cover ?? null,
            category, tags: p.frontmatter.tags ?? null,
            series_id: seriesId || null,
            publish, status: publish ? "published" : "draft"
          })
        });
        const data = await res.json();
        if (!data.ok) { setResult({ ok: false, message: data.error ?? "提交失败" }); }
        else { setResult({ ok: true, message: `Post 创建成功: ${p.title}`, url: `/admin/posts/${data.post.id}/edit` }); setMd(""); setParsed(null); router.refresh(); }
      } else {
        if (!volumeId) { setResult({ ok: false, message: "请选择小说卷" }); setSubmitting(false); return; }
        if (!p.slug || !p.title) { setResult({ ok: false, message: "slug/title 缺失" }); setSubmitting(false); return; }
        const res = await fetch("/api/admin/upload/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volume_id: volumeId, slug: p.slug, title: p.title, content: p.body,
            excerpt: p.frontmatter.excerpt ?? null,
            publish
          })
        });
        const data = await res.json();
        if (!data.ok) { setResult({ ok: false, message: data.error ?? "提交失败" }); }
        else { setResult({ ok: true, message: `Chapter 创建成功: ${p.title}`, url: `/admin/novels/${novelId}/volumes/${volumeId}/chapters/${data.chapter.id}/edit` }); setMd(""); setParsed(null); router.refresh(); }
      }
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  const currentNovel = novels.find((n) => n.id === novelId);
  const volumes = currentNovel?.volumes ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">类型 *</label>
          <div className="flex gap-2">
            <button onClick={() => setType("article")} className={`rounded px-3 py-1.5 text-sm ${type === "article" ? "bg-accent text-white" : "border border-border bg-bg"}`}>📝 文章 (Post)</button>
            <button onClick={() => setType("chapter")} className={`rounded px-3 py-1.5 text-sm ${type === "chapter" ? "bg-accent text-white" : "border border-border bg-bg"}`}>📖 章节 (Chapter)</button>
          </div>
        </div>

        {type === "article" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm">
                  <option value="tech">tech</option>
                  <option value="life">life</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">系列 (可选)</label>
                <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm">
                  <option value="">— 无 —</option>
                  {series.filter((s) => s.category === category).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> 创建为已发布 (否则草稿)
            </label>
          </>
        )}

        {type === "chapter" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">小说 *</label>
              <select value={novelId} onChange={(e) => handleNovelChange(e.target.value)} className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm">
                <option value="">— 选择小说 —</option>
                {novels.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">卷 *</label>
              <select value={volumeId} onChange={(e) => setVolumeId(e.target.value)} disabled={!novelId} className="w-full rounded border border-border bg-bg px-3 py-1.5 text-sm disabled:opacity-50">
                <option value="">— 选择卷 —</option>
                {volumes.map((v) => <option key={v.id} value={v.id}>第{v.order}卷 · {v.title}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> 创建为已发布 (否则 draft)
            </label>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Markdown 内容 * <span className="text-fg-muted">(支持 --- frontmatter --- 头)</span></label>
          <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={20} placeholder={`---\ntitle: 我的文章\nslug: my-post\nexcerpt: 摘要\ncover: /media/cover.jpg\ntags: tech, react\n---\n\n# 标题\n\n正文...`} className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-mono" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePreview} className="rounded border border-border bg-bg px-3 py-1.5 text-sm">预览解析</button>
          <button onClick={handleSubmit} disabled={submitting || !md.trim()} className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "提交中..." : "提交"}
          </button>
        </div>

        {result && (
          <div className={`rounded border p-3 text-sm ${result.ok ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300" : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {result.message}
            {result.url && <a href={result.url} className="ml-2 underline">查看 →</a>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-fg-muted">frontmatter 解析预览</h2>
        {parsed ? (
          <div className="space-y-3 text-sm">
            <div className="rounded border border-border bg-bg-muted/30 p-3">
              <div className="text-xs text-fg-muted">title</div>
              <div className="font-medium">{parsed.title}</div>
            </div>
            <div className="rounded border border-border bg-bg-muted/30 p-3">
              <div className="text-xs text-fg-muted">slug</div>
              <div className="font-mono text-xs">{parsed.slug}</div>
            </div>
            <div className="rounded border border-border bg-bg-muted/30 p-3">
              <div className="text-xs text-fg-muted">frontmatter ({Object.keys(parsed.frontmatter).length} 项)</div>
              <pre className="mt-1 text-xs font-mono whitespace-pre-wrap">{JSON.stringify(parsed.frontmatter, null, 2)}</pre>
            </div>
            <div className="rounded border border-border bg-bg-muted/30 p-3">
              <div className="text-xs text-fg-muted">body (前 200 字)</div>
              <pre className="mt-1 text-xs whitespace-pre-wrap">{parsed.body.slice(0, 200)}{parsed.body.length > 200 ? "..." : ""}</pre>
            </div>
          </div>
        ) : (
          <div className="rounded border border-dashed border-border p-4 text-sm text-fg-muted">
            粘贴内容后点「预览解析」查看 frontmatter 解析结果。
          </div>
        )}
      </div>
    </div>
  );
}
