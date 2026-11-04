"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, ArrowRight, Code2, ScanEye, Shapes, FileText, Github } from "lucide-react";
import { AvatarStage } from "./AvatarStage";
import { portfolioProjects, projectCategories, type ProjectCategory } from "@/lib/portfolio";

interface Article { slug: string; title: string; category: string; date: string; }

export function PortfolioHome({ articles }: { articles: Article[] }) {
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [active, setActive] = useState<string | null>(null);
  const chapters = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const projects = portfolioProjects.filter((project) => filter === "all" || project.category === filter);
  const project = portfolioProjects.find((item) => item.slug === active);

  useEffect(() => {
    const host = chapters.current;
    if (!host) return;
    const update = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      // On phones the compact character stays above the reading area.
      const readingTop = mobile ? 88 + (stage.current?.clientHeight ?? 164) : 110;
      const threshold = Math.max(window.innerHeight * .48, readingTop + 48);
      let nearest: string | null = null; let distance = Infinity;
      host.querySelectorAll<HTMLElement>("[data-project]").forEach((element) => {
        const box = element.getBoundingClientRect();
        if (box.top < window.innerHeight * .78 && box.bottom > readingTop) {
          const nextDistance = Math.abs(box.top + Math.min(box.height * .35, 200) - threshold);
          if (nextDistance < distance) { distance = nextDistance; nearest = element.dataset.project ?? null; }
        }
      });
      setActive(nearest);
    };
    let frame = 0;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { update(); frame = 0; }); };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, [filter]);

  return (
    <div className="portfolio-page">
      <div className="portfolio-topline"><span>AI ENGINEERING & CREATIVE EXPLORATION</span><span>让好奇心，落到实处 <span aria-hidden="true">↗</span></span></div>
      <div className="journey-layout">
        <div className="journey-content">
          <section className="portfolio-hero" aria-labelledby="intro-heading">
            <p className="eyebrow"><span className="tiny-square" />你好，我是上坤 <span className="hero-hand" aria-hidden="true">✳</span></p>
            <h1 id="intro-heading">认真做技术，<br />也做点<span className="word-highlight">有趣的。</span></h1>
            <p className="hero-intro">在模型、代码与真实问题之间，<br className="desktop-break" />把好奇心变成一个个能用的东西。</p>
            <div className="hero-disciplines"><span>计算机视觉</span><i />多模态评测<i />AI 工程</div>
            <div className="hero-actions"><a className="button-ink" href="#experience">翻翻我的经历<ArrowDown size={17} /></a><Link className="text-link" href="/resume">简历视图<FileText size={16} /></Link></div>
            <div className="hero-footnote"><span className="hand-drawn-arrow" aria-hidden="true">↗</span><span>右边这个，是另一个我。<br /><strong>试试移动鼠标，或者换个表情。</strong></span></div>
            <div className="hero-index"><span>01 / ABOUT ME</span><a href="#experience" aria-label="向下查看项目经历"><ArrowDown size={18} /></a></div>
          </section>
          <section id="experience" className="experience-section" aria-labelledby="experience-title">
            <div className="section-kicker"><span>02 / SELECTED EXPERIENCE</span><span>{String(portfolioProjects.length).padStart(2, "0")} CHAPTERS</span></div>
            <h2 id="experience-title">代码背后，<br /><span className="serif-italic">是这些故事。</span></h2>
            <p className="section-intro">从一次问题出发，到一个方案落地。<br />沿着时间，看看我在其中做了什么。</p>
            <div className="project-filters" role="group" aria-label="筛选项目经历">{projectCategories.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setActive(null); }}>{item.label}</button>)}</div>
            <div className="timeline" ref={chapters}>
              {projects.map((item) => {
                const index = portfolioProjects.findIndex((candidate) => candidate.slug === item.slug);
                const Icon = item.category === "vision" ? ScanEye : item.category === "multimodal" ? Shapes : Code2;
                return <article key={item.slug} id={item.slug} className={`project-chapter${active === item.slug ? " is-active" : ""}`} data-project={item.slug}>
                  <div className="timeline-date"><span className="timeline-dot" /><time dateTime={item.date}>{item.period.replace(/-/g, ".")}</time><span className="chapter-number">CH.{String(index + 1).padStart(2, "0")}</span></div>
                  <div className="chapter-symbol" aria-hidden="true"><Icon size={25} strokeWidth={1.4} /></div><p className="chapter-category">{item.subtitle}</p>
                  <h3><Link href={`/work/${item.slug}`}>{item.title}</Link></h3><p className="chapter-summary">{item.summary}</p>
                  <div className="chapter-contribution"><span>我的工作</span><p>{item.contributions[0]}</p></div>
                  <div className="chapter-tags">{item.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <Link className="chapter-link" href={`/work/${item.slug}`}>展开这段经历<ArrowUpRight size={19} /></Link>
                </article>;
              })}
            </div>
            <div className="timeline-end"><span>TO BE CONTINUED</span><p>下一个故事，正在发生。</p><span aria-hidden="true">✳</span></div>
          </section>
        </div>
        <aside ref={stage} className={`journey-stage${project ? " has-project" : ""}`} aria-label="随项目变化的虚拟角色"><AvatarStage scene={project?.scene ?? "hello"} chapter={project?.title} /><div className="stage-bottom-note"><span>BUILT WITH CURIOSITY.</span><span>保持好奇 / 持续创造</span></div></aside>
      </div>
      <section className="portfolio-capabilities" aria-labelledby="approach-title">
        <div className="section-kicker"><span>03 / HOW I WORK</span><span>从想法到交付</span></div><h2 id="approach-title">不止让它跑起来。<br /><span>还要知道，为什么。</span></h2>
        <div className="capability-grid"><div><span>01</span><ScanEye size={28} strokeWidth={1.2} /><h3>先看清问题</h3><p>从数据与真实场景出发，找到任务边界，再讨论模型和方法。</p></div><div><span>02</span><Shapes size={28} strokeWidth={1.2} /><h3>用实验说话</h3><p>对齐评测口径，记录对照与失败，让每一次技术选择都有依据。</p></div><div><span>03</span><Code2 size={28} strokeWidth={1.2} /><h3>把经验留下来</h3><p>将研发过程沉淀为服务、工具和文档，让成果更容易复用。</p></div></div>
      </section>
      <section className="portfolio-journal" aria-labelledby="journal-title">
        <div className="journal-heading"><div><p className="eyebrow">04 / BEYOND THE CODE</p><h2 id="journal-title">工作之外，也有自己的宇宙。</h2></div><Link className="text-link" href="/posts">所有文章<ArrowUpRight size={17} /></Link></div>
        <div className="journal-entries">{articles.length > 0 ? articles.map((article) => <Link key={article.slug} href={`/posts/${article.slug}`}><span>{article.category === "tech" ? "技术笔记" : "生活随笔"}</span><h3>{article.title}</h3><time>{article.date}</time><ArrowUpRight size={21} /></Link>) : <Link href="/posts"><span>JOURNAL</span><h3>想法、探索与日常记录</h3><ArrowUpRight size={21} /></Link>}</div>
        <div className="world-links"><Link href="/novels">写下的故事<span>小说<ArrowUpRight size={17} /></span></Link><Link href="/videos">另一种表达<span>视频<ArrowUpRight size={17} /></span></Link><Link href="/resources">好东西一起分享<span>资源<ArrowUpRight size={17} /></span></Link></div>
      </section>
      <section className="portfolio-outro"><span className="outro-spark" aria-hidden="true">✳</span><p>如果你也对技术和有趣的东西好奇</p><h2>那就，<span className="serif-italic">保持联系。</span></h2><a className="button-ink" href="https://github.com/blackclaw0318" target="_blank" rel="noopener noreferrer"><Github size={18} />在 GitHub 找到我<ArrowUpRight size={17} /></a><Link className="outro-next" href="/resume">或者，先读读我的简历<ArrowRight size={17} /></Link><div className="outro-wordmark" aria-hidden="true">SHANGKUN.</div></section>
    </div>
  );
}
