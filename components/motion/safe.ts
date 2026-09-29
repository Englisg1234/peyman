// The contextSafe wrapper handed to HeroMotion's helpers (design: GSAP
// architecture, rule 3). GSAP types it as `(func: Function) => Function`;
// this keeps the wrapped function's own signature.

type AnyFn = (...args: never[]) => unknown;

/** Wraps a deferred callback so GSAP work it creates joins the active matchMedia context. */
export type Safe = <T extends AnyFn>(fn: T) => T;

/** Adapt GSAP's untyped contextSafe (or, if absent, run callbacks unwrapped). */
export function toSafe(contextSafe?: (func: AnyFn) => unknown): Safe {
  return <T extends AnyFn>(fn: T): T => (contextSafe ? (contextSafe(fn) as T) : fn);
}
