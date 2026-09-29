// Motion tokens: the single source for durations, delays, curves and distances
// (Req 9.2, 9.3). app/layout.tsx serializes them as CSS custom properties on
// <html> via toCssVars(); GSAP code imports the same constants. Values in ms
// unless noted.
//
// Pure and framework-free: safe for server components, client code and tests.

import { toCssCubicBezier } from './ease';

export const duration = {
  micro: 160,
  ui: 240,
  reveal: 720,
  sweep: 1400,
  panel: 360,
  crossfade: 400,
  stagger: 40,
  rmFade: 150,
  parallaxReturn: 600,
} as const;

export const delay = {
  brand: 0,
  hairline: 40,
  atmosphere: 80,
  emblem: 120,
  headline: 160,
  copy: 400,
  cta: 520,
  sweepMaxLag: 200,
  motionDeadline: 1600,
} as const;

/** cubic-bezier control points. Scroll_Exit uses a linear mapping (no token). */
export const curve = {
  entrance: [0.16, 1, 0.3, 1],
  state: [0.65, 0, 0.35, 1],
} as const;

export const distance = {
  headlineRise: 12,
  copyRise: 8,
  parallaxMax: 12,
  rotateMaxDeg: 2,
  exitYPercent: -8,
  exitScale: 0.96,
  emblemFromOpacity: 0.24,
  emblemFromScale: 0.98,
} as const;

export type DurationToken = keyof typeof duration;
export type DelayToken = keyof typeof delay;
export type CurveToken = keyof typeof curve;
export type DistanceToken = keyof typeof distance;

/** CSS unit for each distance token when serialized. */
const distanceUnit: Record<DistanceToken, string> = {
  headlineRise: 'px',
  copyRise: 'px',
  parallaxMax: 'px',
  rotateMaxDeg: 'deg',
  exitYPercent: '%',
  exitScale: '',
  emblemFromOpacity: '',
  emblemFromScale: '',
};

/**
 * Serialize every token as a CSS custom property:
 * `--dur-<name>: <n>ms`, `--delay-<name>: <n>ms`,
 * `--ease-<name>: cubic-bezier(...)`, `--dist-<name>: <n><unit>`.
 */
export function toCssVars(): Record<`--${string}`, string> {
  const vars: Record<`--${string}`, string> = {};
  for (const [name, ms] of Object.entries(duration)) vars[`--dur-${name}`] = `${ms}ms`;
  for (const [name, ms] of Object.entries(delay)) vars[`--delay-${name}`] = `${ms}ms`;
  for (const [name, tuple] of Object.entries(curve)) vars[`--ease-${name}`] = toCssCubicBezier(tuple);
  for (const [name, value] of Object.entries(distance)) {
    vars[`--dist-${name}`] = `${value}${distanceUnit[name as DistanceToken]}`;
  }
  return vars;
}

export type IntroTarget = 'brand' | 'hairline' | 'atmosphere' | 'emblem' | 'headline' | 'copy' | 'cta';

export interface IntroStep {
  target: IntroTarget;
  delay: number;
  duration: number;
  /** Start state; every step ends at opacity 1, translateY 0, scale 1. */
  from: { opacity?: number; translateY?: number; scale?: number };
}

/**
 * The CSS intro choreography (design: Motion choreography) as data.
 * The headline never has an opacity entry: it stays at opacity 1 (K5).
 * The Specular_Sweep is not part of this table; it runs after hydration.
 */
export const INTRO_TIMELINE: readonly IntroStep[] = [
  { target: 'brand', delay: delay.brand, duration: duration.ui, from: { opacity: 0 } },
  { target: 'hairline', delay: delay.hairline, duration: duration.reveal, from: { scale: 0 } },
  { target: 'atmosphere', delay: delay.atmosphere, duration: duration.reveal, from: { opacity: 0 } },
  {
    target: 'emblem',
    delay: delay.emblem,
    duration: duration.reveal,
    from: { opacity: distance.emblemFromOpacity, scale: distance.emblemFromScale },
  },
  { target: 'headline', delay: delay.headline, duration: duration.reveal, from: { translateY: distance.headlineRise } },
  { target: 'copy', delay: delay.copy, duration: duration.ui, from: { opacity: 0, translateY: distance.copyRise } },
  { target: 'cta', delay: delay.cta, duration: duration.ui, from: { opacity: 0, translateY: distance.copyRise } },
];
