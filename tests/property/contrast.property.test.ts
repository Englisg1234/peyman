// Feature: cinematic-hero, Property 5: Allowed pairings meet contrast; forbidden pairings are absent
// **Validates: Requirements 4.1, 4.8, 12.1, 12.2**
//
// For any entry in PAIRINGS, its contrast ratio meets its threshold (4.5
// normal, 3 large/UI) and matches the recorded value to two decimals. No
// entry pairs a gold surface with text other than ink-950, and every
// forbidden pairing is below 4.5:1 and absent from PAIRINGS. The underlying
// contrastRatio is symmetric, bounded to [1, 21], and alpha = 1 compositing
// equals the opaque color.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_PAIRINGS,
  PAIRINGS,
  PALETTE,
  THRESHOLDS,
  contrastRatio,
  pairingRatio,
  round2,
  type Composite,
  type PaletteToken,
} from '@/lib/contrast';

const TOKENS = Object.keys(PALETTE) as PaletteToken[];
const GOLD: readonly PaletteToken[] = ['gold-500', 'gold-300', 'gold-100'];

const token = fc.constantFrom(...TOKENS);
const pairing = fc.constantFrom(...PAIRINGS);
const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);

/** The opaque color a surface is painted with (a composite's top color counts). */
const surfaceColor = (s: PaletteToken | Composite): PaletteToken => (typeof s === 'string' ? s : s.color);
const sameSurface = (a: PaletteToken | Composite, b: PaletteToken | Composite): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

describe('Property 5: contrast pairings', () => {
  it('every registered pairing meets its threshold and its recorded ratio', () => {
    fc.assert(
      fc.property(pairing, (p) => {
        const ratio = pairingRatio(p);
        expect(ratio).toBeGreaterThanOrEqual(THRESHOLDS[p.kind]);
        expect(round2(ratio)).toBe(p.expected);
      }),
    );
  });

  it('no registered pairing puts text other than ink-950 on a gold surface', () => {
    fc.assert(
      fc.property(pairing, (p) => {
        if (GOLD.includes(surfaceColor(p.surface))) expect(p.text).toBe('ink-950');
      }),
    );
    fc.assert(
      fc.property(token, fc.constantFrom(...GOLD), (text, surface) => {
        fc.pre(text !== 'ink-950');
        expect(PAIRINGS.some((p) => p.text === text && surfaceColor(p.surface) === surface)).toBe(false);
      }),
    );
  });

  it('forbidden pairings are below 4.5:1, match their recorded ratio and are absent from PAIRINGS', () => {
    expect(FORBIDDEN_PAIRINGS.length).toBeGreaterThan(0);
    fc.assert(
      fc.property(fc.constantFrom(...FORBIDDEN_PAIRINGS), (f) => {
        const ratio = pairingRatio(f);
        expect(ratio).toBeLessThan(THRESHOLDS.normal);
        expect(round2(ratio)).toBe(f.expected);
        expect(PAIRINGS.some((p) => p.text === f.text && sameSurface(p.surface, f.surface))).toBe(false);
      }),
    );
  });

  it('contrastRatio is symmetric and within [1, 21] for any opaque colors', () => {
    fc.assert(
      fc.property(hex, hex, (a, b) => {
        const ab = contrastRatio(a, b);
        expect(ab).toBeCloseTo(contrastRatio(b, a), 12);
        expect(ab).toBeGreaterThanOrEqual(1);
        expect(ab).toBeLessThanOrEqual(21 + 1e-9);
      }),
    );
  });

  it('contrastRatio stays within [1, 21] for any foreground alpha', () => {
    fc.assert(
      fc.property(hex, hex, fc.double({ min: 0, max: 1, noNaN: true }), (a, b, alpha) => {
        const r = contrastRatio(a, b, alpha);
        expect(r).toBeGreaterThanOrEqual(1 - 1e-12);
        expect(r).toBeLessThanOrEqual(21 + 1e-9);
      }),
    );
  });

  it('alpha = 1 compositing equals the opaque color', () => {
    fc.assert(
      fc.property(hex, hex, (a, b) => {
        expect(contrastRatio(a, b, 1)).toBe(contrastRatio(a, b));
      }),
    );
    fc.assert(
      fc.property(token, token, token, (text, surface, under) => {
        const opaque = contrastRatio(PALETTE[text], PALETTE[surface]);
        expect(pairingRatio({ text, textAlpha: 1, surface })).toBe(opaque);
        expect(pairingRatio({ text, surface: { color: surface, alpha: 1, over: under } })).toBeCloseTo(opaque, 12);
      }),
    );
  });
});
