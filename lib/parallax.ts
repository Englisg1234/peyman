// Pointer_Parallax mapping (Req 9.7, 9.14; design Property 10).
//
// Maps a pointer position to the emblem group's translate/rotate and the
// Light_Layer's opposite offset. The offset is proportional to the pointer's
// distance from the Emblem_Stage center and reaches the maximum at the Hero
// edges:
//
//   1. Normalize the offset per axis by the distance from the stage center to
//      the Hero edge on that side, giving (nx, ny).
//   2. Progress r = min(1, max(|nx|, |ny|)). Along any ray from the center the
//      normalization side is fixed, so r grows linearly, hits 1 exactly at the
//      Hero boundary, and stays 1 beyond it.
//   3. Output = max × r × unit(nx, ny). The magnitude is therefore ≤ max (never
//      max·√2 in a corner) and non-decreasing along the ray.
//
// Pure and framework-free (no GSAP, no DOM reads): the caller passes cached
// rects. Returns plain numbers for gsap.quickTo targets.

import { distance } from './motion-tokens';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ParallaxOutput {
  /** Emblem group translation, px. */
  x: number;
  y: number;
  /** Emblem group rotation, degrees. */
  rotateX: number;
  rotateY: number;
  /** Light_Layer translation, px: always the negation of (x, y). */
  lightX: number;
  lightY: number;
}

export interface ParallaxMax {
  /** Maximum translation magnitude, px. */
  translate: number;
  /** Maximum rotation about each axis, degrees. */
  rotate: number;
}

export const PARALLAX_MAX: ParallaxMax = {
  translate: distance.parallaxMax,
  rotate: distance.rotateMaxDeg,
};

const REST: ParallaxOutput = { x: 0, y: 0, rotateX: 0, rotateY: 0, lightX: 0, lightY: 0 };

/** Normalize a signed offset by the distance to the Hero edge on its side. */
function normalize(offset: number, center: number, heroStart: number, heroEnd: number): number {
  if (offset === 0) return 0;
  const extent = offset > 0 ? heroEnd - center : center - heroStart;
  // A center on or past the Hero edge leaves no room on that side: saturate.
  if (!(extent > 0)) return Math.sign(offset);
  return offset / extent;
}

/** Collapse -0 to 0 so callers and tests never see a signed zero. */
const clean = (v: number): number => v + 0;

/**
 * Compute the parallax transform for a pointer position.
 *
 * `stage` is the Emblem_Stage rect and `hero` the Hero rect, in the same
 * coordinate space as `pointer` (for example client coordinates). Pointers
 * outside the Hero clamp to the maximum. Non-finite input returns the rest pose.
 */
export function computeParallax(
  pointer: Point,
  stage: Box,
  hero: Box,
  max: ParallaxMax = PARALLAX_MAX,
): ParallaxOutput {
  const cx = stage.left + stage.width / 2;
  const cy = stage.top + stage.height / 2;
  const nx = normalize(pointer.x - cx, cx, hero.left, hero.left + hero.width);
  const ny = normalize(pointer.y - cy, cy, hero.top, hero.top + hero.height);

  const length = Math.hypot(nx, ny);
  if (!(length > 0) || !Number.isFinite(length)) return { ...REST };

  const progress = Math.min(1, Math.max(Math.abs(nx), Math.abs(ny)));
  const ux = nx / length;
  const uy = ny / length;
  const translate = Math.max(0, max.translate) * progress;
  const rotate = Math.max(0, max.rotate) * progress;

  const x = clean(translate * ux);
  const y = clean(translate * uy);
  return {
    x,
    y,
    // Tilt toward the pointer: moving right turns about +Y, moving down about −X.
    rotateX: clean(-rotate * uy),
    rotateY: clean(rotate * ux),
    lightX: clean(-x),
    lightY: clean(-y),
  };
}
