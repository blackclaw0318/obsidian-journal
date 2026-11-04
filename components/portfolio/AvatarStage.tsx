"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { RotateCcw, Smile, MoveUpRight } from "lucide-react";
import { characterScenes, type CharacterScene } from "@/lib/portfolio";

const PortfolioScene = dynamic(() => import("./PortfolioScene"), { ssr: false });
const expressions = ["自然", "眨眼", "思考"] as const;
const portraits = ["/images/avatar-v2-concept.webp", "/images/avatar-v2-wink.webp", "/images/avatar-v2-thinking.webp"];

export function AvatarStage({ scene = "hello", chapter = "" }: { scene?: CharacterScene; chapter?: string }) {
  const [expression, setExpression] = useState(0);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const state = characterScenes[scene];
  useEffect(() => {
    setExpression(scene === "research" || scene === "vision" ? 2 : scene === "motion" ? 1 : 0);
  }, [scene]);
  return (
    <div className="avatar-stage" data-scene={scene} onPointerMove={(event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--portrait-x", `${((event.clientX - rect.left) / rect.width - .5) * 9}px`);
      event.currentTarget.style.setProperty("--portrait-y", `${((event.clientY - rect.top) / rect.height - .5) * 6}px`);
    }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--portrait-x", "0px"); event.currentTarget.style.setProperty("--portrait-y", "0px"); }}>
      <div className="avatar-orbit orbit-one" aria-hidden="true" />
      <div className="avatar-orbit orbit-two" aria-hidden="true" />
      <span className="stage-cross cross-one" aria-hidden="true">+</span>
      <span className="stage-cross cross-two" aria-hidden="true">+</span>
      <div className="avatar-back-word" aria-hidden="true">SK.</div>
      <span className="stage-coordinate" aria-hidden="true">PERSONAL SPACE / 01</span>
      <div className="avatar-canvas-wrap">
        {/* Poster is also the usable non-WebGL fallback, not an indefinite spinner. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="avatar-poster" src={portraits[expression]} alt={`上坤的虚拟形象，${expressions[expression]}表情：辫发、耳饰、灰色 Polo 衫，拿着苹果和手机`} />
        <PortfolioScene scene={scene} expression={expression} reset={reset} onReady={setReady} />
      </div>
      <div className="avatar-sticker sticker-top"><span className="live-dot" />{state.label}<MoveUpRight size={13} /></div>
      <div className="avatar-sticker sticker-bottom" aria-hidden="true">{state.word}</div>
      <div className="avatar-speech" aria-live="polite"><span>SK SAYS</span><p>{state.caption}</p></div>
      <div className="avatar-toolbar">
        <span className="avatar-hint">{ready ? "拖动转一转 · 点击换个表情" : "移动指针 · 点击换个表情"}</span>
        <div>
          <button type="button" onClick={() => setExpression((value) => (value + 1) % expressions.length)} aria-label={`切换角色表情，当前${expressions[expression]}`} title="换个表情"><Smile size={17} /><span>{expressions[expression]}</span></button>
          <button type="button" onClick={() => { setReset((value) => value + 1); setExpression(0); }} aria-label="重置角色视角" title="重置视角"><RotateCcw size={17} /></button>
        </div>
      </div>
      {chapter && <p className="avatar-chapter">正在探索 <span>{chapter}</span></p>}
    </div>
  );
}
