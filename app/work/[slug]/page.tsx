import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, ArrowRight, Check } from "lucide-react";
import { portfolioProjects, projectBySlug, legacyProjectSlugs, canonicalProjectSlug } from "@/lib/portfolio";
import { AvatarStage } from "@/components/portfolio/AvatarStage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...portfolioProjects.map((project) => project.slug), ...Object.keys(legacyProjectSlugs)].map((slug) => ({ slug }));
}
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const project = projectBySlug(params.slug);
  return project ? { title: `${project.title} · 上坤的项目经历`, description: project.summary, alternates: { canonical: `/work/${project.slug}` } } : {};
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const canonical = canonicalProjectSlug(params.slug);
  if (canonical !== params.slug) permanentRedirect(`/work/${canonical}`);
  const project = projectBySlug(params.slug);
  if (!project) notFound();
  const index = portfolioProjects.findIndex((item) => item.slug === project.slug);
  const next = portfolioProjects[(index + 1) % portfolioProjects.length];
  return <article className="project-detail">
    <Link className="text-link detail-back" href={`/#${project.slug}`}><ArrowLeft size={16} />返回工作经历</Link>
    <div className="detail-hero"><div><p className="eyebrow">PROJECT {String(index + 1).padStart(2, "0")} / {project.subtitle}</p><h1>{project.title}</h1><p className="detail-summary">{project.summary}</p><div className="chapter-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><dl className="detail-meta"><div><dt>项目活动时间</dt><dd>{project.period.replace(/-/g, ".")}</dd></div><div><dt>工作方向</dt><dd>{project.subtitle}</dd></div></dl></div><div className="detail-avatar"><AvatarStage /></div></div>
    <div className="detail-body"><div className="detail-side"><span>THE STORY</span><p>从问题出发，<br />到一个可用的答案。</p></div><div><section><p className="eyebrow">01 / CONTEXT</p><h2>在解决什么问题</h2><p>{project.context}</p></section><section><p className="eyebrow">02 / MY CONTRIBUTION</p><h2>我在其中做了什么</h2><ol className="contribution-list">{project.contributions.map((text, i) => <li key={text}><span>{String(i + 1).padStart(2, "0")}</span><p>{text}</p></li>)}</ol></section><section><p className="eyebrow">03 / PROJECT STAGES</p><h2>工作推进的阶段</h2><ol className="contribution-list">{project.phases.map((phase) => <li key={`${phase.period}-${phase.title}`}><span>{phase.period.replace(/-/g, ".")}</span><div><h3>{phase.title}</h3><p>{phase.summary}</p></div></li>)}</ol></section><section><p className="eyebrow">04 / DELIVERY</p><h2>留下了什么</h2><div className="delivery-note"><Check size={24} /><p>{project.outcome}</p></div><p className="delivery-status">{project.status}</p></section><p className="experience-note">{project.scope} 这里记录本人参与的工作与交付，项目介绍已做公开化整理。时间表示材料可确认的活动阶段。</p></div></div>
    <Link className="next-project" href={`/work/${next.slug}`}><div><span>NEXT CHAPTER</span><h2>{next.title}</h2></div><ArrowUpRight size={38} strokeWidth={1} /></Link><Link className="text-link detail-resume" href="/resume">查看完整简历视图<ArrowRight size={17} /></Link>
  </article>;
}
