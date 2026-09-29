// Hero layout oracle (design: Layout architecture, Headline line breaks).
//
// A pure, framework-free TypeScript mirror of the layout values that
// app/globals.css owns. It exists only as a test oracle: property tests use it
// to check geometry at every width, and Playwright checks the DOM against it
// (layout-model conformance). It is never imported by components.
//
// Task 3.2 provides bands, the headline size ramp, the measure caps and the
// line-count prediction. Task 10.1 adds computeHeroLayout(): emblem sizing,
// text-block, headline, copy and CTA rects, vertical rhythm, the parallax
// envelope and the gold-area budget. Task 12.1 implements the same values in
// CSS; Playwright (task 12.2) checks the DOM against this model within 1 px.

import { distance } from './motion-tokens';

/** Root font size assumed by every rem value (Req 6.8: 16 px root, 100% zoom). */
export const ROOT_FONT_PX = 16;

// ---------------------------------------------------------------------------
// Viewports and bands
// ---------------------------------------------------------------------------

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** CSS px viewport. `safe` mirrors env(safe-area-inset-*) (0 when omitted). */
export interface Viewport {
  width: number;
  height: number;
  safe?: Insets;
}

export type Band = 'mobile' | 'mobile-compact' | 'landscape' | 'tablet' | 'desktop' | 'wide' | 'ultra';

/** Min-width breakpoints from the `@theme` in app/globals.css (md / lg / xl / 3xl). */
export const BREAKPOINT = { md: 768, lg: 1024, xl: 1280, ultra: 1920 } as const;

/** `landscape-short` variant: orientation landscape, height < 480, width < 1024. */
export const LANDSCAPE_SHORT_MAX_HEIGHT = 480;
/** `compact` variant: orientation portrait, height < 720, width < 768. */
export const COMPACT_MAX_HEIGHT = 720;

/** CSS `orientation: landscape` matches only when width > height. */
function isLandscape(width: number, height: number): boolean {
  return width > height;
}

/**
 * Layout band for a viewport, mirroring the media queries in app/globals.css.
 * `landscape-short` takes precedence over the width bands below 1024 px.
 */
export function bandFor(width: number, height: number): Band {
  if (width < BREAKPOINT.lg && height < LANDSCAPE_SHORT_MAX_HEIGHT && isLandscape(width, height)) {
    return 'landscape';
  }
  if (width < BREAKPOINT.md) {
    return !isLandscape(width, height) && height < COMPACT_MAX_HEIGHT ? 'mobile-compact' : 'mobile';
  }
  if (width < BREAKPOINT.lg) return 'tablet';
  if (width < BREAKPOINT.xl) return 'desktop';
  if (width < BREAKPOINT.ultra) return 'wide';
  return 'ultra';
}

// ---------------------------------------------------------------------------
// Grid geometry needed by the headline measure (extended in task 10.1)
// ---------------------------------------------------------------------------

export interface BandGrid {
  columns: 4 | 8 | 12;
  gap: number;
  /** 1-based inclusive column span of the text block (landscape uses a 60/40 split instead). */
  textSpan: readonly [number, number];
  /** Content box max width in px, or null when uncapped. */
  contentMax: number | null;
}

export const BAND_GRID: Readonly<Record<Band, BandGrid>> = {
  mobile: { columns: 4, gap: 16, textSpan: [1, 4], contentMax: null },
  'mobile-compact': { columns: 4, gap: 16, textSpan: [1, 4], contentMax: null },
  // Landscape phone: text 60% / emblem 40% with a 24 px gap (design Layout table).
  landscape: { columns: 4, gap: 24, textSpan: [1, 4], contentMax: null },
  tablet: { columns: 8, gap: 24, textSpan: [1, 5], contentMax: null },
  desktop: { columns: 12, gap: 32, textSpan: [1, 7], contentMax: null },
  wide: { columns: 12, gap: 32, textSpan: [1, 7], contentMax: 1360 },
  ultra: { columns: 12, gap: 32, textSpan: [1, 7], contentMax: 1680 },
};

/** Landscape text column share of the content box after the gap. */
export const LANDSCAPE_TEXT_SHARE = 0.6;

