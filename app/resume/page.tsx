import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { portfolioProjects } from "@/lib/portfolio";
import { PrintResume } from "@/components/portfolio/PrintResume";

export const metadata: Metadata = { title: "上坤 · 工作经历", description: "按项目归并的工作经历：视频理解、图像质量、AI 交付工作流与文档解析。", alternates: { canonical: "/resume" } };
export default function ResumePage() {
  return <div className="resume-page">
    <div className="resume-tools"><Link className="text-link" href="/#work"><ArrowLeft size={16} />返回工作经历</Link><PrintResume /></div>
    <header className="resume-header">
      <p className="eyebrow">SHANGKUN / SELECTED WORK</p><h1>上坤<span>工作经历</span></h1>
      <p>计算机视觉 · 多模态评测 · AI 工程</p>
      <p className="resume-intro">按四个项目方向归并已核验的工作记录，展示数据、实验与交付中的本人贡献。</p>
      <a href="https://github.com/blackclaw0318">github.com/blackclaw0318<ArrowUpRight size={16} /></a>
    </header>
    <section className="resume-skills"><h2>能力方向</h2><p>视觉与视频理解 / 数据与评测设计 / 模型训练与技术选型 / 服务与容器化 / 研发工具与 AI Skill</p></section>
    <section className="resume-projects">
      <h2>重点项目<span>按最早可确认活动时间排列</span></h2>
      {portfolioProjects.map((project) => <article key={project.slug}>
        <div className="resume-project-heading"><time dateTime={project.date}>{project.period.replace(/-/g, ".")}</time><h3><Link href={`/work/${project.slug}`}>{project.title}</Link></h3><span>{project.subtitle}</span></div>
        <p>{project.summary}</p><ul>{project.contributions.map((text) => <li key={text}>{text}</li>)}</ul>
        <p className="resume-result">交付 / {project.outcome}<br />状态 / {project.status}</p>
        <p className="resume-note">{project.scope}</p>
      </article>)}
    </section>
    <footer className="resume-note">本页按项目归并本人参与的工作记录；分阶段活动时间不等同于连续投入或任职起止。未列出未经核实的学历、职级或业务收益。</footer>
  </div>;
}
