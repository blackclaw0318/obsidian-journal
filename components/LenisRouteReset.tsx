// ============================================================
// Synchronize navigation with Lenis after the destination has mounted.
// Hash destinations keep their anchor and CSS scroll margins; other new routes start at the top.
// ============================================================
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

export function LenisRouteReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);

  useEffect(() => {
    const routeChanged = prevPathRef.current !== pathname;
    prevPathRef.current = pathname;
    let frame = 0;
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const clearPending = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      observer = undefined;
      clearTimeout(timeout);
    };
    const scroll = (target: HTMLElement | number) => {
      if (lenis) {
        // Next may already have scrolled natively, and the new page may be much longer.
        // Refresh both Lenis' position and scroll limit before resolving an element.
        lenis.resize();
        lenis.scrollTo(target, { immediate: true, force: true });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "instant" });
      } else {
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
    };
    const syncLocation = (topWhenEmpty = false) => {
      clearPending();
      if (window.location.pathname !== pathname) return;
      const hash = window.location.hash.slice(1);
      if (!hash) {
        if (topWhenEmpty) scroll(0);
        return;
      }
      let fragment = hash;
      try { fragment = decodeURIComponent(hash); } catch { /* Treat malformed fragments literally. */ }
      const destination = window.location.href;
      const apply = () => {
        if (window.location.href !== destination) { clearPending(); return true; }
        const target = fragment === "top" ? 0 : document.getElementById(fragment) ?? document.getElementsByName(fragment)[0];
        if (target !== 0 && !(target instanceof HTMLElement)) return false;
        const route = target === 0 ? null : target.closest("[data-route-path]");
        if (route && route.getAttribute("data-route-path") !== pathname) return false;
        observer?.disconnect();
        clearTimeout(timeout);
        // Let Next finish its own focus/scroll work before synchronizing Lenis.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (window.location.href === destination && (target === 0 || target.isConnected)) scroll(target);
          });
        });
        return true;
      };
      if (!apply()) {
        // PageTransition can keep the previous route mounted during its exit animation.
        observer = new MutationObserver(apply);
        observer.observe(document.body, { childList: true, subtree: true });
        timeout = setTimeout(clearPending, 10000);
      }
    };
    const onLocationChange = () => syncLocation();
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href);
      if (destination.origin !== window.location.origin || destination.pathname !== pathname || (!destination.hash && !destination.href.endsWith("#"))) return;
      clearPending();
      // Next's same-route hash links use pushState, which does not emit hashchange.
      frame = requestAnimationFrame(() => {
        if (window.location.href === destination.href) syncLocation(true);
      });
    };

    syncLocation(routeChanged);
    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    document.addEventListener("click", onClick, true);
    return () => {
      clearPending();
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, lenis]);

  return null;
}
