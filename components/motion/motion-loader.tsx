"use client";

import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { HeroMotionProps } from "@/components/motion/hero-motion";
import { isLowPower, readSignals } from "@/lib/capability";
import { watchIntroDone } from "@/lib/intro-done";
import { MOTION_MARK } from "@/lib/motion-marks";
import { delay } from "@/lib/motion-tokens";

type Loaded = { Motion: ComponentType<HeroMotionProps>; props: HeroMotionProps };

/** Contains render errors from the motion chunk so they never reach the page root (Req 17.7). */
class MotionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface MotionLoaderProps {
  /** `id` of the Hero section, passed through to HeroMotion as its scope. */
  heroId: string;
}

/**
 * MotionLoader (design: GSAP architecture sequence; Req 13.5, 15.6, 16.4,
 * 16.8, 17.7). The Hero's only client leaf; renders `null`, then HeroMotion.
 *
 * - After hydration (`useEffect`) it starts the 1600 ms deadline and calls a
 *   plain `import()`, so the motion chunk (GSAP, ScrollTrigger, @gsap/react,
 *   HeroMotion) is requested strictly after hydration. No `next/dynamic`, so
 *   nothing is preloaded or modulepreloaded in the initial HTML.
 * - Capability signals are read once, at that moment (Req 9.12).
 * - `deadlineMissed` is true when the chunk settles 1600 ms or more after
 *   hydration (Req 16.8): HeroMotion then skips the sweep only.
 * - A rejected import is swallowed and never retried; the static composition
 *   stays (Req 17.7). Render errors are contained by MotionBoundary.
 *
 * The chunk loads under reduced motion and on coarse pointers too: HeroMotion
 * evaluates reduced motion and pointer type live through `gsap.matchMedia()`,
 * so a runtime preference toggle can re-enable parallax without a reload
 * (design rule 2, task 17.1). Low power is passed through, not short-circuited
 * here, per the design contract `{ lowPower, deadlineMissed }`.
 *
 * It also sets `html[data-intro-done]` (lib/intro-done.ts) once the CSS intro
 * has finished or reduced motion matches, so the intro plays at most once per
 * document (Req 9.11).
 */
export function MotionLoader({ heroId }: MotionLoaderProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Intro-once guard (task 17.1): independent of the motion chunk, so it holds
  // even when the import fails or is late.
  useEffect(() => watchIntroDone(), []);

  useEffect(() => {
    let active = true;
    let missed = false;
    const start = performance.now();
    performance.mark(MOTION_MARK.start);
    const deadline = window.setTimeout(() => {
      missed = true;
    }, delay.motionDeadline);
    const capabilities = readSignals(navigator, document);

    import("@/components/motion/hero-motion")
      .then(({ HeroMotion }) => {
        performance.mark(MOTION_MARK.ready);
        if (!active) return;
        const deadlineMissed = missed || performance.now() - start >= delay.motionDeadline;
        setLoaded({
          Motion: HeroMotion,
          props: { heroId, capabilities, lowPower: isLowPower(capabilities), deadlineMissed },
        });
      })
      .catch(() => {
        // Req 17.7: no uncaught error, no retry; the CSS-only composition is final.
        performance.mark(MOTION_MARK.failed);
      })
      .finally(() => window.clearTimeout(deadline));

    return () => {
      active = false;
      window.clearTimeout(deadline);
    };
  }, [heroId]);

  if (!loaded) return null;
  const { Motion, props } = loaded;
  return (
    <MotionBoundary>
      <Motion {...props} />
    </MotionBoundary>
  );
}
