// Feature: cinematic-hero, Property 1: Headline size is bounded and non-decreasing
// **Validates: Requirements 6.8, 11.4**
//
// For any two viewport widths w1 ≤ w2 in [320, 3840] (integers),
// headlineFontSize(w1) ≤ headlineFontSize(w2), and both lie in [36, 84]
// (within the required [36, 88]).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { headlineFontSize } from '@/lib/layout-model';

const MIN_PX = 36;
const MAX_PX = 84;
/** Requirement 6.8 upper bound; the design's 84 px must sit inside it. */
const REQUIRED_MAX_PX = 88;

const width = fc.integer({ min: 320, max: 3840 });
/** Two widths ordered so that w1 ≤ w2. */
const orderedWidths = fc
  .tuple(width, width)
  .map(([a, b]): readonly [number, number] => (a <= b ? [a, b] : [b, a]));

describe('Property 1: headline size ramp', () => {
  it('is bounded to [36, 84] and non-decreasing for any w1 ≤ w2 in [320, 3840]', () => {
    fc.assert(
      fc.property(orderedWidths, ([w1, w2]) => {
        const s1 = headlineFontSize(w1);
        const s2 = headlineFontSize(w2);

        expect(s1).toBeLessThanOrEqual(s2);
        for (const s of [s1, s2]) {
          expect(Number.isFinite(s)).toBe(true);
          expect(s).toBeGreaterThanOrEqual(MIN_PX);
          expect(s).toBeLessThanOrEqual(MAX_PX);
          expect(s).toBeLessThanOrEqual(REQUIRED_MAX_PX);
        }
      }),
    );
  });

  it('hits the documented end points (36 px at 320, 84 px from 1920)', () => {
    expect(headlineFontSize(320)).toBe(MIN_PX);
    expect(headlineFontSize(1919)).toBe(68);
    expect(headlineFontSize(1920)).toBe(MAX_PX);
    expect(headlineFontSize(3840)).toBe(MAX_PX);
  });
});
