import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { portfolioProjects } from "@/lib/portfolio";
import { PrintResume } from "@/components/portfolio/PrintResume";

export const metadata: Metadata = { title: "上坤 · 项目经历简历", description: "计算机视觉、多模态评测与 AI 工程：上坤的项目经历与个人贡献。", alternates: { canonical: "/resume" } };
export default function ResumePage() {
  return <div className="resume-page"><div className="resume-tools"><Link className="text-link" href="/"><ArrowLeft size={16} />返回个人空间</Link><PrintResume /></div><header className="resume-header"><p className="eyebrow">SHANGKUN / PROJECT RESUME</p><h1>上坤<span>项目经历</span></h1><p>计算机视觉 · 多模态评测 · AI 工程</p><p className="resume-intro">从数据整理、模型实验到服务与工具交付，关注把技术变成实际可用的能力。</p><a href="https://github.com/blackclaw0318">github.com/blackclaw0318<ArrowUpRight size={16} /></a></header><section className="resume-skills"><h2>能力方向</h2><p>视觉与视频理解 / 数据与评测设计 / 模型训练与技术选型 / 服务与容器化 / 研发工具与 AI Skill</p></section><section className="resume-projects"><h2>项目经历<span>按活动时间由早到晚</span></h2>{portfolioProjects.map((project) => <article key={project.slug}><div className="resume-project-heading"><time dateTime={project.date}>{project.period.replace(/-/g, ".")}</time><h3><Link href={`/work/${project.slug}`}>{project.title}</Link></h3><span>{project.subtitle}</span></div><p>{project.summary}</p><ul>{project.contributions.map((text) => <li key={text}>{text}</li>)}</ul><p className="resume-result">交付 / {project.outcome}</p></article>)}</section><footer className="resume-note">本页为项目型简历，按工作记录整理；活动时间不等同于任职起止时间。未列出未经核实的学历、职级或业务收益。</footer></div>;
}
