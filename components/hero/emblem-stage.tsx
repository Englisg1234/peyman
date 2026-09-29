import type { CSSProperties } from "react";
import { EmblemVisual } from "@/components/hero/emblem-visual";
import { HERO_EMBLEM_SIZES } from "@/lib/emblem-sizes";
import type { EmblemVisual as EmblemVisualContract } from "@/lib/site-config-schema";

export interface EmblemStageProps {
  /** Site_Config `emblem`: the Emblem_Visual contract (kind, aspectRatio, anchor, poster). */
  visual: EmblemVisualContract;
  /** Grid placement hook from the Hero shell (`hero__stage`). */
  className?: string;
}

/** A 0–1 fraction as a CSS percentage. */
const pct = (fraction: number): string => `${Number((fraction * 100).toFixed(3))}%`;

/**
 * Emblem_Stage (design: Hero composition layer stack, Emblem rendering
 * architecture; Req 2.6, 5.3, 5.4, 5.6, 5.10, 15.9, 16.2).
 *
 * The slot: a decorative `div[aria-hidden]` whose box is reserved from first
 * paint, sized from `aspectRatio` only (CSS `aspect-ratio` plus the band's
 * width or height rule) and positioned by the Hero grid. `anchor` becomes the
 * transform origin of the motion wrappers, so the intro scale and the
 * parallax rotation turn the emblem about its own column. Nothing here reads
 * `kind`: switching renderers cannot move or resize the slot (Req 5.6).
 *
 * Layers (z inside the Hero's stacking context):
 * - 2 `.light-stage > .light-parallax > .light-layer`: the Light_Layer
 *   (vignette and light pool as the layer's two pseudo-elements, task 11.2).
 *   `.light-stage` is static and clips to the slot (Req 5.4);
 *   Pointer_Parallax moves `.light-parallax` opposite to the emblem (GSAP,
 *   task 16.5); the CSS intro fades `.light-layer` (`data-intro`, task 15.1).
 * - 3 `.emblem-scroll > .emblem-parallax > .emblem-intro`: one wrapper per
 *   motion owner, so no two systems ever write the same element's transform
 *   (design GSAP rule 4). Scroll_Exit (GSAP) → Pointer_Parallax (GSAP) → the
 *   CSS intro keyframes (task 15.1). The renderer fills the innermost one.
 *
 * No focusable element, accessible name or live region (Req 5.3).
 */
export function EmblemStage({ visual, className }: EmblemStageProps) {
  const style = {
    "--emblem-aspect": visual.aspectRatio,
    "--emblem-anchor-x": pct(visual.anchor.x),
    "--emblem-anchor-y": pct(visual.anchor.y),
  } as CSSProperties;
  const classes = className ? `emblem-stage ${className}` : "emblem-stage";

  return (
    <div className={classes} data-slot="emblem-stage" aria-hidden="true" style={style}>
      <div className="light-stage" data-layer="light">
        <div className="light-parallax">
          <div className="light-layer" data-intro="atmosphere" />
        </div>
      </div>
      <div className="emblem-scroll">
        <div className="emblem-parallax">
          <div className="emblem-intro" data-intro="emblem">
            <EmblemVisual visual={visual} slot="hero" sizes={HERO_EMBLEM_SIZES} preload />
          </div>
        </div>
      </div>
    </div>
  );
}
