"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Apple, Camera, Cookie, RotateCcw, Smile } from "lucide-react";
import { avatarAsset, avatarExpressions, type AvatarAction, type AvatarDomain, type AvatarScrollSource } from "@/lib/avatar-world";

const PortfolioScene = dynamic(() => import("./PortfolioScene"), { ssr: false });
const expressionNames = ["自然", "搞怪", "哇哦", "大笑"];

export function AvatarStage({ focus: controlledFocus, onFocus, cinematic = false, scrollSource }: { focus?: AvatarDomain; onFocus?: (domain: AvatarDomain) => void; cinematic?: boolean; scrollSource?: AvatarScrollSource }) {
  const [localFocus, setLocalFocus] = useState<AvatarDomain>("all");
  const focus = controlledFocus ?? localFocus;
  const changeFocus = (domain: AvatarDomain) => { setLocalFocus(domain); onFocus?.(domain); };
  const [expression, setExpression] = useState(0);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [actions, setActions] = useState<{ kind: AvatarAction; nonce: number }[]>([]);
  const actionSequence = useRef(0);
  const [announcement, setAnnouncement] = useState("");
  const act = (kind: AvatarAction) => {
    if (kind === "bread") setExpression(0);
    const nonce = ++actionSequence.current;
    setActions(value => [...value.slice(-31), { kind, nonce }]);
    setAnnouncement(kind === "apple" ? "接住！苹果抛起来了。" : kind === "bread" ? "面包咬一口，再点可以换回整片。" : "咔嚓，闪光灯亮了。" );
  };
  return <div className={`avatar-world${cinematic ? " cinema-stage" : ""}`} data-testid="avatar-world" data-ready={ready} data-focus={focus}>
    <div className="world-canvas-wrap">
      {/* A small, immediate fallback remains available when WebGL is unavailable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="world-poster" data-testid="avatar-poster" src={avatarAsset.poster} alt="上坤的虚拟形象，脸上贴着身份标签，拿着苹果、面包和手机" fetchPriority="high" />
      <PortfolioScene focus={focus} onFocus={changeFocus} cinematic={cinematic} scrollSource={scrollSource} expression={expression} actions={actions} onAction={act} reset={reset} onReady={setReady} />
    </div>
    <div className="world-caption"><span className="world-live-dot" />{ready ? "眼神跟随你 · 标签与道具都能点" : "嘿，很高兴认识你。"}</div>
    <div className="world-actions" role="group" aria-label="角色互动">
      <button type="button" disabled={!ready} onClick={() => act("apple")} aria-label="抛一下苹果" title="抛一下苹果"><Apple size={17} /><span>抛苹果</span></button>
      <button type="button" disabled={!ready} onClick={() => act("bread")} aria-label="咬一口面包" title="咬一口面包"><Cookie size={17} /><span>咬一口</span></button>
      <button type="button" disabled={!ready} onClick={() => act("flash")} aria-label="手机闪光灯" title="手机闪光灯"><Camera size={17} /><span>闪一下</span></button>
      <button type="button" disabled={!ready} onClick={() => setExpression(value => (value + 1) % avatarExpressions.length)} aria-label="换个搞怪表情" title={`当前${expressionNames[expression]}，点此换表情`}><Smile size={17} /><span>{expressionNames[expression]}</span></button>
      <button type="button" onClick={() => { setReset(value => value + 1); setExpression(0); changeFocus("all"); setAnnouncement("已回到初始视角。"); }} aria-label="重置角色视角" title="回到全貌"><RotateCcw size={17} /></button>
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>;
}
