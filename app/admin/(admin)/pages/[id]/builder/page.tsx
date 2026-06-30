// ============================================================
// /admin/pages/[id]/builder - Page Builder v0.6.1 §21 (v0.14)
// Server Component: 查 page, 转交 Client PageBuilder
// ============================================================

import { notFound } from "next/navigation";
import { pageRepo, siteConfigRepo } from "@/lib/repo";
import { PageBuilder } from "./_components/PageBuilder";

export const dynamic = "force-dynamic";

export default function PageBuilderPage({ params }: { params: { id: string } }) {
  const page = pageRepo.byId(params.id);
  if (!page) notFound();

  const siteConfig = siteConfigRepo.get();
  const allowCustomHtml = siteConfig?.allow_custom_html === 1;

  return (
    <PageBuilder
      pageId={page.id}
      pageSlug={page.slug}
      pageTitle={page.title}
      initialBlocksJson={page.blocks}
      allowCustomHtml={allowCustomHtml}
    />
  );
}
