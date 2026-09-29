// WCAG 2.x contrast module and the Palette pairing registry (Req 4.8, 12.1, 12.2).
//
// Pure and framework-free. This is the source of truth for which text/surface
// and UI pairings the Hero and Site_Header may use. It is used by tests only;
// components never import it (colors come from the `@theme` tokens in
// app/globals.css, which must stay equal to PALETTE below).

/** Palette token hex values (Req 4.1). Mirrors `@theme` in app/globals.css. */
export const PALETTE = {
  'ink-950': '#05070C',
  'navy-950': '#040E23',
  'navy-900': '#0A1A36',
  'navy-800': '#071E46',
  'gold-500': '#C59655',
  'gold-300': '#D6AE72',
  'gold-100': '#F6E7C4',
  'ivory-50': '#F4EFE4',
  'ivory-300': '#B8B2A5',
} as const;

export type PaletteToken = keyof typeof PALETTE;

/** A token painted at `alpha` over an opaque token (e.g. the scrolled header layer). */
export interface Composite {
  color: PaletteToken;
  alpha: number;
  over: PaletteToken;
}

export type PairingKind = 'normal' | 'large' | 'ui';

/** Minimum ratios from Req 12.1. */
export const THRESHOLDS: Readonly<Record<PairingKind, number>> = { normal: 4.5, large: 3, ui: 3 };

export interface Pairing {
  /** Foreground: text color, or the UI boundary color (e.g. a CTA border). */
  text: PaletteToken;
  /** Foreground opacity in [0, 1]; defaults to 1. */
  textAlpha?: number;
  surface: PaletteToken | Composite;
  kind: PairingKind;
  /** Recorded ratio, rounded to two decimals (Req 12.2 or design contrast list). */
  expected: number;
  /** Where the recorded value comes from. */
  source: 'req-12.2' | 'design';
}

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new RangeError(`contrast: expected #RRGGBB, received "${hex}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function checkAlpha(alpha: number): void {
  if (!(alpha >= 0 && alpha <= 1)) throw new RangeError(`contrast: alpha must be in [0, 1], received ${alpha}`);
}

/** Source-over compositing in sRGB space (as browsers paint), channels 0–255. */
function composite(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as unknown as Rgb;
}

/** WCAG 2.x relative luminance of an opaque sRGB color with channels 0–255. */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratioOf(fg: Rgb, bg: Rgb): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * WCAG 2.x contrast ratio of `fgHex` painted at `fgAlpha` over the opaque
 * `bgHex`. The foreground is alpha-composited onto the background first.
 * Returns the unrounded ratio in [1, 21].
 */
export function contrastRatio(fgHex: string, bgHex: string, fgAlpha = 1): number {
  checkAlpha(fgAlpha);
  const bg = hexToRgb(bgHex);
  return ratioOf(composite(hexToRgb(fgHex), bg, fgAlpha), bg);
}

/** Opaque RGB of a surface token or composite surface. */
function surfaceRgb(surface: PaletteToken | Composite): Rgb {
  if (typeof surface === 'string') return hexToRgb(PALETTE[surface]);
  checkAlpha(surface.alpha);
  return composite(hexToRgb(PALETTE[surface.color]), hexToRgb(PALETTE[surface.over]), surface.alpha);
}

/** Unrounded contrast ratio of a registry pairing. */
export function pairingRatio(p: Pick<Pairing, 'text' | 'textAlpha' | 'surface'>): number {
  const alpha = p.textAlpha ?? 1;
  checkAlpha(alpha);
  const bg = surfaceRgb(p.surface);
  return ratioOf(composite(hexToRgb(PALETTE[p.text]), bg, alpha), bg);
}

/** Round to two decimals, as Req 12.2 records ratios. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Scrolled Site_Header background: `ink-950` at 88% over `navy-900` (design Header system). */
export const SCROLLED_HEADER: Composite = { color: 'ink-950', alpha: 0.88, over: 'navy-900' };

/** Secondary_CTA border opacity (design CTA system, delta D6). */
export const SECONDARY_BORDER_ALPHA = 0.44;

/** Every allowed text/surface and UI pairing. Anything else must be added here before use. */
export const PAIRINGS: readonly Pairing[] = [
  // Req 12.2
  { text: 'ivory-50', surface: 'ink-950', kind: 'normal', expected: 17.57, source: 'req-12.2' },
  { text: 'ivory-50', surface: 'navy-950', kind: 'normal', expected: 16.77, source: 'req-12.2' },
  { text: 'ivory-50', surface: 'navy-900', kind: 'normal', expected: 15.09, source: 'req-12.2' },
  { text: 'ivory-300', surface: 'ink-950', kind: 'normal', expected: 9.55, source: 'req-12.2' },
  { text: 'ivory-300', surface: 'navy-950', kind: 'normal', expected: 9.11, source: 'req-12.2' },
  { text: 'ivory-300', surface: 'navy-900', kind: 'normal', expected: 8.2, source: 'req-12.2' },
  { text: 'gold-500', surface: 'ink-950', kind: 'normal', expected: 7.55, source: 'req-12.2' },
  { text: 'gold-500', surface: 'navy-950', kind: 'normal', expected: 7.2, source: 'req-12.2' },
  { text: 'gold-500', surface: 'navy-900', kind: 'normal', expected: 6.48, source: 'req-12.2' },
  { text: 'ink-950', surface: 'gold-500', kind: 'normal', expected: 7.55, source: 'req-12.2' },
  { text: 'ink-950', surface: 'gold-300', kind: 'normal', expected: 9.75, source: 'req-12.2' },
  // Design contrast list: Mobile_Menu / navy-800 surfaces
  { text: 'ivory-50', surface: 'navy-800', kind: 'normal', expected: 14.27, source: 'design' },
  { text: 'ivory-300', surface: 'navy-800', kind: 'normal', expected: 7.75, source: 'design' },
  // Secondary_CTA outline (UI boundary)
  { text: 'ivory-50', textAlpha: SECONDARY_BORDER_ALPHA, surface: 'navy-950', kind: 'ui', expected: 3.93, source: 'design' },
  { text: 'ivory-50', textAlpha: SECONDARY_BORDER_ALPHA, surface: 'navy-900', kind: 'ui', expected: 3.87, source: 'design' },
  { text: 'ivory-50', textAlpha: SECONDARY_BORDER_ALPHA, surface: 'ink-950', kind: 'ui', expected: 3.9, source: 'design' },
  // Scrolled Site_Header
  { text: 'ivory-300', surface: SCROLLED_HEADER, kind: 'normal', expected: 9.43, source: 'design' },
];

/** Pairings that must never be used (Req 12.2), with their recorded ratio. */
export const FORBIDDEN_PAIRINGS: readonly Pick<Pairing, 'text' | 'surface' | 'expected'>[] = [
  { text: 'ivory-50', surface: 'gold-500', expected: 2.33 },
];
