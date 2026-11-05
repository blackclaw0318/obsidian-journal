"use client";

import { useEffect, type RefObject } from "react";
import { avatarCameraShots, type AvatarDomain, type AvatarScrollSource, type AvatarShot } from "@/lib/avatar-world";

/** Native page scrolling is the source of truth; the render loop reads this ref. */
export function useAvatarStory(root: RefObject<HTMLDivElement>, source: AvatarScrollSource, onChapter: (focus: AvatarDomain, index: number) => void, revision: string) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    let lastIndex = -1;
    let frames: { center: number; shot: AvatarShot }[] = [];
    const update = () => {
      frame = 0;
      if (!frames.length) return;
      const position = window.scrollY + window.innerHeight / 2;
      let before = 0;
      while (before < frames.length - 1 && position > frames[before + 1].center) before++;
      const after = Math.min(before + 1, frames.length - 1);
      const start = frames[before]; const end = frames[after];
      const raw = after === before ? 0 : Math.max(0, Math.min(1, (position - start.center) / (end.center - start.center)));
      const nearest = raw < .5 ? before : after;
      const total = frames.at(-1)!.center - frames[0].center;
      source.current = { from: start.shot, to: end.shot, mix: raw * raw * (3 - 2 * raw), progress: Math.max(0, Math.min(1, (position - frames[0].center) / total)), index: nearest };
      element.dataset.activeShot = frames[nearest].shot;
      if (nearest !== lastIndex) { lastIndex = nearest; onChapter(avatarCameraShots[frames[nearest].shot].domain, nearest); }
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      frames = Array.from(element.querySelectorAll<HTMLElement>("[data-cinema-frame]")).map(node => ({ center: window.scrollY + node.getBoundingClientRect().top + node.offsetHeight / 2, shot: node.dataset.shot as AvatarShot }));
      queue();
    };
    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener("scroll", queue, { passive: true }); window.addEventListener("resize", measure);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", queue); window.removeEventListener("resize", measure); };
  }, [root, source, onChapter, revision]);
}
