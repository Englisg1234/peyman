// Feature: cinematic-hero, Property 10: Parallax output is bounded, opposite and centered
// **Validates: Requirements 9.7, 9.14**
//
// For any pointer position inside the Hero and any stage/hero geometry,
// computeParallax meets all of the following:
//   - |(x, y)| ≤ 12;
//   - |rotateX|, |rotateY| ≤ 2;
//   - (lightX, lightY) = −(x, y);
//   - the result is (0, 0, 0, 0) at the stage center;
//   - the magnitude is non-decreasing with distance along any ray from the center.
//
// Bounds use a 1e-9 tolerance for floating-point rounding in the unit vector.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeParallax, type Box, type Point } from '@/lib/parallax';

const MAX_TRANSLATE = 12;
const MAX_ROTATE = 2;
const EPS = 1e-9;

const unit = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

/** Hero rect in client coordinates: 320–3840 wide, landscape-phone to 4K tall, possibly scrolled. */
const heroArb: fc.Arbitrary<Box> = fc.record({
  left: fc.integer({ min: -40, max: 40 }),
  top: fc.integer({ min: -1500, max: 100 }),
  width: fc.integer({ min: 320, max: 3840 }),
  height: fc.integer({ min: 360, max: 2400 }),
});

/** A hero plus an Emblem_Stage fully inside it (5–100% of each hero dimension). */
const geometryArb = heroArb.chain((hero) =>
  fc
    .record({
      fw: fc.double({ min: 0.05, max: 1, noNaN: true }),
      fh: fc.double({ min: 0.05, max: 1, noNaN: true }),
      fl: unit,
      ft: unit,
    })
    .map(({ fw, fh, fl, ft }) => {
      const width = hero.width * fw;
      const height = hero.height * fh;
      const stage: Box = {
        left: hero.left + (hero.width - width) * fl,
        top: hero.top + (hero.height - height) * ft,
        width,
        height,
      };
      return { hero, stage };
    }),
);

/** A pointer inside the Hero rect (edges included). */
const pointerIn = (hero: Box): fc.Arbitrary<Point> =>
  fc.record({ u: unit, v: unit }).map(({ u, v }) => ({
    x: hero.left + hero.width * u,
    y: hero.top + hero.height * v,
  }));

const scenarioArb = geometryArb.chain(({ hero, stage }) =>
  pointerIn(hero).map((pointer) => ({ hero, stage, pointer })),
);

const center = (stage: Box): Point => ({
  x: stage.left + stage.width / 2,
  y: stage.top + stage.height / 2,
});

/** Largest t ≥ 0 such that origin + t·(dx, dy) stays inside the hero. */
function rayLength(origin: Point, dx: number, dy: number, hero: Box): number {
  const limit = (o: number, d: number, start: number, end: number) =>
    d > 0 ? (end - o) / d : d < 0 ? (start - o) / d : Number.POSITIVE_INFINITY;
  return Math.max(
    0,
    Math.min(
      limit(origin.x, dx, hero.left, hero.left + hero.width),
      limit(origin.y, dy, hero.top, hero.top + hero.height),
    ),
  );
}

describe('Property 10: computeParallax', () => {
  it('keeps translation magnitude ≤ 12 px and each rotation ≤ 2°', () => {
    fc.assert(
      fc.property(scenarioArb, ({ hero, stage, pointer }) => {
        const out = computeParallax(pointer, stage, hero);
        expect(Math.hypot(out.x, out.y)).toBeLessThanOrEqual(MAX_TRANSLATE + EPS);
        expect(Math.abs(out.rotateX)).toBeLessThanOrEqual(MAX_ROTATE + EPS);
        expect(Math.abs(out.rotateY)).toBeLessThanOrEqual(MAX_ROTATE + EPS);
      }),
    );
  });

  it('moves the Light_Layer by the exact negation of the emblem offset', () => {
    fc.assert(
      fc.property(scenarioArb, ({ hero, stage, pointer }) => {
        const out = computeParallax(pointer, stage, hero);
        // `===` treats 0 and -0 as equal; the implementation normalizes signed zeros anyway.
        expect(out.lightX === -out.x).toBe(true);
        expect(out.lightY === -out.y).toBe(true);
      }),
    );
  });

  it('rests at (0, 0, 0, 0) at the stage center', () => {
    fc.assert(
      fc.property(geometryArb, ({ hero, stage }) => {
        const out = computeParallax(center(stage), stage, hero);
        expect(out).toEqual({ x: 0, y: 0, rotateX: 0, rotateY: 0, lightX: 0, lightY: 0 });
      }),
    );
  });

  it('is non-decreasing in magnitude along any ray from the center', () => {
    const rayArb = geometryArb.chain(({ hero, stage }) =>
      fc
        .record({
          angle: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true, maxExcluded: true }),
          a: unit,
          b: unit,
        })
        .map(({ angle, a, b }) => ({ hero, stage, angle, near: Math.min(a, b), far: Math.max(a, b) })),
    );

    fc.assert(
      fc.property(rayArb, ({ hero, stage, angle, near, far }) => {
        const c = center(stage);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const length = rayLength(c, dx, dy, hero);
        const at = (f: number): Point => ({ x: c.x + dx * length * f, y: c.y + dy * length * f });

        const p = computeParallax(at(near), stage, hero);
        const q = computeParallax(at(far), stage, hero);
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(Math.hypot(q.x, q.y) + EPS);
        expect(Math.hypot(p.rotateX, p.rotateY)).toBeLessThanOrEqual(Math.hypot(q.rotateX, q.rotateY) + EPS);
      }),
    );
  });
});
