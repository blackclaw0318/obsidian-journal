"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// App Router owns the lifetime of route children. Retaining a departing route in
// AnimatePresence can leave its cached tree mounted after a browser Back action.
// Keep this marker for anchor synchronization, and render the current tree directly.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div data-route-path={pathname} className="contents">{children}</div>;
}
