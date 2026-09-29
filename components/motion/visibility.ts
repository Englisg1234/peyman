"use client";

// Pause gate for HeroMotion (Req 9.13, 9.15, 13.10).
//
// The Hero counts as "active" while it intersects the viewport AND the
// document is visible. `onChange` fires only on transitions, so the caller can
// detach handlers and disable ScrollTrigger while inactive and resume without
// replaying anything. `pageshow` with `persisted` (bfcache restore) is
// reported separately so the caller can hold the resting frame.

export interface VisibilityCallbacks {
  onChange(active: boolean): void;
  onRestore(): void;
}

/** Start watching; returns the cleanup. Callbacks should be contextSafe-wrapped. */
export function watchHeroVisibility(hero: HTMLElement, { onChange, onRestore }: VisibilityCallbacks): () => void {
  let intersecting = true;
  let active = !document.hidden;

  const update = () => {
    const next = intersecting && !document.hidden;
    if (next === active) return;
    active = next;
    onChange(active);
  };

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          const last = entries[entries.length - 1];
          if (last) intersecting = last.isIntersecting;
          update();
        })
      : null;
  io?.observe(hero);

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) onRestore();
  };

  document.addEventListener("visibilitychange", update);
  window.addEventListener("pageshow", onPageShow);
  return () => {
    io?.disconnect();
    document.removeEventListener("visibilitychange", update);
    window.removeEventListener("pageshow", onPageShow);
  };
}
