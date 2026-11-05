import type { Metadata } from "next";
import { postRepo } from "@/lib/repo";
import { PortfolioHome } from "@/components/portfolio/PortfolioHome";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "上坤 · 我有很多面，来认识一下",
  description: "上坤的个人空间：计算机视觉、多模态评测、AI 工程与项目经历，也有代码之外的故事。",
  alternates: { canonical: "/" }
};

export default function HomePage() {
  const articles = postRepo.list({ status: "published", limit: 3 }).map((post) => ({
    slug: post.slug, title: post.title, category: post.category,
    date: formatDate(new Date((post.published_at ?? post.created_at) * 1000))
  }));
  return <PortfolioHome articles={articles} />;
}
