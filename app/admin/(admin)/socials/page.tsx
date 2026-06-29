// ============================================================
// /admin/socials - 友链/社交管理 (v0.11, v0.6.1 §7.2)
// ============================================================
import { socialRepo } from "@/lib/repo";
import { SocialsManager } from "./_components/SocialsManager";

export const dynamic = "force-dynamic";

const PLATFORMS = ["github", "twitter", "email", "wechat", "bilibili", "zhihu", "rss", "custom"];

export default function SocialsListPage() {
  // 序列化转 plain object (跨 server→client 边界不能传 null prototype 对象)
  const items = socialRepo.list(false).map((s) => ({ ...s }));
  const total = socialRepo.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔗 友链 / 社交管理</h1>
        <p className="mt-1 text-sm text-fg-muted">共 <strong>{total}</strong> 个链接(可见 + 隐藏)</p>
      </div>

      <SocialsManager items={items} platforms={PLATFORMS} />
    </div>
  );
}
