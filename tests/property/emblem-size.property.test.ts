// Feature: cinematic-hero, Property 3: Emblem size respects caps, bands, ratio and its column
// **Validates: Requirements 5.1, 5.5, 10.2, 10.3, 10.7, 11.1, 11.2, 11.3, 11.4**
//
// For any viewport (width 320–3840, height 320–2400, optional safe-area
// insets on phone-sized windows), the emblem rect from computeHeroLayout(v):
//
// - is at most 620 px wide (Req 5.5, 11.4);
// - has an aspect ratio within ±1% of 972/1108 (Req 5.1);
// - follows its band rule:
//   - portrait < 768, h ≥ 720: height = clamp(120px, 22svh, 200px) (Req 10.2);
//   - portrait < 768, h < 720: height = clamp(96px, 16svh, 140px) (Req 10.3);
//   - landscape-short (< 1024, h < 480, w > h): height ≤ 70svh, width ≤ the
//     40% right column (Req 10.7);
//   - 768–1023, h ≥ 480: height ≤ 46svh, width ≤ columns 6–8 (Req 11.1);
//   - 1024–1279: 360–460 px; 1280–1919: 460–580 px; ≥ 1920: 580–620 px
//     (Req 11.2–11.4), inside columns 8–12 (design D3);
// - lies inside its column area, the content box and the Hero, below the
//   Site_Header.
//
// Expected bands, gutters, content caps and column areas are recomputed here
// from the requirement formulas rather than read back from the model. Two
// interpretations come from docs/decisions.md (task 10.1): the mobile emblem
// area is the full content width (end-aligned), and the model's aspect ratio
// is the measured master 1003/1144, checked against 972/1108 ±1%.
//
// Portrait/landscape follow CSS `orientation`: landscape only when w > h.
// Landscape windows narrower than 768 px but at least 480 px tall (e.g.
// 700×500) are neither portrait (Req 10.2/10.3) nor landscape-short
// (Req 10.7), so no height rule applies to them; only the general bounds are
// checked there.
//
// Generator constraint: landscape-short viewports are generated only with
// width ≥ 568 (the smallest landscape phone, 568×320). Narrower landscape
// windows (for example 460×400) are not reported by any phone and are outside
// the supported layout: the 60% text column is too narrow for the headline
// (6+ lines), so the text block the layout places beside the emblem is not a
// modeled configuration. docs/decisions.md, "Headline measure model" →
// "Tiny landscape windows", records this; Property 2 uses the same constraint.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeHeroLayout, type Rect, type Viewport } from '@/lib/layout-model';

import { TEST_VIEWPORTS } from '../e2e/support/viewports';

/** Floating-point tolerance for rect arithmetic (px). */
const EPS = 1e-6;
/** Smallest landscape phone viewport width (568×320). */
const MIN_LANDSCAPE_PHONE_WIDTH = 568;
/** Req 5.1 intrinsic ratio of the trimmed source. */
const SOURCE_ASPECT = 972 / 1108;
const EMBLEM_WIDTH_CAP = 620;

type ExpectedBand = 'mobile-tall' | 'mobile-compact' | 'mobile-landscape' | 'landscape' | 'tablet' | 'desktop' | 'wide' | 'ultra';

/** Band from the requirement conditions (Req 10.2, 10.3, 10.7, 11.1–11.4). */
function expectedBand(w: number, h: number): ExpectedBand {
  const landscape = w > h;
  if (w < 1024 && h < 480 && landscape) return 'landscape';
  if (w < 768) {
    if (landscape) return 'mobile-landscape';
    return h >= 720 ? 'mobile-tall' : 'mobile-compact';
  }
  if (w < 1024) return 'tablet';
  if (w < 1280) return 'desktop';
  if (w < 1920) return 'wide';
  return 'ultra';
}

const MODEL_BAND: Record<ExpectedBand, string> = {
  'mobile-tall': 'mobile',
  'mobile-compact': 'mobile-compact',
  'mobile-landscape': 'mobile',
  landscape: 'landscape',
  tablet: 'tablet',
  desktop: 'desktop',
  wide: 'wide',
  ultra: 'ultra',
};

const clamp = (min: number, value: number, max: number): number => Math.min(max, Math.max(min, value));

