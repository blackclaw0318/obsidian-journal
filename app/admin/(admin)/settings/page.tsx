// ============================================================
// /admin/settings - SiteConfig UI (Phase 3.8, v0.15)
// Server Component: 加载配置 + 渲染 SettingsForm
// ============================================================

import { siteConfigRepo } from "@/lib/repo";
import { SettingsForm } from "./_components/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "站点设置 · Admin" };

export default function SettingsPage() {
  const config = siteConfigRepo.get() ?? {
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