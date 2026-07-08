// ============================================================
// SettingsForm - 站点设置表单 (Phase 3.8, v0.15 + v0.31 P2-20/21)
// Client Component: 4 分组 (基本 / 外观 / 功能 / SEO + 分析)
// v0.31 改造: favicon + og_image 改用专用上传组件 (P2-20/21)
// ============================================================

"use client";

import { useState } from "react";
import type { SiteConfig } from "@/lib/types";
import { AvatarUpload } from "./AvatarUpload";
import { FaviconUpload } from "./FaviconUpload";
import { OgImageUpload } from "./OgImageUpload";

const inputCls = "w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-fg focus:outline-none disabled:opacity-50";
const labelCls = "mb-1 block text-sm font-medium";

export function SettingsForm({ initial }: { initial: SiteConfig }) {
  const [data, setData] = useState<SiteConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const update = <K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) => setData((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site_name: data.site_name,
          site_tagline: data.site_tagline,
          site_description: data.site_description,
          site_keywords: data.site_keywords,
          default_theme: data.default_theme,
          allow_custom_html: data.allow_custom_html,
          baidu_push_enabled: data.baidu_push_enabled,
          baidu_push_token: data.baidu_push_token,
          analytics: data.analytics,
          // v0.38 P5.5: 版权声明 6 字段
          site_license: data.site_license,
          site_license_url: data.site_license_url,
          copyright_holder: data.copyright_holder,
          aigc_disclosure: data.aigc_disclosure,
          copyright_page_md: data.copyright_page_md,
          contact_email: data.contact_email
          // 注意: avatar_url / favicon / og_image 由专用上传端点处理, 不在此处保存
        })
      });
      const j = await res.json();
      if (j.ok) {
        setMsg({ kind: "ok", text: "✅ 已保存" });
        setData(j.config);
      } else {
        setMsg({ kind: "err", text: `❌ ${j.error ?? "未知错误"}` });
      }
    } catch (e) {
      setMsg({ kind: "err", text: `❌ 网络错误: ${(e as Error).message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Section title="📝 基本信息">
        <Field label="头像 (公开首页显示, 圆形 96×96)">
          <AvatarUpload currentUrl={initial.avatar_url} />
        </Field>
        <Field label="站点名称">
          <input className={inputCls} value={data.site_name} onChange={(e) => update("site_name", e.target.value)} maxLength={100} />
        </Field>
        <Field label="站点副标题 (tagline)">
          <input className={inputCls} value={data.site_tagline} onChange={(e) => update("site_tagline", e.target.value)} maxLength={200} />
        </Field>
        <Field label="站点描述 (SEO description)">
          <textarea className={`${inputCls} min-h-[60px]`} value={data.site_description ?? ""} onChange={(e) => update("site_description", e.target.value || null)} maxLength={500} />
        </Field>
        <Field label="关键词 (逗号分隔)">
          <input className={inputCls} value={data.site_keywords ?? ""} onChange={(e) => update("site_keywords", e.target.value || null)} placeholder="例如: 博客, 摄影, 随笔" />
        </Field>
      </Section>

      {/* 外观 */}
      <Section title="🎨 外观">
        <Field label="默认主题">
          <div className="flex gap-2">
            {(["light", "dark", "auto"] as const).map((t) => (
              <label key={t} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded border px-3 py-2 text-sm ${data.default_theme === t ? "border-fg bg-fg/5 font-medium" : "border-border"}`}>
                <input type="radio" name="theme" value={t} checked={data.default_theme === t} onChange={() => update("default_theme", t)} className="sr-only" />
                <span>{t === "light" ? "☀️ 亮色" : t === "dark" ? "🌙 暗色" : "🖥️ 自动"}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* 功能开关 */}
      <Section title="⚙️ 功能开关">
        <Switch
          label="允许自定义 HTML Block"
          hint="(Page Builder 中的 CustomHtml 受此开关控制,关闭时即使内容含 HTML 也会被拒绝)"
          checked={data.allow_custom_html === 1}
          onChange={(v) => update("allow_custom_html", v ? 1 : 0)}
        />
        <Switch
          label="启用百度推送"
          hint="(发文后自动推送到百度站长)"
          checked={data.baidu_push_enabled === 1}
          onChange={(v) => update("baidu_push_enabled", v ? 1 : 0)}
        />
        {data.baidu_push_enabled === 1 && (
          <Field label="百度推送 token">
            <input className={inputCls} value={data.baidu_push_token ?? ""} onChange={(e) => update("baidu_push_token", e.target.value || null)} placeholder="百度站长平台的推送 token" />
          </Field>
        )}
      </Section>

      {/* SEO + 媒体 (v0.31 改造: favicon/og_image 用专用上传组件) */}
      <Section title="🔍 SEO & 媒体">
        <Field label="Favicon (浏览器 tab 图标, 64×64 webp)">
          <FaviconUpload currentUrl={initial.favicon} />
        </Field>
        <Field label="OG Image (社交分享卡片图, 1200×630)">
          <OgImageUpload currentUrl={initial.og_image} avatarUrl={initial.avatar_url} />
        </Field>
        <div className="rounded border border-border bg-bg-base px-3 py-2 text-xs text-fg-muted">
          💡 <strong>og_image fallback 规则</strong>: 文章有 <code>cover_image</code> 时优先用文章封面;
          否则用 <code>SiteConfig.og_image</code>;
          再否则用 <code>SiteConfig.avatar_url</code> (P2-21 默认行为)。
        </div>
      </Section>

      {/* 分析 */}
      <Section title="📊 分析">
        <Field label="Analytics 代码 (GA / Plausible / Umami)">
          <textarea
            className={`${inputCls} min-h-[80px] font-mono text-xs`}
            value={data.analytics ?? ""}
            onChange={(e) => update("analytics", e.target.value || null)}
            placeholder='<script async src="https://www.googletagmanager.com/..."></script>'
          />
        </Field>
      </Section>

      {/* v0.38 P7: 版权设置 */}
      <Section title="📜 版权设置 (v0.38 P5.5)">
        <Field label="整站 License (如 CC BY-NC-SA 4.0)">
          <input className={inputCls} value={data.site_license} onChange={(e) => update("site_license", e.target.value)} maxLength={100} placeholder="CC BY-NC-SA 4.0" />
        </Field>
        <Field label="License URL">
          <input className={inputCls} value={data.site_license_url} onChange={(e) => update("site_license_url", e.target.value)} placeholder="https://creativecommons.org/licenses/by-nc-sa/4.0/" />
        </Field>
        <Field label="版权持有人 (如 上坤 / Shangkun)">
          <input className={inputCls} value={data.copyright_holder} onChange={(e) => update("copyright_holder", e.target.value)} maxLength={100} placeholder="上坤" />
        </Field>
        <Switch
          label="AI 辅助生成披露 (AIGC Disclosure)"
          hint="(开启后, 文章/章节末尾自动声明 AI 生成, 符合中国《生成式 AI 服务管理办法》)"
          checked={data.aigc_disclosure === 1}
          onChange={(v) => update("aigc_disclosure", v ? 1 : 0)}
        />
        <Field label="联系邮箱 (显示在 /copyright 页)">
          <input className={inputCls} value={data.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="your@email.com" />
        </Field>
        <Field label="/copyright 页 Markdown (留空用默认)">
          <textarea
            className={`${inputCls} min-h-[200px] font-mono text-xs`}
            value={data.copyright_page_md ?? ""}
            onChange={(e) => update("copyright_page_md", e.target.value)}
            placeholder="# 版权声明... (留空用默认 5 段内容)"
          />
        </Field>
        <div className="rounded border border-border bg-bg-base px-3 py-2 text-xs text-fg-muted">
          💡 <strong>/copyright 页预览</strong>:{" "}
          <a href="/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            在新标签打开
          </a>
          (保存后刷新生效)
        </div>
      </Section>

      {/* 操作栏 */}
      <div className="sticky bottom-0 flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3">
        <div className="text-sm">{msg?.text ?? ""}</div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded bg-fg px-6 py-2 text-sm font-medium text-bg hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "保存中..." : "💾 保存全部"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-bg-card p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded border border-border bg-bg-base px-4 py-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-fg-muted">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-fg" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </label>
  );
}
