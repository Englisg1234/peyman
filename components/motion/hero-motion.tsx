"use client";

import { useLayoutEffect, useRef } from "react";
// The only GSAP entry point (Req 14.4). Importing it here puts GSAP in this
// module's chunk, which MotionLoader reaches only through its post-hydration
// `import()` (Req 13.5, 16.4).
import { gsap, useGSAP } from "@/lib/gsap";
import type { CapabilitySignals } from "@/lib/capability";
import { createParallaxDriver } from "@/components/motion/parallax-driver";
import { toSafe } from "@/components/motion/safe";
import { createScrollExit, parkScrollTrigger } from "@/components/motion/scroll-exit";
import { consumeSweep, hasSweepPlayed, scheduleSweep } from "@/components/motion/sweep";
import { watchHeroVisibility } from "@/components/motion/visibility";

/**
 * Props contract between MotionLoader (task 16.4) and HeroMotion.
 *
 * - `heroId`: `id` of the Hero `section[data-hero]`, the `useGSAP` scope.
 * - `capabilities`: the signals MotionLoader read at hydration.
 * - `lowPower`: `isLowPower(capabilities)` (Req 9.12): no sweep, no
 *   Pointer_Parallax, no Scroll_Exit.
 * - `deadlineMissed`: the chunk arrived ≥ 1600 ms after hydration (Req 16.8):
 *   the sweep is skipped; parallax and Scroll_Exit may still run.
 *
 * Reduced motion is not a prop: it is evaluated live by `gsap.matchMedia()`.
 */
export interface HeroMotionProps {
  heroId: string;
  capabilities: CapabilitySignals;
  lowPower: boolean;
  deadlineMissed: boolean;
}

/** One matchMedia, three conditions (design: GSAP architecture, rule 2). */
const CONDITIONS = {
  motionOK: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  fine: "(hover: hover) and (pointer: fine)",
} as const;

type Conditions = Record<keyof typeof CONDITIONS, boolean>;

/**
 * Hero motion enhancement (design: GSAP architecture rules 1–8). Renders no
 * DOM (Req 15.6).
 *
 * - Specular_Sweep once per document, after the CSS emblem intro (sweep.ts).
 * - Pointer_Parallax on fine pointers (parallax-driver.ts).
 * - Pause while the Hero is off-screen or the document hidden; bfcache
 *   restores hold the resting frame (visibility.ts; Req 9.13, 9.15).
 * - Scroll_Exit only when content follows the Hero (the full site: always
 *   on `/`); listener-based, silent at rest and off-screen (scroll-exit.ts).
 *
 * GSAP writes only `.emblem-scroll`, `.emblem-parallax`, `.light-parallax`
 * and the specular copy; the CSS intro owns every `[data-intro]` element
 * (Req 13.11). A reduced-motion toggle reverts all of it through matchMedia;
 * toggling back re-enables parallax without replaying the sweep (Req 9.11).
 * Any setup error reverts everything, silently, with no retry (Req 17.7).
 */
export function HeroMotion({ heroId, lowPower, deadlineMissed }: HeroMotionProps) {
  const scope = useRef<HTMLElement | null>(null);
  // Declared before useGSAP so the scope is resolved when its effect runs.
  useLayoutEffect(() => {
    scope.current = document.getElementById(heroId);
  }, [heroId]);

  useGSAP(
    () => {
      const hero = scope.current;
      if (!hero) return;
      const mm = gsap.matchMedia(hero);
      try {
        parkScrollTrigger(hero);
        mm.add(CONDITIONS, (context, contextSafe) => {
          const { motionOK, fine } = context.conditions as Conditions;
          if (!motionOK || lowPower) {
            // Reduced motion or low power: the static composition is final,
            // and the one sweep chance is spent so a later toggle never replays it.
            consumeSweep();
            return;
          }
          const safe = toSafe(contextSafe);
          let restSweep: (() => void) | null = null;
          if (!deadlineMissed && !hasSweepPlayed()) restSweep = scheduleSweep(hero, safe);
          else consumeSweep();

          const parallax = fine ? createParallaxDriver(hero, safe) : null;
          const scrollExit = createScrollExit(hero);
          parallax?.attach();

          const stopWatching = watchHeroVisibility(hero, {
            onChange: safe((active: boolean) => {
              if (active) {
                parallax?.attach();
                parallax?.toRest();
                scrollExit?.enable();
                return;
              }
              restSweep?.();
              parallax?.detach();
              scrollExit?.disable(false);
            }),
            onRestore: safe(() => restSweep?.()),
          });

          return () => {
            stopWatching();
            parallax?.detach();
            scrollExit?.kill();
            restSweep?.();
          };
        });
      } catch {
        // Req 17.7: leave the static composition; nothing is logged or retried.
        mm.revert();
      }
    },
    { scope, dependencies: [heroId, lowPower, deadlineMissed], revertOnUpdate: true },
  );

  return null;
}