/** The emblem's column area [start, end] in px, recomputed from Req 2.3/2.4, 10.4, 10.7, 11.1, 11.3, 11.4, 11.7. */
function expectedArea(v: Viewport, band: ExpectedBand): { start: number; end: number } {
  const narrow = band === 'mobile-tall' || band === 'mobile-compact' || band === 'mobile-landscape' || band === 'landscape';
  const base = narrow ? 20 : clamp(40, 0.04 * v.width, 80);
  const gl = Math.max(base, v.safe?.left ?? 0);
  const gr = Math.max(base, v.safe?.right ?? 0);
  const available = v.width - gl - gr;
  const cap = band === 'wide' ? 1360 : band === 'ultra' ? 1680 : Infinity;
  const cw = Math.min(available, cap);
  const cx = gl + (available - cw) / 2;

  if (band === 'landscape') {
    const gap = 24;
    const textW = (cw - gap) * 0.6;
    return { start: cx + textW + gap, end: cx + cw };
  }
  if (narrow) return { start: cx, end: cx + cw };

  const [cols, gap, first, last] = band === 'tablet' ? [8, 24, 6, 8] : [12, 32, 8, 12];
  const col = (cw - (cols - 1) * gap) / cols;
  const start = cx + (first - 1) * (col + gap);
  const span = last - first + 1;
  return { start, end: start + span * col + (span - 1) * gap };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const isSubPhoneLandscape = (w: number, h: number): boolean => expectedBand(w, h) === 'landscape' && w < MIN_LANDSCAPE_PHONE_WIDTH;

/** Any viewport in range, excluding sub-phone landscape windows. */
const anyViewport: fc.Arbitrary<Viewport> = fc
  .record({ width: fc.integer({ min: 320, max: 3840 }), height: fc.integer({ min: 320, max: 2400 }) })
  .filter((v) => !isSubPhoneLandscape(v.width, v.height));

/** Portrait phones with realistic notch/home-indicator insets (top ≤ 59, bottom ≤ 34). */
const portraitPhone: fc.Arbitrary<Viewport> = fc
  .integer({ min: 320, max: 767 })
  .chain((width) =>
    fc.record({
      width: fc.constant(width),
      height: fc.integer({ min: width, max: 2400 }),
      safe: fc.record({ top: fc.integer({ min: 0, max: 59 }), right: fc.constant(0), bottom: fc.integer({ min: 0, max: 34 }), left: fc.constant(0) }),
    }),
  );

/** Landscape phones (568–1023 × 320–479, w > h) with realistic side insets (≤ 59) and bottom ≤ 21. */
const landscapePhone: fc.Arbitrary<Viewport> = fc
  .integer({ min: 320, max: 479 })
  .chain((height) =>
    fc.record({
      width: fc.integer({ min: Math.max(MIN_LANDSCAPE_PHONE_WIDTH, height + 1), max: 1023 }),
      height: fc.constant(height),
      safe: fc.record({ top: fc.constant(0), right: fc.integer({ min: 0, max: 59 }), bottom: fc.integer({ min: 0, max: 21 }), left: fc.integer({ min: 0, max: 59 }) }),
    }),
  );

/** Band edges, where rules switch (767/768, 1023/1024, 1279/1280, 1919/1920; heights 479/480, 719/720). */
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

describe('Property 3: emblem size respects caps, bands, ratio and its column', () => {
  it('keeps the emblem within the cap, ratio, band rule and its column', () => {
    fc.assert(
      fc.property(viewport, (v) => {
        const layout = computeHeroLayout(v);
        const { emblem: e } = layout;
        const band = expectedBand(v.width, v.height);
        const where = `${v.width}×${v.height} (${band})`;

        expect(layout.band, where).toBe(MODEL_BAND[band]);
        expect(e.w, where).toBeGreaterThan(0);
        expect(e.h, where).toBeGreaterThan(0);

        // Req 5.5: global cap.
        expect(e.w, `width cap at ${where}`).toBeLessThanOrEqual(EMBLEM_WIDTH_CAP + EPS);

        // Req 5.1: aspect ratio within ±1% of 972/1108.
        expect(Math.abs(e.w / e.h / SOURCE_ASPECT - 1), `aspect at ${where}`).toBeLessThanOrEqual(0.01);

        // Band rules.
        const svh = v.height;
        switch (band) {
          case 'mobile-tall':
            expect(e.h, `Req 10.2 height at ${where}`).toBeCloseTo(clamp(120, 0.22 * svh, 200), 6);
            break;
          case 'mobile-compact':
            expect(e.h, `Req 10.3 height at ${where}`).toBeCloseTo(clamp(96, 0.16 * svh, 140), 6);
            break;
          case 'landscape':
            expect(e.h, `Req 10.7 height at ${where}`).toBeLessThanOrEqual(0.7 * svh + EPS);
            break;
          case 'tablet':
            expect(e.h, `Req 11.1 height at ${where}`).toBeLessThanOrEqual(0.46 * svh + EPS);
            break;
          case 'desktop':
            expect(e.w, `Req 11.2 width at ${where}`).toBeGreaterThanOrEqual(360 - EPS);
            expect(e.w, `Req 11.2 width at ${where}`).toBeLessThanOrEqual(460 + EPS);
            break;
          case 'wide':
            expect(e.w, `Req 11.3 width at ${where}`).toBeGreaterThanOrEqual(460 - EPS);
            expect(e.w, `Req 11.3 width at ${where}`).toBeLessThanOrEqual(580 + EPS);
            break;
          case 'ultra':
            expect(e.w, `Req 11.4 width at ${where}`).toBeGreaterThanOrEqual(580 - EPS);
            expect(e.w, `Req 11.4 width at ${where}`).toBeLessThanOrEqual(620 + EPS);
            break;
          case 'mobile-landscape':
            // No height rule applies (see header comment).
            break;
        }

        // Inside its column area (landscape 40% column, tablet 6–8, desktop 8–12, mobile full content width).
        const area = expectedArea(v, band);
        expect(e.x, `column start at ${where}`).toBeGreaterThanOrEqual(area.start - EPS);
        expect(right(e), `column end at ${where}`).toBeLessThanOrEqual(area.end + EPS);

        // Inside the content box and the Hero, below the Site_Header.
        const { content, hero, headerHeight } = layout;
        expect(e.x, where).toBeGreaterThanOrEqual(content.x - EPS);
        expect(right(e), where).toBeLessThanOrEqual(right(content) + EPS);
        expect(e.x, where).toBeGreaterThanOrEqual(hero.x - EPS);
        expect(right(e), where).toBeLessThanOrEqual(right(hero) + EPS);
        expect(e.y, `below header at ${where}`).toBeGreaterThanOrEqual(headerHeight - EPS);
        expect(bottom(e), where).toBeLessThanOrEqual(bottom(hero) + EPS);
      }),
    );
  });
});
