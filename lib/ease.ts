// Cubic-bézier easing solver (Req 9.2).
//
// Returns a plain `(t) => number` function, which is the signature GSAP accepts
// for `ease`. This keeps CSS and GSAP curves identical from one control-point
// tuple without the CustomEase plugin (design: GSAP architecture, rule 5).
//
// Pure and framework-free: safe for server components, client code and tests.

/** Maximum bisection steps. 2^-48 is far below double-precision needs for t. */
const ITERATIONS = 48;

/**
 * Build an easing function for the CSS curve `cubic-bezier(x1, y1, x2, y2)`.
 *
 * The x control points must lie in [0, 1] (as CSS requires), which makes x(t)
 * monotonic, so each progress value maps to exactly one curve parameter.
 * The parameter is found by fixed-step bisection: it is monotonic in the input,
 * so the returned function never decreases when y1 and y2 are in [0, 1].
 * Endpoints are exact: f(0) = 0 and f(1) = 1. Inputs outside [0, 1] are clamped.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const values = [x1, y1, x2, y2];
  if (values.some((v) => !Number.isFinite(v))) {
    throw new RangeError('cubicBezier: control points must be finite numbers');
  }
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError('cubicBezier: x1 and x2 must be within [0, 1]');
  }

  // Polynomial coefficients for B(t) = a·t³ + b·t² + c·t with P0 = 0 and P3 = 1.
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;

  // Linear curves need no solving.
  if (x1 === y1 && x2 === y2) {
    return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
  }

  const solveT = (x: number): number => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (sampleX(mid) < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  return (t: number): number => {
    if (!(t > 0)) return 0; // also maps NaN to 0
    if (t >= 1) return 1;
    return sampleY(solveT(t));
  };
}

/** Build an ease function from a `[x1, y1, x2, y2]` tuple (e.g. `curve.entrance`). */
export function easeFromTuple(tuple: readonly [number, number, number, number]): (t: number) => number {
  return cubicBezier(tuple[0], tuple[1], tuple[2], tuple[3]);
}

/** Serialize a tuple as a CSS timing function, e.g. `cubic-bezier(0.16, 1, 0.3, 1)`. */
export function toCssCubicBezier(tuple: readonly [number, number, number, number]): string {
  return `cubic-bezier(${tuple.join(', ')})`;
}
