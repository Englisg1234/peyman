// Feature: cinematic-hero, Property 11: Easing curves stay in range
// **Validates: Requirements 9.2**
//
// For any t in [0, 1], both cubicBezier(curve.entrance) and
// cubicBezier(curve.state) return a value in [0, 1] that is non-decreasing
// in t, with f(0) = 0 and f(1) = 1.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { cubicBezier } from '@/lib/ease';
import { curve, type CurveToken } from '@/lib/motion-tokens';

const tokens = Object.keys(curve) as CurveToken[];

const easeFor = (token: CurveToken) => {
  const [x1, y1, x2, y2] = curve[token];
  return cubicBezier(x1, y1, x2, y2);
};

/** Progress values in the closed interval [0, 1], endpoints included. */
const progress = fc.oneof(
  fc.constantFrom(0, 1),
  fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
);

describe.each(tokens)('Property 11: curve.%s', (token) => {
  const f = easeFor(token);

  it('pins the endpoints: f(0) = 0 and f(1) = 1', () => {
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
  });

  it('returns a value in [0, 1] for any t in [0, 1]', () => {
    fc.assert(
      fc.property(progress, (t) => {
        const y = f(t);
        return Number.isFinite(y) && y >= 0 && y <= 1;
      }),
    );
  });

  it('is non-decreasing in t', () => {
    fc.assert(
      fc.property(progress, progress, (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        return f(lo) <= f(hi);
      }),
    );
  });
});
