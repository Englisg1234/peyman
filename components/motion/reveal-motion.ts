"use client";

// Section reveals for everything after the Hero (design: restrained motion).
//
// Contract:
// - Content is visible by default (SSR, no JS, reduced motion, low power).
// - After hydration, only `[data-reveal]` elements that are still fully
//   below the viewport are armed; anything already on screen is never
//   touched, so there is no flash and no LCP impact.
// - One IntersectionObserver reveals each element once, then unobserves it.
// - Web Animations API (compositor-driven opacity/transform) with the shared
//   motion tokens. GSAP stays confined to the Hero motion chunk, so the
//   Hero's idle / off-screen "no GSAP frames" guarantee is unaffected.
// - Focus inside a pending element cancels its hidden state (CSS in site.css).
import { curve, duration } from "@/lib/motion-tokens";

const EASE = `cubic-bezier(${curve.entrance.join(",")})`;
const HIDDEN = "reveal-pending";

/** Arms reveals under `root`; returns a cleanup that restores every element. */
export function armReveals(root: ParentNode = document): () => void {
  if (typeof IntersectionObserver === "undefined" || typeof Element.prototype.animate !== "function") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const vh = window.innerHeight;
  const pending = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
    (el) => !el.classList.contains(HIDDEN) && el.getBoundingClientRect().top > vh * 0.98,
  );
  if (pending.length === 0) return () => {};
  pending.forEach((el) => el.classList.add(HIDDEN));

  const io = new IntersectionObserver(
    (entries) => {
      const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
      entering.forEach((el, i) => {
        io.unobserve(el);
        el.classList.remove(HIDDEN);
        el.animate(
          [
            { opacity: 0, transform: "translateY(16px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: duration.reveal, delay: i * duration.stagger * 2, easing: EASE, fill: "backwards" },
        );
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
  );
  pending.forEach((el) => io.observe(el));

  return () => {
    io.disconnect();
    pending.forEach((el) => el.classList.remove(HIDDEN));
  };
}
