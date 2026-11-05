"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { ArrowDown, ArrowUpRight, FileText, Github } from "lucide-react";
import { AvatarStage } from "./AvatarStage";
import { useAvatarStory } from "./useAvatarStory";
import { portfolioProjects, projectCategories, legacyProjectSlugs, type ProjectCategory } from "@/lib/portfolio";
import { avatarDomains, initialAvatarScrollPose, type AvatarDomain, type AvatarShot } from "@/lib/avatar-world";

interface Article { slug: string; title: string; category: string; date: string; }
const projectShots: AvatarShot[] = ["delivery", "videoWork", "document", "vision"];

export function PortfolioHome({ articles }: { articles: Article[] }) {
  const root = useRef<HTMLDivElement>(null);
  const scrollSource = useRef({ ...initialAvatarScrollPose });
  const lenis = useLenis();
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");
  const [focus, setFocus] = useState<AvatarDomain>("all");
  const [chapter, setChapter] = useState(0);
  const trackChapter = useCallback((domain: AvatarDomain, index: number) => { setFocus(domain); setChapter(index); }, []);
  useAvatarStory(root, scrollSource, trackChapter, filter);
  const selectDomain = useCallback((domain: AvatarDomain) => {
    setFocus(domain);
    const target = document.getElementById(domain === "all" ? "explore" : domain === "work" ? "work-intro" : `domain-${domain}`);
    if (!target) return;
    const top = window.scrollY + target.getBoundingClientRect().top;
    const destination = Math.max(0, top - Math.max(0, (window.innerHeight - target.offsetHeight) / 2));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (lenis) lenis.scrollTo(destination, { immediate: reduced, duration: .95 });
    else window.scrollTo({ top: destination, behavior: reduced ? "instant" : "smooth" });
  }, [lenis]);
  const projects = portfolioProjects.filter(project => filter === "all" || project.category === filter);
  return <div ref={root} className="portfolio-page cinema-home" data-chapter={chapter}>
    <AvatarStage cinematic scrollSource={scrollSource} focus={focus} onFocus={selectDomain} />
    <div className="cinema-grain" aria-hidden="true" />
    <nav className="cinema-domains" aria-label="探索我的不同领域">
      {avatarDomains.map((item, index) => <button key={item.id} type="button" aria-label={`探索${item.label}`} aria-pressed={focus === item.id} onClick={() => selectDomain(item.id)}><span className="cinema-domain-number">0{index + 1}</span><span className="cinema-domain-word">{item.word}</span><span className="cinema-domain-label">{item.label}</span></button>)}
    </nav>
    <div className="cinema-scroll-story">
      <section id="explore" className="cinema-frame cinema-intro" data-cinema-frame data-shot="portrait" aria-labelledby="intro-heading">
        <div className="cinema-intro-copy">
          <p className="cinema-eyebrow">HEY, I’M SHANGKUN.</p>
          <h1 id="intro-heading">我有很多面，来认识一下。</h1>
          <p>认真写代码，也认真对世界好奇。</p>
          <Link href="#domain-coder" className="cinema-scroll-invitation">往下滚动，换个角度认识我<ArrowDown size={15} /></Link>
        </div>
        <span className="cinema-edition" aria-hidden="true">A PORTRAIT IN MANY PARTS / 2026</span>
      </section>
      <section id="domain-coder" className="cinema-frame" data-cinema-frame data-shot="coder" aria-labelledby="coder-title">
        <div className="cinema-story-panel">
          <p className="cinema-eyebrow">01 / CODER</p><h2 id="coder-title">用代码，<br />把想法变成现实。</h2>
          <p>计算机视觉、多模态评测、AI 工程。关心一个方法是否有效，也关心它能不能真正用起来。</p>
          <p className="cinema-small-note">从数据准备与实验评测，到服务开发和交付，把问题一步步做扎实。</p>
          <Link href="#work" className="cinema-link">看看我做过的项目<ArrowDown size={16} /></Link>
        </div>
      </section>
      <section id="work" className="cinema-work" aria-labelledby="work-title">
        <span id="experience" className="hash-alias" aria-hidden="true" />
        <div id="work-intro" className="cinema-frame cinema-work-intro" data-cinema-frame data-shot="work">
          <div className="cinema-story-panel">
            <p className="cinema-eyebrow">02 / SELECTED WORK</p><h2 id="work-title">工作经历</h2>
            <p>从问题出发，把方法做成能用的东西。四个重点项目，看看我在其中做了什么。</p>
            <Link className="cinema-link" href="/resume">简历视图<FileText size={15} /></Link>
            <div className="project-filters" role="group" aria-label="筛选工作项目">{projectCategories.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
            <p className="cinema-small-note">以项目为线索，记录数据、实验与交付。持续更新中。</p>
          </div>
        </div>
        {projects.map(item => {
          const index = portfolioProjects.findIndex(candidate => candidate.slug === item.slug);
          return <article key={item.slug} id={item.slug} className="cinema-frame cinema-project" data-project={item.slug} data-cinema-frame data-shot={projectShots[index]}>
            {Object.entries(legacyProjectSlugs).filter(([, target]) => target === item.slug).map(([slug]) => <span key={slug} id={slug} className="hash-alias" aria-hidden="true" />)}
            <div className="cinema-story-panel">
              <p className="cinema-eyebrow">WORK / {String(index + 1).padStart(2, "0")}</p>
              <p className="cinema-project-period"><time dateTime={item.date}>{item.period.replace(/-/g, ".")}</time><span>{item.subtitle}</span></p>
              <h3><Link href={`/work/${item.slug}`}>{item.title}</Link></h3>
              <p>{item.summary}</p>
              <div className="cinema-contributions"><span>我做了什么</span><ul>{item.contributions.slice(0, 3).map(contribution => <li key={contribution}>{contribution}</li>)}</ul></div>
              <p className="cinema-project-status">{item.status}</p>
              <Link className="cinema-link" href={`/work/${item.slug}`} aria-label={`展开${item.title}`}>查看项目<ArrowUpRight size={16} /></Link>
            </div>
          </article>;
        })}
      </section>
      {avatarDomains.filter(item => item.id !== "coder" && item.id !== "work").map((item, index) => <section key={item.id} id={`domain-${item.id}`} className="cinema-frame cinema-personal" data-cinema-frame data-shot={item.id} aria-labelledby={`${item.id}-title`}>
        <div className="cinema-story-panel"><p className="cinema-eyebrow">0{index + 3} / {item.word}</p><h2 id={`${item.id}-title`}>{item.title}</h2><p>{item.description}</p><Link className="cinema-link" href={item.href}>{item.link}<ArrowUpRight size={16} /></Link></div>
      </section>)}
      <section className="cinema-frame cinema-farewell" data-cinema-frame data-shot="farewell" aria-labelledby="journal-title">
        <div className="cinema-story-panel"><p className="cinema-eyebrow">STAY CURIOUS.</p><h2 id="journal-title">很高兴，<br />我们在这里遇见。</h2>
          <div className="cinema-journal">{articles.length ? articles.map(article => <Link key={article.slug} href={`/posts/${article.slug}`}><span>{article.category === "tech" ? "技术笔记" : "生活随笔"}</span><h3>{article.title}</h3><ArrowUpRight size={15} /></Link>) : <Link href="/posts">想法、探索与日常记录<ArrowUpRight size={15} /></Link>}</div>
          <div className="cinema-doorways"><Link href="/posts">文章</Link><Link href="/novels">小说</Link><Link href="/videos">视频</Link><Link href="/resources">资源与收藏</Link></div>
          <a className="cinema-link" href="https://github.com/blackclaw0318" target="_blank" rel="noopener noreferrer"><Github size={16} />在 GitHub 找到我<ArrowUpRight size={15} /></a>
        </div>
      </section>
    </div>
  </div>;
}
