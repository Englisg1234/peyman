// Feature: cinematic-hero, Property 6: CTA geometry never overlaps and keeps order
// **Validates: Requirements 3.4, 10.5, 10.9, 11.6, 11.8, 18.3**
//
// For any viewport (width 320–3840, height 320–2400) and any pair of CTA label
// widths in [0.5×, 2×] their nominal widths (simulating WCAG 1.4.12 text
// spacing overrides and label growth), the modeled CTAs from
// computeHeroLayout(v).ctas(labelWidths):
//
// - have zero intersection and are at least 8 px apart;
// - keep Primary before Secondary (above it, or left of it on the same row);
// - stay inside the text block's inline extent;
// - stack full width with a 12 px gap below 768 px;
// - sit in one row with a 16 px gap from 768 px when both fit, otherwise wrap
//   with a 12 px gap;
// - have hit areas of at least 44×44, and are at least 48 px tall below
//   1024 px and 52 px tall from 1024 px.
//
// At nominal label widths the CTA group also lies fully inside the text block.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { BREAKPOINT, CTA, computeHeroLayout, intersectionArea, rectGap, type Rect, type Viewport } from '@/lib/layout-model';

import { TEST_VIEWPORTS } from '../e2e/support/viewports';

/** Sub-pixel tolerance for floating-point rect arithmetic. */
const EPS = 1e-6;
const MIN_SPACING = 8;
const MIN_TARGET = 44;

const anyViewport: fc.Arbitrary<Viewport> = fc.record({
  width: fc.integer({ min: 320, max: 3840 }),
  height: fc.integer({ min: 320, max: 2400 }),
});

const viewport = fc.oneof(anyViewport, fc.constantFrom(...TEST_VIEWPORTS.map(({ width, height }) => ({ width, height }))));

const scale = fc.double({ min: 0.5, max: 2, noNaN: true, noDefaultInfinity: true });

const right = (r: Rect): number => r.x + r.w;
const bottom = (r: Rect): number => r.y + r.h;

describe('Property 6: CTA geometry never overlaps and keeps order', () => {
  it('keeps CTAs separate, ordered, inside the text block and large enough for any label growth', () => {
    fc.assert(
      fc.property(viewport, scale, scale, (v, sp, ss) => {
        const layout = computeHeroLayout(v);
        const [np, ns] = layout.ctaLabelWidths;
        const { primary, secondary, arrangement } = layout.ctas([np * sp, ns * ss]);
        const text = layout.textBlock;
        const at = `${v.width}×${v.height} (${layout.band}), labels ×${sp.toFixed(3)} / ×${ss.toFixed(3)}, ${arrangement}`;

        // No overlap and at least 8 px apart.
        expect(intersectionArea(primary, secondary), `overlap at ${at}`).toBe(0);
        expect(rectGap(primary, secondary), `spacing at ${at}`).toBeGreaterThanOrEqual(MIN_SPACING - EPS);

        // Primary above Secondary, or left of it on the same row.
        const above = bottom(primary) <= secondary.y + EPS;
        const leftOf = Math.abs(primary.y - secondary.y) <= EPS && right(primary) <= secondary.x + EPS;
        expect(above || leftOf, `order at ${at}`).toBe(true);

        // Inside the text block's inline extent.
        for (const r of [primary, secondary]) {
          expect(r.x, `inline start at ${at}`).toBeGreaterThanOrEqual(text.x - EPS);
          expect(right(r), `inline end at ${at}`).toBeLessThanOrEqual(right(text) + EPS);
        }

        // Arrangement per band.
        if (v.width < BREAKPOINT.md) {
          expect(arrangement, `arrangement at ${at}`).toBe('stack');
          expect(primary.w).toBeCloseTo(text.w, 6);
          expect(secondary.w).toBeCloseTo(text.w, 6);
          expect(secondary.y - bottom(primary)).toBeCloseTo(CTA.stackGap, 6);
        } else if (arrangement === 'row') {
          expect(secondary.x - right(primary)).toBeCloseTo(CTA.rowGap, 6);
        } else {
          expect(arrangement, `arrangement at ${at}`).toBe('wrap');
          // Wrapping only happens when the row does not fit.
          expect(right(primary) + CTA.rowGap + secondary.w, `needless wrap at ${at}`).toBeGreaterThan(right(text) - EPS);
          expect(secondary.y - bottom(primary)).toBeCloseTo(CTA.wrapGap, 6);
        }

        // Hit areas and minimum heights.
        const minH = v.width >= BREAKPOINT.lg ? CTA.minHeight.lg : CTA.minHeight.base;
        for (const r of [primary, secondary]) {
          expect(r.w, `target width at ${at}`).toBeGreaterThanOrEqual(MIN_TARGET);
          expect(r.h, `target height at ${at}`).toBeGreaterThanOrEqual(Math.max(MIN_TARGET, minH));
        }
      }),
    );
  });

  it('places the nominal CTA group fully inside the text block', () => {
    fc.assert(
      fc.property(viewport, (v) => {
        const { cta, textBlock: t } = computeHeroLayout(v);
        const g = cta.group;
        expect(g.x).toBeGreaterThanOrEqual(t.x - EPS);
        expect(g.y).toBeGreaterThanOrEqual(t.y - EPS);
        expect(right(g)).toBeLessThanOrEqual(right(t) + EPS);
        expect(bottom(g)).toBeLessThanOrEqual(bottom(t) + EPS);
      }),
    );
  });
});
