// Feature: cinematic-hero, Property 4: Emblem and text never intersect, even at maximum parallax
// **Validates: Requirements 2.7, 2.8, 11.9**
//
// For any viewport (width 320–3840, height 320–2400, optional safe-area
// insets on phone-sized windows), with layout = computeHeroLayout(v):
//
// - the emblem at maximum Pointer_Parallax, parallaxEnvelope(emblem), has
//   zero intersection with the text block (headline top to CTA group bottom);
// - that envelope lies inside the Hero border box (Req 2.7), and so does the
//   text block horizontally;
// - the envelope really is the worst case: it contains every corner of the
//   emblem slot under ±12 px translation and ±2° rotateX/rotateY about the
//   anchor with perspective(1200px), projected independently here in both
//   rotation orders. (docs/decisions.md, task 10.1: the envelope adds up to
//   5.6 px per side at 620 px because the anchor is off-center.)
//
// Generator constraint: landscape-short viewports are generated only with
// width ≥ 568 (the smallest landscape phone, 568×320). Narrower landscape
// windows are not reported by any phone; the headline there needs 6+ lines in
// the 60% text column, which is outside the modeled layout. See
// docs/decisions.md, "Headline measure model" → "Tiny landscape windows".

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  bandFor,
  computeHeroLayout,
  EMBLEM_ANCHOR,
  intersectionArea,
  PARALLAX_ENVELOPE,
  parallaxEnvelope,
  type Rect,
  type Viewport,
} from '@/lib/layout-model';

import { TEST_VIEWPORTS } from '../e2e/support/viewports';

const EPS = 1e-6;
const MIN_LANDSCAPE_PHONE_WIDTH = 568;
/** Req 2.8 / 9.7 bounds, stated independently of the motion tokens. */
const MAX_TRANSLATE = 12;
const MAX_ROTATE_DEG = 2;
const PERSPECTIVE = 1200;

// ---------------------------------------------------------------------------
// Independent worst-case projection
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

const rotX = ([x, y, z]: Vec3, a: number): Vec3 => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotY = ([x, y, z]: Vec3, b: number): Vec3 => [x * Math.cos(b) + z * Math.sin(b), y, -x * Math.sin(b) + z * Math.cos(b)];

/**
 * Bounding box of the emblem slot's projected corners over the extreme
 * parallax states: translation ±12 px on each axis, rotations in
 * {−2°, 0, 2°} about X and Y (both composition orders), about the anchor,
 * under perspective(1200px) with the origin at the anchor.
 */
