"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowDown, ArrowUpRight, Code2, FileText, Github, ScanEye, Shapes } from "lucide-react";
import { AvatarStage } from "./AvatarStage";
import { portfolioProjects, projectCategories, legacyProjectSlugs, type ProjectCategory } from "@/lib/portfolio";
import { avatarDomains, type AvatarDomain } from "@/lib/avatar-world";

interface Article { slug: string; title: string; category: string; date: string; }

export function PortfolioHome({ articles }: { articles: Article[] }) {
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [focus, setFocus] = useState<AvatarDomain>("all");
  const selectDomain = useCallback((domain: AvatarDomain) => setFocus(domain), []);
  const domain = avatarDomains.find(item => item.id === focus);
  const projects = portfolioProjects.filter(project => filter === "all" || project.category === filter);
  return <div className="portfolio-page sticker-world-page">
    <div className="world-topline"><span>SHANGKUN’S LITTLE UNIVERSE</span><span>一个人，当然不止一个标签 <span aria-hidden="true">↗</span></span></div>
    <section className="world-hero" id="explore" aria-labelledby="intro-heading">
      <div className="world-hero-copy">
        <p className="eyebrow"><span className="tiny-square" />HEY, I’M SHANGKUN.</p>
        <h1 id="intro-heading">我有很多面，<br /><span>来认识一下。</span></h1>
        <p className="world-intro">认真写代码，也认真对世界好奇。<br />选一张贴纸，换个角度认识我。</p>
        <div className="domain-picker" role="group" aria-label="探索我的不同领域">
          {avatarDomains.map((item, index) => <button key={item.id} type="button" className={`domain-chip domain-${item.id}`} aria-label={`探索${item.label}`} aria-pressed={focus === item.id} onClick={() => selectDomain(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.word}<ArrowUpRight size={13} /></button>)}
        </div>
        <div className={`domain-story${domain ? " is-selected" : ""}`} aria-live="polite" data-testid="domain-story">
          <p className="domain-story-kicker">{domain ? `${domain.word} / ${domain.label}` : "PICK A STICKER. MEET ANOTHER SIDE."}</p>
          <h2>{domain?.title ?? "标签只是入口，故事在后面。"}</h2>
          <p>{domain?.description ?? "脸上的贴纸可以点，手里的道具也有小机关。你负责好奇，我负责接住。"}</p>
          {domain ? <Link className="text-link" href={domain.href}>{domain.link}<ArrowUpRight size={16} /></Link> : <Link className="text-link" href="#work">先看看工作经历<ArrowDown size={16} /></Link>}
        </div>
      </div>
      <AvatarStage focus={focus} onFocus={selectDomain} />
      <div className="world-hero-footer"><span>NOT JUST ONE LABEL.</span><Link href="#work">继续往下，进入工作现场<ArrowDown size={16} /></Link><span aria-hidden="true">SCROLL TO EXPLORE</span></div>
    </section>
    <section id="work" className="work-overview" aria-labelledby="work-title">
      <span id="experience" className="hash-alias" aria-hidden="true" />
      <div className="section-kicker"><span>01 / SELECTED WORK</span><Link href="/resume">简历视图<FileText size={14} /></Link></div>
      <div className="work-heading"><h2 id="work-title">工作经历<span className="work-heading-star" aria-hidden="true">✳</span></h2><p>从问题出发，把方法做成能用的东西。<br />四个重点项目，看看我在其中做了什么。</p></div>
      <div className="project-filters" role="group" aria-label="筛选工作项目">{projectCategories.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      <div className="work-project-list">
        {projects.map(item => {
          const index = portfolioProjects.findIndex(candidate => candidate.slug === item.slug);
          const Icon = item.category === "vision" ? ScanEye : item.category === "multimodal" ? Shapes : Code2;
          return <article key={item.slug} id={item.slug} className="work-project" data-project={item.slug}>
            {Object.entries(legacyProjectSlugs).filter(([, target]) => target === item.slug).map(([slug]) => <span key={slug} id={slug} className="hash-alias" aria-hidden="true" />)}
            <div className="work-project-index"><span>{String(index + 1).padStart(2, "0")}</span><Icon size={25} strokeWidth={1.5} /></div>
            <div className="work-project-main"><p className="work-project-meta">{item.subtitle}<span> / </span><time dateTime={item.date}>{item.period.replace(/-/g, ".")}</time></p><h3><Link href={`/work/${item.slug}`}>{item.title}</Link></h3><p className="work-project-summary">{item.summary}</p><div className="work-contribution"><span>我做了什么</span><p>{item.contributions[0]}</p></div><div className="chapter-tags">{item.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div>
            <Link className="work-project-open" href={`/work/${item.slug}`} aria-label={`展开${item.title}`}><span>查看项目</span><ArrowUpRight size={24} /></Link>
          </article>;
        })}
      </div>
      <p className="work-source-note">以项目为线索，记录数据、实验与交付。持续更新中。</p>
    </section>
    <section className="world-journal" aria-labelledby="journal-title">
      <div className="section-kicker"><span>02 / OUTSIDE THE BRACKETS</span><Link href="/posts">所有文章<ArrowUpRight size={15} /></Link></div>
      <div className="world-section-heading"><h2 id="journal-title">不写代码的时候<span aria-hidden="true">↗</span></h2><p>把生活里的小事，也认真收好。</p></div>
      <div className="journal-entries">{articles.length ? articles.map(article => <Link key={article.slug} href={`/posts/${article.slug}`}><span>{article.category === "tech" ? "技术笔记" : "生活随笔"}</span><h3>{article.title}</h3><time>{article.date}</time><ArrowUpRight size={21} /></Link>) : <Link href="/posts"><span>JOURNAL</span><h3>想法、探索与日常记录</h3><ArrowUpRight size={21} /></Link>}</div>
      <div className="world-doorways"><Link href="/novels"><span>LET’S IMAGINE.</span><h3>故事还没完<span>↗</span></h3><p>小说与想象力</p></Link><Link href="/videos"><span>PRESS PLAY.</span><h3>换一种表达<span>↗</span></h3><p>视频与影像</p></Link><Link href="/resources"><span>GOOD STUFF.</span><h3>好东西共享<span>↗</span></h3><p>资源与收藏</p></Link></div>
    </section>
    <section className="world-outro"><span className="outro-label">STAY CURIOUS.</span><h2>很高兴，<br />我们在这里遇见。</h2><a className="button-ink" href="https://github.com/blackclaw0318" target="_blank" rel="noopener noreferrer"><Github size={18} />在 GitHub 找到我<ArrowUpRight size={17} /></a><div className="world-wordmark" aria-hidden="true">SHANGKUN<span>✳</span></div></section>
  </div>;
}
