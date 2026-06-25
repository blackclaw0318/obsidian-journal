// ============================================================
// /admin/(authed)/layout.tsx - 已登录用户布局 (Phase 3.1)
// route group "(authed)" 隔离 login 页, URL 仍是 /admin/posts, /admin/novels 等
// ============================================================
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "./_components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return <AdminShell user={user}>{children}</AdminShell>;
}