function projectedWorstCase(e: Rect): Rect {
  const ax = e.x + EMBLEM_ANCHOR.x * e.w;
  const ay = e.y + EMBLEM_ANCHOR.y * e.h;
  const t = (MAX_ROTATE_DEG * Math.PI) / 180;
  const angles = [-t, 0, t];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cx of [e.x, e.x + e.w]) {
    for (const cy of [e.y, e.y + e.h]) {
      const p: Vec3 = [cx - ax, cy - ay, 0];
      for (const a of angles) {
        for (const b of angles) {
          for (const q of [rotY(rotX(p, a), b), rotX(rotY(p, b), a)]) {
            const s = PERSPECTIVE / (PERSPECTIVE - q[2]);
            const px = ax + q[0] * s;
            const py = ay + q[1] * s;
            minX = Math.min(minX, px - MAX_TRANSLATE);
            maxX = Math.max(maxX, px + MAX_TRANSLATE);
            minY = Math.min(minY, py - MAX_TRANSLATE);
            maxY = Math.max(maxY, py + MAX_TRANSLATE);
          }
        }
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------------------
// Generators (same space as Property 3)
// ---------------------------------------------------------------------------

const isSubPhoneLandscape = (w: number, h: number): boolean => bandFor(w, h) === 'landscape' && w < MIN_LANDSCAPE_PHONE_WIDTH;

const anyViewport: fc.Arbitrary<Viewport> = fc
  .record({ width: fc.integer({ min: 320, max: 3840 }), height: fc.integer({ min: 320, max: 2400 }) })
  .filter((v) => !isSubPhoneLandscape(v.width, v.height));

const portraitPhone: fc.Arbitrary<Viewport> = fc
  .integer({ min: 320, max: 767 })
  .chain((width) =>
    fc.record({
      width: fc.constant(width),
      height: fc.integer({ min: width, max: 2400 }),
      safe: fc.record({ top: fc.integer({ min: 0, max: 59 }), right: fc.constant(0), bottom: fc.integer({ min: 0, max: 34 }), left: fc.constant(0) }),
    }),
  );

const landscapePhone: fc.Arbitrary<Viewport> = fc
  .integer({ min: 320, max: 479 })
  .chain((height) =>
    fc.record({
      width: fc.integer({ min: Math.max(MIN_LANDSCAPE_PHONE_WIDTH, height + 1), max: 1023 }),
      height: fc.constant(height),
      safe: fc.record({ top: fc.constant(0), right: fc.integer({ min: 0, max: 59 }), bottom: fc.integer({ min: 0, max: 21 }), left: fc.integer({ min: 0, max: 59 }) }),
    }),
  );

const bandEdges: fc.Arbitrary<Viewport> = fc
  .record({
    width: fc.constantFrom(320, 567, 568, 767, 768, 1023, 1024, 1279, 1280, 1919, 1920, 3840),
    height: fc.constantFrom(320, 479, 480, 719, 720, 767, 768, 2400),
  })
  .filter((v) => !isSubPhoneLandscape(v.width, v.height));

const testViewports = fc.constantFrom(...TEST_VIEWPORTS.map(({ width, height }): Viewport => ({ width, height })));

const viewport = fc.oneof(anyViewport, portraitPhone, landscapePhone, bandEdges, testViewports);

const right = (r: Rect): number => r.x + r.w;
const bottom = (r: Rect): number => r.y + r.h;
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - EPS && inner.y >= outer.y - EPS && right(inner) <= right(outer) + EPS && bottom(inner) <= bottom(outer) + EPS;

describe('Property 4: emblem and text never intersect, even at maximum parallax', () => {
  it('uses the 12 px / 2° bounds from the requirements', () => {
    expect(PARALLAX_ENVELOPE.translate).toBe(MAX_TRANSLATE);
    expect(PARALLAX_ENVELOPE.rotateDeg).toBe(MAX_ROTATE_DEG);
    expect(PARALLAX_ENVELOPE.perspective).toBe(PERSPECTIVE);
  });

  it('keeps the parallax envelope clear of the text block and inside the Hero', () => {
    fc.assert(
      fc.property(viewport, (v) => {
        const layout = computeHeroLayout(v);
        const { emblem, textBlock, hero } = layout;
        const where = `${v.width}×${v.height} (${layout.band})`;
        const envelope = parallaxEnvelope(emblem);

        expect(layout.emblemParallax, where).toEqual(envelope);

        // The envelope is conservative: it covers the independently projected worst case.
        const worst = projectedWorstCase(emblem);
        expect(contains(envelope, worst), `envelope ${JSON.stringify(envelope)} misses worst case ${JSON.stringify(worst)} at ${where}`).toBe(true);

        // Req 2.8, 11.9: no intersection with the text block at maximum parallax.
        expect(intersectionArea(envelope, textBlock), `envelope ${JSON.stringify(envelope)} vs text ${JSON.stringify(textBlock)} at ${where}`).toBe(0);

        // Req 2.7: the envelope stays inside the Hero border box.
        expect(contains(hero, envelope), `envelope ${JSON.stringify(envelope)} outside hero ${JSON.stringify(hero)} at ${where}`).toBe(true);

        // The text block lies inside the Hero horizontally.
        expect(textBlock.x, where).toBeGreaterThanOrEqual(hero.x - EPS);
        expect(right(textBlock), where).toBeLessThanOrEqual(right(hero) + EPS);
      }),
    );
  });
});
