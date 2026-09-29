"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isLowPower, readSignals } from "@/lib/capability";

/**
 * RevealLoader: the site's reveal client leaf (renders no DOM). After
 * hydration, and again after each client-side navigation, it imports the
 * small reveal chunk (Web Animations, no GSAP) and arms `[data-reveal]` elements below the fold.
 * Skipped entirely on low-power devices; reduced motion is checked in the
 * chunk. Import failures are swallowed: the static page is final.
 */
export function RevealLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (isLowPower(readSignals(navigator, document))) return;
    let cleanup: (() => void) | null = null;
    let active = true;
    import("@/components/motion/reveal-motion")
      .then(({ armReveals }) => {
        if (active) cleanup = armReveals(document.getElementById("main") ?? document);
      })
      .catch(() => {});
    return () => {
      active = false;
      cleanup?.();
    };
  }, [pathname]);

  return null;
}
