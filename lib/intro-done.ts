// Intro-once guard (task 17.1; Req 9.10, 9.11).
//
// The CSS intro (app/globals.css "Intro") is gated on
// `prefers-reduced-motion: no-preference` and scoped to
// `:root:not([data-intro-done])`. Without this attribute a runtime toggle
// reduce → no-preference would re-match the rules and replay the intro, and a
// CTA blur after `.cta-group:focus-within { animation: none }` would restart
// the CTA fade. The attribute is set once, from the Hero's client leaf:
//
// - at once when reduced motion matches (at hydration or on a runtime change);
// - otherwise when every running intro animation has finished (or was
//   cancelled). Removing the rules then drops `both`-filled animations onto
//   the identical final style, so nothing moves.
//
// Without JS it is never set, so the intro still runs from first paint (Req 17.3).

import { INTRO_TIMELINE } from './motion-tokens';

export const INTRO_DONE_ATTR = 'data-intro-done';
export const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** Latest settle time of the intro (ms): the fallback when `getAnimations` is unavailable. */
const INTRO_END_MS = Math.max(...INTRO_TIMELINE.map((s) => s.delay + s.duration));

const isIntroAnimation = (a: Animation): boolean =>
  (a as CSSAnimation).animationName?.startsWith('intro-') === true;

/**
 * Marks the intro as played on <html>. Returns a cleanup that stops watching
 * (the attribute, once set, is never removed).
 */
export function watchIntroDone(doc: Document = document, win: Window = window): () => void {
  const root = doc.documentElement;
  if (root.hasAttribute(INTRO_DONE_ATTR)) return () => {};

  const mq = win.matchMedia(REDUCE_QUERY);
  let active = true;
  let timer: number | undefined;

  const stop = () => {
    active = false;
    mq.removeEventListener('change', onChange);
    if (timer !== undefined) win.clearTimeout(timer);
  };
  const mark = () => {
    if (!active) return;
    root.setAttribute(INTRO_DONE_ATTR, '');
    stop();
  };
  function onChange(e: MediaQueryListEvent) {
    if (e.matches) mark();
  }

  if (mq.matches) {
    mark();
    return stop;
  }
  mq.addEventListener('change', onChange);

  if (typeof doc.getAnimations !== 'function') {
    timer = win.setTimeout(mark, INTRO_END_MS);
    return stop;
  }
  // A cancelled animation (reduce toggle, CTA focus) rejects `finished`; it
  // counts as done. No running intro animation (already settled) marks at once.
  const running = doc.getAnimations().filter(isIntroAnimation);
  void Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(mark);
  return stop;
}
