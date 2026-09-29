"use client";

// Specular_Sweep (Req 5.4, 9.6, 9.15, 17.9; design: Motion choreography,
// GSAP architecture rules 4 and 7; delta D7).
//
// One pass of light across the emblem, once per document. The specular copy
// is the emblem image itself (screen blend, CSS), masked by one 2-stop radial
// band; this module only arms it (`data-sweep="active"` on `.raster-emblem`)
// and moves the band by tweening `--sweep-x`, which app/globals.css feeds to
// `mask-position`. At rest the copy is `display: none` again, so the resting
// frame is the static composition.
//
// GSAP never touches `[data-intro]` elements: the start waits for the CSS
// emblem intro to finish (its own Animation.finished), then reads nothing else.

import { easeFromTuple } from "@/lib/ease";
import { gsap } from "@/lib/gsap";
import { REDUCE_QUERY } from "@/lib/intro-done";
import { curve, duration } from "@/lib/motion-tokens";
import type { Safe } from "@/components/motion/safe";

/** Once per document: set when the sweep decision is made (Req 9.11, 9.15). */
let sweepPlayed = false;

export const hasSweepPlayed = (): boolean => sweepPlayed;

/** Spend the one chance without playing (reduced motion, low power, late chunk). */
export function consumeSweep(): void {
  sweepPlayed = true;
}

const MASK_PROBE = "linear-gradient(black, black)";

/** Req 17.9: without mask support the copy is never armed. */
export function supportsMask(): boolean {
  return (
    typeof CSS !== "undefined" &&
    (CSS.supports("mask-image", MASK_PROBE) || CSS.supports("-webkit-mask-image", MASK_PROBE))
  );
}

/** Resolves when the CSS emblem intro has finished, or at once if none is running. */
function introSettled(hero: HTMLElement): Promise<unknown> {
  const intro = hero.querySelector<HTMLElement>(".emblem-intro");
  const running = intro?.getAnimations?.() ?? [];
  return Promise.all(running.map((a) => a.finished.catch(() => undefined)));
}

const SWEEP_FROM = "-60%";
const SWEEP_TO = "160%";
const STATE_EASE = easeFromTuple(curve.state);

/**
 * Schedule the sweep. The caller has already checked motionOK, low power, the
 * deadline and `hasSweepPlayed()`. Returns `toRest`, which cancels a pending
 * start or jumps a running pass to the resting frame (pause, bfcache, revert).
 */
export function scheduleSweep(hero: HTMLElement, safe: Safe): () => void {
  sweepPlayed = true;
  const root = hero.querySelector<HTMLElement>('.raster-emblem[data-emblem-slot="hero"]');
  const img = root?.querySelector<HTMLImageElement>(".raster-emblem__img");
  const copy = root?.querySelector<HTMLElement>(".raster-emblem__specular");
  let done = !root || !img || !copy || !supportsMask();
  let tween: ReturnType<typeof gsap.to> | null = null;

  const toRest = () => {
    done = true;
    tween?.kill();
    tween = null;
    if (root) delete root.dataset.sweep;
    copy?.style.removeProperty("--sweep-x");
  };

  const start = safe(() => {
    // Req 5.10 / 17.1: only a decoded emblem gets light; hidden pages skip it.
    // Req 9.11: a reduce toggle cancels the CSS intro, which settles
    // `introSettled` before matchMedia's change event reverts this context
    // whenever style is flushed in between; the live query closes that gap.
    if (
      done ||
      !root ||
      !copy ||
      !img ||
      !(img.complete && img.naturalWidth > 0) ||
      document.hidden ||
      window.matchMedia(REDUCE_QUERY).matches
    ) {
      done = true;
      return;
    }
    root.dataset.sweep = "active";
    tween = gsap.fromTo(
      copy,
      { "--sweep-x": SWEEP_FROM },
      { "--sweep-x": SWEEP_TO, duration: duration.sweep / 1000, ease: STATE_EASE, onComplete: toRest },
    );
  });

  // Starts on the microtask after the later of "intro finished" and "motion
  // ready" (now), well inside the 200 ms lag budget (delay.sweepMaxLag).
  if (!done) void introSettled(hero).then(start);
  return toRest;
}
