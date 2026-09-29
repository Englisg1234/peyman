"use client";

// Pointer_Parallax driver (Req 9.7, 9.9, 9.13, 9.14, 13.10; design: Motion
// choreography "Interaction motion", GSAP architecture rules 3 and 4).
//
// Writes only `.emblem-parallax` (x, y, rotationX, rotationY) and
// `.light-parallax` (x, y, opposite). The mapping is lib/parallax.ts.
// Rects are cached in page coordinates and refreshed only on resize
// (ResizeObserver + window resize), so a pointermove reads no layout: it uses
// `pageX/pageY` against the cache and feeds six quickTo setters.

import { easeFromTuple } from "@/lib/ease";
import { gsap } from "@/lib/gsap";
import { curve, duration } from "@/lib/motion-tokens";
import { computeParallax, type Box } from "@/lib/parallax";
import type { Safe } from "@/components/motion/safe";

const PERSPECTIVE = 1200;
const ENTRANCE = easeFromTuple(curve.entrance);
const STATE = easeFromTuple(curve.state);
const REST = { x: 0, y: 0 } as const;

type Setter = (value: number) => void;

export interface ParallaxDriver {
  /** Start listening (hero visible, document visible). */
  attach(): void;
  /** Stop listening and freeze any tween at its current value (pause). */
  detach(): void;
  /** Ease back to the rest pose over `parallaxReturn`. */
  toRest(): void;
}

const pageBox = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
};

export function createParallaxDriver(hero: HTMLElement, safe: Safe): ParallaxDriver | null {
  const emblem = hero.querySelector<HTMLElement>(".emblem-parallax");
  const light = hero.querySelector<HTMLElement>(".light-parallax");
  const stage = hero.querySelector<HTMLElement>(".emblem-stage");
  if (!emblem || !light || !stage) return null;
  const targets = [emblem, light];

  let heroBox: Box = pageBox(hero);
  let stageBox: Box = pageBox(stage);
  let setters: Setter[] | null = null;
  let attached = false;
  let observer: ResizeObserver | null = null;

  const measure = () => {
    heroBox = pageBox(hero);
    stageBox = pageBox(stage);
  };

  // Fresh quickTo setters after every rest/freeze: killTweensOf retires the old
  // ones, and new ones start from the values GSAP last rendered (no jump).
  const makeSetters = safe((): Setter[] => {
    gsap.killTweensOf(targets);
    gsap.set(emblem, { transformPerspective: PERSPECTIVE });
    const to = (el: HTMLElement, prop: string) =>
      gsap.quickTo(el, prop, { duration: duration.ui / 1000, ease: ENTRANCE }) as Setter;
    return [to(emblem, "x"), to(emblem, "y"), to(emblem, "rotationX"), to(emblem, "rotationY"), to(light, "x"), to(light, "y")];
  });

  const onMove = safe((e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const p = computeParallax({ x: e.pageX, y: e.pageY }, stageBox, heroBox);
    setters ??= makeSetters();
    const [x, y, rx, ry, lx, ly] = setters;
    x(p.x);
    y(p.y);
    rx(p.rotateX);
    ry(p.rotateY);
    lx(p.lightX);
    ly(p.lightY);
  });

  const toRest = safe(() => {
    setters = null;
    gsap.killTweensOf(targets);
    const vars = { duration: duration.parallaxReturn / 1000, ease: STATE, overwrite: true } as const;
    gsap.to(emblem, { ...REST, rotationX: 0, rotationY: 0, ...vars });
    // Clearing the inline transform at rest restores the exact static frame
    // (no lingering perspective matrix, no promoted layer).
    gsap.to(light, { ...REST, ...vars, onComplete: () => gsap.set(targets, { clearProps: "transform" }) });
  });

  const onResize = () => measure();

  return {
    attach() {
      if (attached) return;
      attached = true;
      measure();
      hero.addEventListener("pointermove", onMove, { passive: true });
      hero.addEventListener("pointerleave", toRest);
      window.addEventListener("blur", toRest);
      window.addEventListener("resize", onResize, { passive: true });
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(onResize);
        observer.observe(hero);
      }
    },
    detach() {
      if (!attached) return;
      attached = false;
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", toRest);
      window.removeEventListener("blur", toRest);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      observer = null;
      setters = null;
      gsap.killTweensOf(targets);
    },
    toRest,
  };
}
