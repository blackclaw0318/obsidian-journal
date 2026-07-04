// ============================================================
// /media → /resources 301 重定向 (v0.34 Phase 4)
// 保留旧 URL 的 SEO + 用户书签兼容
// ============================================================
import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function MediaRedirectPage({
  searchParams
}: {
  searchParams: { type?: string; q?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.type) params.set("type", searchParams.type);
  if (searchParams.q) params.set("q", searchParams.q);
  const qs = params.toString();
  redirect(`/resources${qs ? "?" + qs : ""}`);
}