// ============================================================
// /pages/[slug] - 静态页 (v0.12, v0.6.1 §8)
// 渲染 Page.blocks (JSON Block[]) 用 PageRenderer
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageRepo, siteConfigRepo } from "@/lib/repo";
import { absoluteUrl, canonical } from "@/lib/seo";
import { PageRenderer } from "@/lib/blocks/render";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const p = pageRepo.bySlug(params.slug);
  if (!p || p.status !== "published") return { title: "未找到" };
  return {
    title: p.title,
    description: p.description ?? undefined,
    alternates: { canonical: canonical(`/pages/${p.slug}`) },
    openGraph: {
      type: "website",
      title: p.title,
      description: p.description ?? undefined,
      url: absoluteUrl(`/pages/${p.slug}`),
      locale: "zh_CN"
    }
  };
}

export default function PageDetailPage({ params }: Props) {
  const page = pageRepo.bySlug(params.slug);
  if (!page || page.status !== "published") notFound();
  const site = siteConfigRepo.get();
  pageRepo.incrementView(page.id);
  const allowCustomHtml = site?.allow_custom_html === 1;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">{page.title}</h1>
        {page.description && <p className="text-lg text-fg-muted">{page.description}</p>}
      </header>

      <PageRenderer blocks={page.blocks} allowCustomHtml={allowCustomHtml} />
    </article>
  );
}
