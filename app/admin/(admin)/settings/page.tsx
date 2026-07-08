// ============================================================
// /admin/settings - SiteConfig UI (Phase 3.8, v0.15)
// Server Component: 加载配置 + 渲染 SettingsForm
// ============================================================

import { siteConfigRepo } from "@/lib/repo";
import { SettingsForm } from "./_components/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "站点设置 · Admin" };

export default function SettingsPage() {
  const raw = siteConfigRepo.get();
  // ⚠️ 关键: better-sqlite3 row 是 null-prototype 对象, Next.js RSC 禁止跨 server→client 边界传递.
  // 必须先序列化为 plain object (Server Component 的返回值要可序列化).
  const config = raw
    ? {
        id: raw.id,
        site_name: raw.site_name,
        site_tagline: raw.site_tagline,
        site_description: raw.site_description,
        site_keywords: raw.site_keywords,
        default_theme: raw.default_theme,
        allow_custom_html: raw.allow_custom_html,
        baidu_push_enabled: raw.baidu_push_enabled,
        baidu_push_token: raw.baidu_push_token,
        og_image: raw.og_image,
        favicon: raw.favicon,
        analytics: raw.analytics,
        avatar_url: raw.avatar_url,
        // v0.38 P5.5: 版权声明 6 字段
        site_license: raw.site_license,
        site_license_url: raw.site_license_url,
        copyright_holder: raw.copyright_holder,
        aigc_disclosure: raw.aigc_disclosure,
        copyright_page_md: raw.copyright_page_md,
        contact_email: raw.contact_email,
        updated_at: raw.updated_at
      }
    : {
        id: "singleton",
        site_name: "黑曜石日志",
        site_tagline: "用代码与数据说话",
        site_description: null,
        site_keywords: null,
        default_theme: "light" as const,
        allow_custom_html: 0 as const,
        baidu_push_enabled: 0 as const,
        baidu_push_token: null,
        og_image: null,
        favicon: null,
        analytics: null,
        avatar_url: null,
        site_license: "CC BY-NC-SA 4.0",
        site_license_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        copyright_holder: "上坤",
        aigc_disclosure: 1 as const,
        copyright_page_md: "",
        contact_email: "",
        updated_at: 0
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚙️ 站点设置</h1>
        <p className="mt-1 text-xs text-fg-muted">单例配置 (singleton) · 最后更新 {config.updated_at ? new Date(config.updated_at * 1000).toLocaleString() : "从未"}</p>
      </div>
      <SettingsForm initial={config} />
    </div>
  );
}