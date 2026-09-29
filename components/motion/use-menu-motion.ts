// Mobile_Menu motion phase state machine (task 8.5; Req 8.9, 8.10, 9.1, 9.10).
//
// closed → opening → open → closing → closed. CSS owns every animation
// (app/globals.css, "Mobile_Menu"): the phase is written to `data-phase` on
// the menu layers and the keyframes key off it. No GSAP: the menu must work
// on the first tap, before the post-hydration motion chunk arrives (K7).
//
// A phase settles on the panel's own `animationend` (its fade/rise, 360 ms;
// 150 ms in Reduced_Motion_Mode; the close fade 240 ms). A timeout at the
// requirement bound is the safety net for when no animation runs (for
// example an engine that drops it), so the state machine never sticks:
//   opening → open   by 560 ms (Req 8.9, full open sequence)
//   closing → closed by 280 ms (Req 8.10)
// Nothing here gates interaction: items are operable in every phase.
import { useCallback, useEffect, useState, type AnimationEvent } from "react";

export type MenuPhase = "closed" | "opening" | "open" | "closing";
type TransitionPhase = "opening" | "closing";

const SAFETY_MS: Record<TransitionPhase, number> = { opening: 560, closing: 280 };
const SETTLED: Record<TransitionPhase, MenuPhase> = { opening: "open", closing: "closed" };

const isTransition = (p: string | undefined): p is TransitionPhase => p === "opening" || p === "closing";

export interface MenuMotion {
  phase: MenuPhase;
  /** Starts the open sequence (no-op while already opening or open). */
  open: () => void;
  /** Starts the close fade, or closes with no transition when `instant`. */
  close: (instant?: boolean) => void;
  /** Attach to the panel; settles the phase on the panel's own animation end. */
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
}

export function useMenuMotion(): MenuMotion {
  const [phase, setPhase] = useState<MenuPhase>("closed");

  const settle = useCallback((from: TransitionPhase) => {
    setPhase((p) => (p === from ? SETTLED[from] : p));
  }, []);

  useEffect(() => {
    if (!isTransition(phase)) return;
    const timer = window.setTimeout(() => settle(phase), SAFETY_MS[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, settle]);

  const open = useCallback(() => {
    setPhase((p) => (p === "opening" || p === "open" ? p : "opening"));
  }, []);

  const close = useCallback((instant = false) => {
    setPhase((p) => (p === "closed" ? p : instant ? "closed" : "closing"));
  }, []);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      // Item animations bubble from descendants; only the panel's own counts.
      if (event.target !== event.currentTarget) return;
      const from = event.currentTarget.dataset.phase;
      if (isTransition(from)) settle(from);
    },
    [settle],
  );

  return { phase, open, close, onAnimationEnd };
}
