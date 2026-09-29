import type { CSSProperties } from "react";

/** Tick positions along the spine, as fractions of its length (start → end). */
const TICKS = [0.25, 0.5, 0.75] as const;

/**
 * Hero framing layer (design: Hero composition layer stack, z 1 "Framing";
 * Req 2.1, 2.2, 2.5, 2.6, 2.7, 4.3, 12.8).
 *
 * A drafted-plan gesture, not ornament: one vertical grid spine
 * (ivory-50 at 8%), three measurement ticks on it (ivory-50 at 10%) and one
 * plinth line along the emblem base (gold-500 at 32%, the Hero's only gold
 * hairline). Every line is 1 CSS px, drawn with CSS boxes only: no text, no
 * numerals, no SVG, no images, nothing focusable.
 *
 * Geometry lives in app/globals.css (`.hero-framing`, CSS variables
 * `--frame-*`). The layer is an absolutely positioned child of the Hero
 * grid, so it resolves against grid lines and follows the band layouts;
 * the plinth rect mirrors `computeHeroLayout().plinth` in lib/layout-model.ts.
 *
 * `data-intro="hairline"` is the draw-in hook for the CSS intro (task 15.1):
 * the spine scales on the block axis from its top, the ticks and plinth on
 * the inline axis from their start edge. They render at their final state
 * until then (and always under reduced motion).
 *
 * Decorative: `aria-hidden`, and hidden in forced colors (Req 12.8).
 */
export function HeroFraming() {
  return (
    <div className="hero-framing" data-layer="framing" aria-hidden="true">
      <div className="hero-framing__spine" data-intro="hairline" />
      {TICKS.map((at) => (
        <div
          key={at}
          className="hero-framing__tick"
          data-intro="hairline"
          style={{ "--frame-tick-at": at } as CSSProperties}
        />
      ))}
      <div className="hero-framing__plinth" data-intro="hairline" />
    </div>
  );
}
