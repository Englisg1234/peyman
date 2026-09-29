"use client";

// Scroll_Exit (Req 9.8; design: Motion choreography "Scroll transition into the
// next section"). The emblem's scroll wrapper drifts up 8% and settles to 0.96
// while the Hero scrolls from top-at-top to bottom-at-top, mapped linearly.
//
// Active now that sections follow the Hero. Implemented as a passive scroll
// listener with one rAF per scroll burst instead of ScrollTrigger, because
// ScrollTrigger keeps a permanent rAF keep-alive loop running and renders an
// identity transform at rest. This way:
//   - at rest (scrollY at the Hero top) nothing is written (Req 9.10, 9.11);
//   - idle and off-screen there are no frames at all (Req 9.13, 13.10);
//   - HeroMotion disables it while the Hero is off-screen or hidden.

import { gsap, ScrollTrigger } from "@/lib/gsap";
import { distance } from "@/lib/motion-tokens";

/** True when any content follows the Hero in the document flow. */
export function hasFollowingContent(hero: HTMLElement): boolean {
  if (hero.nextElementSibling) return true;
  const main = hero.closest("main");
  return main !== null && main.children.length > 1;
}

let parked = false;

/**
 * Registering ScrollTrigger starts a permanent rAF keep-alive loop
 * (`_rafBugFix`) plus scroll and pointer listeners. Nothing uses
 * ScrollTrigger (Scroll_Exit is listener-based), so it is always parked;
 * otherwise every idle, off-screen and hidden frame would run a GSAP
 * callback (Req 9.13, 13.9).
 */
export function parkScrollTrigger(hero: HTMLElement): void {
  void hero;
  if (parked) return;
  ScrollTrigger.disable();
  parked = true;
}

export interface ScrollExit {
  enable(): void;
  /** Stops listening. `revert` also clears the wrapper's inline transform. */
  disable(revert?: boolean): void;
  kill(): void;
}

/** Create the Scroll_Exit, or return null when nothing follows the Hero. */
export function createScrollExit(hero: HTMLElement): ScrollExit | null {
  const wrapper = hero.querySelector<HTMLElement>(".emblem-scroll");
  if (!wrapper || !hasFollowingContent(hero)) return null;

  let frame = 0;
  let listening = false;
  let written = false;

  const render = () => {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const progress = rect.height > 0 ? Math.min(1, Math.max(0, -rect.top / rect.height)) : 0;
    if (progress === 0) {
      if (written) gsap.set(wrapper, { clearProps: "transform" });
      written = false;
      return;
    }
    gsap.set(wrapper, {
      yPercent: distance.exitYPercent * progress,
      scale: 1 + (distance.exitScale - 1) * progress,
    });
    written = true;
  };

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const exit: ScrollExit = {
    enable() {
      if (listening) return;
      listening = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      // Page restored or reloaded mid-scroll: match the current position once.
      if (window.scrollY > 0) onScroll();
    },
    disable(revert = false) {
      listening = false;
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (revert && written) {
        gsap.set(wrapper, { clearProps: "transform" });
        written = false;
      }
    },
    kill() {
      exit.disable(true);
    },
  };
  exit.enable();
  return exit;
}