const clamp = (min: number, value: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Inline gutters per side:
 * - below 768 (and landscape): `max(20px, env(safe-area-inset-*))`
 * - from 768: `max(clamp(40px, 4vw, 80px), env(safe-area-inset-*))`
 */
export function gutters(v: Viewport): { left: number; right: number } {
  const band = bandFor(v.width, v.height);
  const base = band === 'mobile' || band === 'mobile-compact' || band === 'landscape'
    ? 20
    : clamp(40, 0.04 * v.width, 80);
  return {
    left: Math.max(base, v.safe?.left ?? 0),
    right: Math.max(base, v.safe?.right ?? 0),
  };
}

/** Content box inline size: viewport minus gutters, capped per band (1360 / 1680). */
export function contentWidth(v: Viewport): number {
  const g = gutters(v);
  const available = Math.max(0, v.width - g.left - g.right);
  const cap = BAND_GRID[bandFor(v.width, v.height)].contentMax;
  return cap === null ? available : Math.min(available, cap);
}

/** Inline size of the text block, which is the headline's inline-size container. */
export function textBlockWidth(v: Viewport): number {
  const band = bandFor(v.width, v.height);
  const grid = BAND_GRID[band];
  const content = contentWidth(v);
  if (band === 'landscape') return (content - grid.gap) * LANDSCAPE_TEXT_SHARE;
  const colWidth = (content - (grid.columns - 1) * grid.gap) / grid.columns;
  const span = grid.textSpan[1] - grid.textSpan[0] + 1;
  return span * colWidth + (span - 1) * grid.gap;
}

// ---------------------------------------------------------------------------
// Headline size ramp (design delta D2)
// ---------------------------------------------------------------------------

/** `clamp(2.25rem, 0.29rem + 4.13vw, 4.25rem)` below 1920; `5.25rem` from 1920. */
export const HEADLINE_RAMP = {
  minPx: 2.25 * ROOT_FONT_PX,
  interceptPx: 0.29 * ROOT_FONT_PX,
  vwCoefficient: 4.13,
  maxPx: 4.25 * ROOT_FONT_PX,
  ultraPx: 5.25 * ROOT_FONT_PX,
} as const;

/** Headline computed font size in px for a viewport width (36–84 px, non-decreasing). */
export function headlineFontSize(viewportWidth: number): number {
  if (viewportWidth >= BREAKPOINT.ultra) return HEADLINE_RAMP.ultraPx;
  const fluid = HEADLINE_RAMP.interceptPx + (HEADLINE_RAMP.vwCoefficient * viewportWidth) / 100;
  return clamp(HEADLINE_RAMP.minPx, fluid, HEADLINE_RAMP.maxPx);
}

// ---------------------------------------------------------------------------
// Headline measure caps and line prediction
// ---------------------------------------------------------------------------

/**
 * Minimum measure (em) needed for the headline to fit in N lines, i.e. the
 * narrowest N-line arrangement's longest line. Greedy wrapping minimizes the
 * line count, so the headline takes N lines exactly when the measure lies in
 * [T(N), T(N-1)). `text-wrap: balance` keeps that count.
 *
 * Measured with fontTools from Inter 4.001 (google/fonts `Inter[opsz,wght]`),
 * wght 400, opsz 14 (the default instance), hmtx advances with −0.02em tracking
 * per character and no kerning. These are upper bounds; the Display cut and
 * kerning make real lines narrower. See docs/decisions.md (task 3.2).
 */
export const HEADLINE_LINE_THRESHOLDS_EM = [
  { lines: 2, minEm: 15.805 }, // Bridging the Gap Between / Innovation and Institutional Capital.
  { lines: 3, minEm: 10.811 }, // Bridging the Gap / Between Innovation / and Institutional Capital.
  { lines: 4, minEm: 8.845 }, // Bridging the Gap / Between / Innovation and / Institutional Capital.
  { lines: 5, minEm: 6.699 }, // Bridging the / Gap Between / Innovation and / Institutional / Capital.
] as const;

/**
 * Width ratio of the Display cut (opsz 32, what `font-optical-sizing: auto`
 * selects at ≥ 32 px) to the opsz 14 thresholds above. Measured 0.9091–0.9131
 * across the arrangements; the minimum is used so danger zones are widest.
 */
export const HEADLINE_DISPLAY_RATIO = 0.909;

/** Advance of "0" in Inter opsz 32 (em), which resolves the `ch` unit. */
export const INTER_DISPLAY_CH_EM = 0.6133;

/**
 * Measure caps on the h1 by text-container inline size (container queries).
 * Chosen so each cap sits outside every danger zone [T·r, T] for
 * r = HEADLINE_DISPLAY_RATIO, keeping the line count identical for the
 * fallback and Display-cut renders (Req 16.3):
 * - < 335 px:   7.6em → 5 lines (zone 6.699 … 8.041)
 * - 335–403 px: 9.4em → 4 lines (zone 8.845 … 9.828)
 * - ≥ 404 px:   min(13em, 20ch) → 3 lines (zone 10.811 … 14.367)
 */
export const HEADLINE_MEASURE_CAPS = {
  narrow: { belowContainerPx: 335, capEm: 7.6 },
  medium: { belowContainerPx: 404, capEm: 9.4 },
  wide: { capEm: 13, capCh: 20 },
} as const;

export type HeadlineLines = 2 | 3 | 4 | 5 | 6;

/**
 * Headline measure in em: the container width in em, limited by the cap for
 * that container size. `chEm` is the `ch` unit in em for the rendering font.
 */
export function headlineMeasureEm(containerPx: number, fontPx: number, chEm: number = INTER_DISPLAY_CH_EM): number {
  const availableEm = containerPx / fontPx;
  const caps = HEADLINE_MEASURE_CAPS;
  let capEm: number;
  if (containerPx < caps.narrow.belowContainerPx) capEm = caps.narrow.capEm;
  else if (containerPx < caps.medium.belowContainerPx) capEm = caps.medium.capEm;
  else capEm = Math.min(caps.wide.capEm, caps.wide.capCh * chEm);
  return Math.min(availableEm, capEm);
}

/**
 * Predicted headline line count for a measure (em). `ratio` scales the opsz 14
 * thresholds to another cut: 1 for the upper-bound metrics,
 * HEADLINE_DISPLAY_RATIO for the Display cut. 6 means "6 or more".
 */
export function predictLines(measureEm: number, ratio: number = 1): HeadlineLines {
  for (const t of HEADLINE_LINE_THRESHOLDS_EM) {
    if (measureEm >= t.minEm * ratio) return t.lines;
  }
  return 6;
}

/** Danger zones [T·ratio, T]: a measure inside one may change line count across the font swap. */
export function headlineDangerZones(ratio: number = HEADLINE_DISPLAY_RATIO): readonly (readonly [number, number])[] {
  return HEADLINE_LINE_THRESHOLDS_EM.map((t) => [t.minEm * ratio, t.minEm] as const);
}

export interface HeadlineModel {
  band: Band;
  fontSize: number;
  containerPx: number;
  measureEm: number;
  /** Line count under the Display-cut metrics (the shipped render). */
  lines: HeadlineLines;
}

/** Headline size, measure and predicted line count for a viewport. */
export function headlineModel(v: Viewport): HeadlineModel {
  const fontSize = headlineFontSize(v.width);
  const containerPx = textBlockWidth(v);
  const measureEm = headlineMeasureEm(containerPx, fontSize);
  return {
    band: bandFor(v.width, v.height),
    fontSize,
    containerPx,
    measureEm,
    lines: predictLines(measureEm, HEADLINE_DISPLAY_RATIO),
  };
}

// ===========================================================================
// Hero layout (task 10.1)
// ===========================================================================
//
// Coordinates are CSS px relative to the document at scroll 0. The Hero starts
// at y = 0 under the fixed Site_Header, so the region below the header begins
// at `headerHeight`. The viewport `height` stands for the small viewport
// height (svh). All values are unrounded; conformance checks allow 1 px.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

// ---------------------------------------------------------------------------
// Constants mirrored from CSS and the measured emblem master
// ---------------------------------------------------------------------------

/**
 * Emblem slot aspect ratio (width / height). Measured master 1003×1144
 * (task 4.1, assets/emblem/README.md), within ±1% of 972/1108.
 */
export const EMBLEM_ASPECT = 1003 / 1144;
/** Column-axis anchor (fractions of the slot), the transform origin. */
export const EMBLEM_ANCHOR = { x: 0.278, y: 0.499 } as const;
/** Emblem width caps per desktop band (Req 5.5, 11.2–11.4). */
export const EMBLEM_MAX_WIDTH = { desktop: 460, wide: 580, ultra: 620 } as const;

/** Mobile emblem height rules: `clamp(min, svh·vh, max)` (Req 10.2, 10.3). */
export const MOBILE_EMBLEM_HEIGHT = {
  tall: { min: 120, svh: 0.22, max: 200 },
  compact: { min: 96, svh: 0.16, max: 140 },
} as const;
/** Landscape phone: emblem height ≤ 70svh (Req 10.7). Tablet: ≤ 46svh (Req 11.1). */
export const LANDSCAPE_EMBLEM_MAX_SVH = 0.7;
export const TABLET_EMBLEM_MAX_SVH = 0.46;

/** 1-based inclusive emblem column spans (design D3; tablet 6–8). */
export const EMBLEM_SPAN: Readonly<Partial<Record<Band, readonly [number, number]>>> = {
  tablet: [6, 8],
  desktop: [8, 12],
  wide: [8, 12],
  ultra: [8, 12],
};

/** Site_Header height excluding env(safe-area-inset-top) (Req 7.2, 10.11). */
export const HEADER_HEIGHT = { base: 64, lg: 72, landscape: 56 } as const;

/** Headline line-height (Display role). */
export const HEADLINE_LINE_HEIGHT = 1.06;

/** Body role: `clamp(1rem, 0.95rem + 0.3vw, 1.25rem)`, line-height 1.55, max 46ch. */
export const BODY = {
  minPx: 16,
  interceptPx: 0.95 * ROOT_FONT_PX,
  vwCoefficient: 0.3,
  maxPx: 20,
  lineHeight: 1.55,
  maxCh: 46,
} as const;

/**
 * Mobile vertical rhythm (tall band). The compact band multiplies every value
 * by COMPACT_RHYTHM_SCALE (Req 10.3). Landscape uses the tall values.
 */
export const MOBILE_RHYTHM = {
  padTop: 24,
  emblemToHeadline: 32,
  headlineToCopy: 20,
  copyToCta: 28,
  padBottom: 24,
} as const;
export const COMPACT_RHYTHM_SCALE = 0.75;

/** ≥ 768 rhythm: headline→copy `clamp(24px, 2vw, 32px)`, copy→CTA `clamp(32px, 3vw, 48px)`. */
export const WIDE_RHYTHM = {
  headlineToCopy: { min: 24, vw: 2, max: 32 },
  copyToCta: { min: 32, vw: 3, max: 48 },
  /** Minimum block padding above and below each centered column (Req 11.5). */
  blockPadMin: 48,
} as const;

/** CTA box model, mirroring `.btn` and `type-cta` in app/globals.css. */
export const CTA = {
  stackGap: 12,
  rowGap: 16,
  wrapGap: 12,
  border: 1,
  paddingBlock: 12,
  paddingInline: { base: 20, md: 28 },
  minHeight: { base: 48, lg: 52 },
  fontPx: { base: 15, lg: 16 },
  lineHeight: 1.2,
} as const;

/** Pointer_Parallax bounds used for the envelope (Req 2.8, 9.7). */
export const PARALLAX_ENVELOPE = {
  translate: distance.parallaxMax,
  rotateDeg: distance.rotateMaxDeg,
  /** `perspective(1200px)` applied with the rotation (design Layout architecture). */
  perspective: 1200,
} as const;

/** Gold area budget (Req 4.3). */
export const GOLD_AREA_MAX = 0.08;

// ---------------------------------------------------------------------------
// Measured text metrics (Inter 4.001, fontTools, hmtx advances, no kerning)
// ---------------------------------------------------------------------------
//
// Widths in em at opsz 14 and opsz 32; Inter's opsz axis interpolates linearly
// between them, and `font-optical-sizing: auto` sets opsz to the font size in
// px (clamped to 14–32). See docs/decisions.md (task 10.1).

/** Linear opsz interpolation factor for a font size in px. */
export function opszFactor(fontPx: number): number {
  return clamp(0, (fontPx - 14) / 18, 1);
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface Segment {
  text: string;
  em14: number;
  em32: number;
  /** A space follows (false: a break opportunity after a hyphen, or the end). */
  spaceAfter: boolean;
}

/** Space advance, wght 400. */
const SPACE_EM = { em14: 0.2812, em32: 0.25 } as const;

/**
 * Supporting_Copy split at its break opportunities (spaces, and after the
 * hyphen in "high-growth"), wght 400, tracking 0.
 */
export const SUPPORTING_COPY_SEGMENTS: readonly Segment[] = [
  { text: 'Strategic', em14: 4.2437, em32: 3.9067, spaceAfter: true },
  { text: 'financial,', em14: 4.2607, em32: 3.7959, spaceAfter: true },
  { text: 'legal', em14: 2.2422, em32: 2.0312, spaceAfter: true },
  { text: 'and', em14: 1.7646, em32: 1.6299, spaceAfter: true },
  { text: 'government', em14: 5.7021, em32: 5.2642, spaceAfter: true },
  { text: 'advisory', em14: 4.0439, em32: 3.6582, spaceAfter: true },
  { text: 'for', em14: 1.3462, em32: 1.1772, spaceAfter: true },
  { text: 'high-', em14: 2.498, em32: 2.2939, spaceAfter: false },
  { text: 'growth', em14: 3.3262, em32: 3.0464, spaceAfter: true },
  { text: 'businesses', em14: 5.314, em32: 4.8359, spaceAfter: true },
  { text: 'navigating', em14: 4.9048, em32: 4.4946, spaceAfter: true },
  { text: 'complex', em14: 4.0303, em32: 3.7251, spaceAfter: true },
  { text: 'transactions,', em14: 6.0923, em32: 5.52, spaceAfter: true },
  { text: 'capital', em14: 3.1182, em32: 2.8467, spaceAfter: true },
  { text: 'and', em14: 1.7646, em32: 1.6299, spaceAfter: true },
  { text: 'regulation.', em14: 5.0156, em32: 4.5269, spaceAfter: false },
];

/** The text the segments reproduce (compare with Site_Config in tests). */
export const SUPPORTING_COPY_TEXT = SUPPORTING_COPY_SEGMENTS.map((s) => s.text + (s.spaceAfter ? ' ' : '')).join('');

/** `ch` (advance of "0") in em, wght 400. */
const ZERO_EM = { em14: 0.6309, em32: 0.6133 } as const;

/**
 * CTA label advances in em, wght 500, including the 0.02em letter-spacing
 * after every character (Chrome applies it to the last character too).
 */
export const CTA_LABEL_EM = {
  primary: { text: 'Start a Conversation', em14: 10.1744, em32: 9.5016 },
  secondary: { text: 'Explore Advisory', em14: 8.4533, em32: 7.8122 },
} as const;

/** Tolerance for "fits on the line" comparisons (em). */
const FIT_EPSILON = 1e-6;

/**
 * Greedy line count for segments in a measure (em). Browsers wrap greedily;
 * `text-wrap: pretty` only re-balances the final lines and keeps the count.
 */
export function wrapLineCount(segments: readonly Segment[], measureEm: number, t: number): number {
  const space = lerp(SPACE_EM.em14, SPACE_EM.em32, t);
  let lines = 1;
  let lineEm = 0;
  let spaceBefore = false;
  for (const seg of segments) {
    const w = lerp(seg.em14, seg.em32, t);
    if (lineEm === 0) {
      lineEm = w;
    } else {
      const add = (spaceBefore ? space : 0) + w;
      if (lineEm + add <= measureEm + FIT_EPSILON) {
        lineEm += add;
      } else {
        lines += 1;
        lineEm = w;
      }
    }
    spaceBefore = seg.spaceAfter;
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Per-band helpers
// ---------------------------------------------------------------------------

/** Site_Header height for a viewport, including env(safe-area-inset-top). */
export function headerHeightFor(v: Viewport): number {
  const band = bandFor(v.width, v.height);
  const base = band === 'landscape' ? HEADER_HEIGHT.landscape : v.width >= BREAKPOINT.lg ? HEADER_HEIGHT.lg : HEADER_HEIGHT.base;
  return base + (v.safe?.top ?? 0);
}

/** Supporting_Copy font size in px for a viewport width (16–20). */
export function bodyFontSize(viewportWidth: number): number {
  return clamp(BODY.minPx, BODY.interceptPx + (BODY.vwCoefficient * viewportWidth) / 100, BODY.maxPx);
}

/** Supporting_Copy box width (min(container, 46ch)) and line count. */
export function copyModel(containerPx: number, viewportWidth: number): { fontSize: number; w: number; lines: number; h: number } {
  const fontSize = bodyFontSize(viewportWidth);
  const t = opszFactor(fontSize);
  const w = Math.min(containerPx, BODY.maxCh * lerp(ZERO_EM.em14, ZERO_EM.em32, t) * fontSize);
  const lines = wrapLineCount(SUPPORTING_COPY_SEGMENTS, w / fontSize, t);
  return { fontSize, w, lines, h: lines * fontSize * BODY.lineHeight };
}

/** Nominal CTA label widths in px [primary, secondary] for a viewport width. */
export function ctaLabelWidths(viewportWidth: number): [number, number] {
  const fontPx = viewportWidth >= BREAKPOINT.lg ? CTA.fontPx.lg : CTA.fontPx.base;
  const t = opszFactor(fontPx);
  return [
    lerp(CTA_LABEL_EM.primary.em14, CTA_LABEL_EM.primary.em32, t) * fontPx,
    lerp(CTA_LABEL_EM.secondary.em14, CTA_LABEL_EM.secondary.em32, t) * fontPx,
  ];
}

export type CtaArrangement = 'stack' | 'row' | 'wrap';

export interface CtaRects {
  primary: Rect;
  secondary: Rect;
  arrangement: CtaArrangement;
  /** Bounding box of both CTAs (the `.cta-group`). */
  group: Rect;
}

/**
 * CTA rects for given label widths (px), placed at the CTA group origin.
 * - Below 768: stacked, each the full text-block width, 12 px apart (Req 10.5).
 * - From 768: one row with a 16 px gap when both fit, else the Secondary wraps
 *   to a second row 12 px below (Req 11.6, 11.8).
 * Each box is label + inline padding + 1 px borders, at most the text width;
 * a label that does not fit wraps inside its button, which grows taller
 * (min-block-size, never a fixed height; Req 12.7). Row items stretch to the
 * row height (flex `align-items: stretch`).
 */
export function layoutCtas(labelWidths: readonly [number, number], origin: { x: number; y: number }, textWidth: number, viewportWidth: number): CtaRects {
  const lg = viewportWidth >= BREAKPOINT.lg;
  const md = viewportWidth >= BREAKPOINT.md;
  const fontPx = lg ? CTA.fontPx.lg : CTA.fontPx.base;
  const minH = lg ? CTA.minHeight.lg : CTA.minHeight.base;
  const chrome = 2 * (md ? CTA.paddingInline.md : CTA.paddingInline.base) + 2 * CTA.border;

  const box = (labelPx: number): { w: number; h: number; natural: number } => {
    const natural = labelPx + chrome;
    const w = md ? Math.min(natural, textWidth) : textWidth;
    const labelArea = Math.max(1, w - chrome);
    const lines = Math.max(1, Math.ceil(labelPx / labelArea - FIT_EPSILON));
    const h = Math.max(minH, lines * fontPx * CTA.lineHeight + 2 * (CTA.paddingBlock + CTA.border));
    return { w, h, natural };
  };

  const p = box(labelWidths[0]);
  const s = box(labelWidths[1]);
  let arrangement: CtaArrangement;
  let primary: Rect;
  let secondary: Rect;

  if (!md) {
    arrangement = 'stack';
    primary = { x: origin.x, y: origin.y, w: p.w, h: p.h };
    secondary = { x: origin.x, y: origin.y + p.h + CTA.stackGap, w: s.w, h: s.h };
  } else if (p.natural + CTA.rowGap + s.natural <= textWidth + FIT_EPSILON) {
    arrangement = 'row';
    const rowH = Math.max(p.h, s.h);
    primary = { x: origin.x, y: origin.y, w: p.w, h: rowH };
    secondary = { x: origin.x + p.w + CTA.rowGap, y: origin.y, w: s.w, h: rowH };
  } else {
    arrangement = 'wrap';
    primary = { x: origin.x, y: origin.y, w: p.w, h: p.h };
    secondary = { x: origin.x, y: origin.y + p.h + CTA.wrapGap, w: s.w, h: s.h };
  }
  return { primary, secondary, arrangement, group: unionRect(primary, secondary) };
}

// ---------------------------------------------------------------------------
// Rect utilities
// ---------------------------------------------------------------------------

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** Overlap area of two rects (0 when they only touch). */
export function intersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Edge-to-edge distance between two rects (0 when they touch or overlap). */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
}

/**
 * Worst-case emblem box under Pointer_Parallax: translated by up to
 * `translate` px on each axis, and rotated by up to `rotateDeg` about X and Y
 * around the anchor with `perspective(P)`. Conservative per side: the
 * perspective scale uses the largest depth any corner can reach, and rotateX
 * followed by rotateY can add |y|·sin²θ to x (and vice versa).
 */
export function parallaxEnvelope(emblem: Rect, anchor: { x: number; y: number } = EMBLEM_ANCHOR, bounds = PARALLAX_ENVELOPE): Rect {
  const theta = (bounds.rotateDeg * Math.PI) / 180;
  const sin = Math.sin(theta);
  const left = anchor.x * emblem.w;
  const right = (1 - anchor.x) * emblem.w;
  const top = anchor.y * emblem.h;
  const bottom = (1 - anchor.y) * emblem.h;
  const dxMax = Math.max(left, right);
  const dyMax = Math.max(top, bottom);
  const zMax = (dxMax + dyMax) * sin;
  const scale = bounds.perspective / (bounds.perspective - zMax);
  const grow = (d: number, perp: number): number => (d + perp * sin * sin) * scale - d + bounds.translate;
  const gl = grow(left, dyMax);
  const gr = grow(right, dyMax);
  const gt = grow(top, dxMax);
  const gb = grow(bottom, dxMax);
  return { x: emblem.x - gl, y: emblem.y - gt, w: emblem.w + gl + gr, h: emblem.h + gt + gb };
}

// ---------------------------------------------------------------------------
// computeHeroLayout
// ---------------------------------------------------------------------------

export interface HeroRhythm {
  padTop: number;
  /** Mobile only (stacked emblem above the headline); 0 elsewhere. */
  emblemToHeadline: number;
  headlineToCopy: number;
  copyToCta: number;
  padBottom: number;
}

export interface HeroLayout {
  band: Band;
  viewport: Viewport;
  headerHeight: number;
  /** The Hero border box (full viewport width, grows with content; Req 10.6). */
  hero: Rect;
  /** Content box (gutters removed, capped and centered). Height equals the Hero's. */
  content: Rect;
  columns: { count: 4 | 8 | 12; gap: number; colWidth: number };
  rhythm: HeroRhythm;
  /** Text block: headline top to CTA group bottom (optional Etymology/Service_Index off in v1). */
  textBlock: Rect;
  headline: Rect & { fontSize: number; measureEm: number; lines: HeadlineLines };
  copy: Rect & { fontSize: number; lines: number };
  /** Nominal CTA label widths in px [primary, secondary]. */
  ctaLabelWidths: [number, number];
  /** CTAs at nominal label widths. */
  cta: CtaRects;
  /** CTAs for other label widths (e.g. 0.5×–2× nominal), anchored at the nominal group origin. */
  ctas: (labelWidths: readonly [number, number]) => CtaRects;
  /** The grid area the emblem is placed in (column span, landscape 40% column, mobile full width). */
  emblemArea: Rect;
  /** The emblem box, which is also the Emblem_Stage slot box. */
  emblem: Rect;
  /** The emblem box at maximum Pointer_Parallax (translation plus rotation projection). */
  emblemParallax: Rect;
  /** The gold plinth hairline (1 px) along the emblem base. */
  plinth: Rect;
  /** Every gold-painted rect: Primary_CTA fill and the plinth (no emphasis span in v1). */
  goldRects: Rect[];
  /** Summed gold area ÷ (Hero area − Emblem_Stage area) (Req 4.3). */
  goldAreaRatio: number;
}

function emblemAreaFor(v: Viewport, band: Band, content: Rect, textW: number, colWidth: number, gap: number): Rect {
  if (band === 'mobile' || band === 'mobile-compact') {
    // Stacked above the text, end-aligned (columns 3–4 at every mobile
    // Test_Viewport); the area is the full content width so the height rule
    // of Req 10.2 still holds where columns 3–4 are narrower than the emblem.
    return { x: content.x, y: 0, w: content.w, h: 0 };
  }
  if (band === 'landscape') {
    const w = (content.w - gap) * (1 - LANDSCAPE_TEXT_SHARE);
    return { x: content.x + textW + gap, y: 0, w, h: 0 };
  }
  const [start, end] = EMBLEM_SPAN[band] as readonly [number, number];
  const span = end - start + 1;
  return { x: content.x + (start - 1) * (colWidth + gap), y: 0, w: span * colWidth + (span - 1) * gap, h: 0 };
}

/** Emblem width and height for a band (before positioning). */
function emblemSize(v: Viewport, band: Band, areaW: number): { w: number; h: number } {
  let w: number;
  switch (band) {
    case 'mobile':
    case 'mobile-compact': {
      const rule = band === 'mobile' ? MOBILE_EMBLEM_HEIGHT.tall : MOBILE_EMBLEM_HEIGHT.compact;
      w = clamp(rule.min, rule.svh * v.height, rule.max) * EMBLEM_ASPECT;
      break;
    }
    case 'landscape':
      w = LANDSCAPE_EMBLEM_MAX_SVH * v.height * EMBLEM_ASPECT;
      break;
    case 'tablet':
      w = TABLET_EMBLEM_MAX_SVH * v.height * EMBLEM_ASPECT;
      break;
    default:
      w = EMBLEM_MAX_WIDTH[band];
  }
  // Never wider than its area (`max-inline-size: 100%`); height follows the ratio.
  w = Math.min(w, areaW);
  return { w, h: w / EMBLEM_ASPECT };
}

/**
 * Hero geometry for a viewport, mirroring the band layouts that task 12.1
 * implements in app/globals.css. Pure; never imported by components.
 */
export function computeHeroLayout(v: Viewport): HeroLayout {
  const safe = v.safe ?? ZERO_INSETS;
  const band = bandFor(v.width, v.height);
  const grid = BAND_GRID[band];
  const headerHeight = headerHeightFor(v);
  const g = gutters(v);
  const cw = contentWidth(v);
  const contentX = g.left + (v.width - g.left - g.right - cw) / 2;
  const colWidth = (cw - (grid.columns - 1) * grid.gap) / grid.columns;
  const textW = textBlockWidth(v);
  const stacked = band === 'mobile' || band === 'mobile-compact';

  // Rhythm.
  let rhythm: HeroRhythm;
  if (stacked) {
    const k = band === 'mobile-compact' ? COMPACT_RHYTHM_SCALE : 1;
    rhythm = {
      padTop: MOBILE_RHYTHM.padTop * k,
      emblemToHeadline: MOBILE_RHYTHM.emblemToHeadline * k,
      headlineToCopy: MOBILE_RHYTHM.headlineToCopy * k,
      copyToCta: MOBILE_RHYTHM.copyToCta * k,
      padBottom: MOBILE_RHYTHM.padBottom * k,
    };
  } else if (band === 'landscape') {
    rhythm = { ...MOBILE_RHYTHM, emblemToHeadline: 0 };
  } else {
    const r = WIDE_RHYTHM;
    rhythm = {
      padTop: r.blockPadMin,
      emblemToHeadline: 0,
      headlineToCopy: clamp(r.headlineToCopy.min, (r.headlineToCopy.vw * v.width) / 100, r.headlineToCopy.max),
      copyToCta: clamp(r.copyToCta.min, (r.copyToCta.vw * v.width) / 100, r.copyToCta.max),
      padBottom: r.blockPadMin,
    };
  }

  // Sizes independent of vertical position.
  const hm = headlineModel(v);
  const headlineH = hm.lines * hm.fontSize * HEADLINE_LINE_HEIGHT;
  const headlineW = hm.measureEm * hm.fontSize;
  const cm = copyModel(textW, v.width);
  const labels = ctaLabelWidths(v.width);
  const ctaProbe = layoutCtas(labels, { x: 0, y: 0 }, textW, v.width);
  const textH = headlineH + rhythm.headlineToCopy + cm.h + rhythm.copyToCta + ctaProbe.group.h;

  const area = emblemAreaFor(v, band, { x: contentX, y: 0, w: cw, h: 0 }, textW, colWidth, grid.gap);
  const es = emblemSize(v, band, area.w);
  const emblemX = area.x + area.w - es.w; // end-aligned in its area

  // Vertical placement.
  let textTop: number;
  let emblemTop: number;
  let heroH: number;
  if (stacked) {
    emblemTop = headerHeight + rhythm.padTop;
    textTop = emblemTop + es.h + rhythm.emblemToHeadline;
    heroH = Math.max(v.height, textTop + textH + rhythm.padBottom + safe.bottom);
  } else if (band === 'landscape') {
    // Both columns start at the padded top (align-items: start).
    textTop = headerHeight + rhythm.padTop;
    emblemTop = textTop;
    heroH = Math.max(v.height, textTop + Math.max(textH, es.h) + rhythm.padBottom + safe.bottom);
  } else {
    // Both columns centered in the region below the header, ≥ 48 px padding (Req 11.5).
    heroH = Math.max(v.height, headerHeight + 2 * WIDE_RHYTHM.blockPadMin + Math.max(textH, es.h));
    const region = heroH - headerHeight;
    textTop = headerHeight + (region - textH) / 2;
    emblemTop = headerHeight + (region - es.h) / 2;
  }

  const headline = { x: contentX, y: textTop, w: headlineW, h: headlineH, fontSize: hm.fontSize, measureEm: hm.measureEm, lines: hm.lines };
  const copyY = textTop + headlineH + rhythm.headlineToCopy;
  const copy = { x: contentX, y: copyY, w: cm.w, h: cm.h, fontSize: cm.fontSize, lines: cm.lines };
  const ctaOrigin = { x: contentX, y: copyY + cm.h + rhythm.copyToCta };
  const cta = layoutCtas(labels, ctaOrigin, textW, v.width);
  const textBlock: Rect = { x: contentX, y: textTop, w: textW, h: cta.group.y + cta.group.h - textTop };

  const emblem: Rect = { x: emblemX, y: emblemTop, w: es.w, h: es.h };
  const emblemArea: Rect = { ...area, y: emblemTop, h: es.h };

  // Plinth: along the emblem base. Mobile: the full content width in the gap
  // under the emblem. Elsewhere: from the emblem's inline-start edge to the
  // content end, or to the viewport edge from 1920 px.
  const plinthX = stacked ? contentX : emblem.x;
  const plinthEnd = band === 'ultra' ? v.width : contentX + cw;
  const plinth: Rect = { x: plinthX, y: emblem.y + emblem.h, w: plinthEnd - plinthX, h: 1 };

  const hero: Rect = { x: 0, y: 0, w: v.width, h: heroH };
  const goldRects = [cta.primary, plinth];
  const goldArea = goldRects.reduce((sum, r) => sum + r.w * r.h, 0);
  const goldAreaRatio = goldArea / (hero.w * hero.h - emblem.w * emblem.h);

  return {
    band,
    viewport: v,
    headerHeight,
    hero,
    content: { x: contentX, y: 0, w: cw, h: heroH },
    columns: { count: grid.columns, gap: grid.gap, colWidth },
    rhythm,
    textBlock,
    headline,
    copy,
    ctaLabelWidths: labels,
    cta,
    ctas: (labelWidths) => layoutCtas(labelWidths, ctaOrigin, textW, v.width),
    emblemArea,
    emblem,
    emblemParallax: parallaxEnvelope(emblem),
    plinth,
    goldRects,
    goldAreaRatio,
  };
}
