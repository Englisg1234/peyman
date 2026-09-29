import type { CSSProperties } from "react";
import { EmblemStage } from "@/components/hero/emblem-stage";
import { HeroCopy } from "@/components/hero/hero-copy";
import { HeroFraming } from "@/components/hero/hero-framing";
import { MotionLoader } from "@/components/motion/motion-loader";
import { siteConfig } from "@/data/site-config";

/** `id` of the Headline h1; the section is labelled by it. Not copy. */
const HEADLINE_ID = "hero-headline";
/** `id` of the Hero section; MotionLoader hands it to HeroMotion as its scope. */
const HERO_ID = "hero";

/**
 * Hero shell (design: Hero composition, Layout architecture; Req 1.1, 3.1,
 * 15.3, 16.1, 19.1).
 *
 * `section[data-hero]` is the stage: full-bleed `navy-950` → `ink-950`
 * gradient, `isolation: isolate`, `overflow: clip` with an 8 px clip margin
 * so focus rings are never cut, and `min-height: 100vh` then `100svh`
 * (styles: `.hero` in app/globals.css). It is labelled by the h1.
 *
 * Inside, `.hero__grid` is the content box: the mobile-first base is 4
 * columns with a 16 px gap. The band layouts from 768 px (task 12.1) and the
 * mobile recomposition details (task 13.1) build on these hooks; values must
 * match `computeHeroLayout()` in lib/layout-model.ts.
 *
 * The framing layer (spine, ticks, plinth; aria-hidden, z 1) comes first. It
 * is absolutely positioned against the grid, so it takes no grid cell and
 * does not affect auto-placement.
 *
 * DOM order (Req 3.1): the text block, then the Emblem_Stage last. Visually
 * the stage stacks above the text on mobile through grid `order`, so reading
 * order is unchanged (Req 10.1).
 *
 * The Emblem_Stage receives the Emblem_Visual contract only; the renderer is
 * chosen behind it (components/hero/emblem-visual.tsx, Req 15.9), so a future
 * Model_Emblem needs no change here.
 *
 * `--emblem-aspect` (a number) is exposed on the section too: the band
 * layouts (task 12.1) derive the emblem height from it in the framing layer,
 * which is not inside the stage.
 *
 * MotionLoader (task 16.4) is the Hero's only client leaf. It renders no DOM
 * and, after hydration, imports the GSAP motion chunk (Req 13.5, 16.4). It
 * sits outside the grid, so it can never take a grid cell.
 */
export function Hero() {
  const style = { "--emblem-aspect": siteConfig.emblem.aspectRatio } as CSSProperties;
  return (
    <section id={HERO_ID} className="hero" data-hero="" aria-labelledby={HEADLINE_ID} style={style}>
      <div className="hero__grid">
        <HeroFraming />
        <HeroCopy headlineId={HEADLINE_ID} className="hero__text" />
        <EmblemStage visual={siteConfig.emblem} className="hero__stage" />
      </div>
      <MotionLoader heroId={HERO_ID} />
    </section>
  );
}
