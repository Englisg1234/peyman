import { expect, type Page } from "@playwright/test";

// Shared "settled final composition" helper for Hero e2e specs.
//
// Settled means: web fonts have finished (loaded or failed), the hero emblem
// is decoded with the next/image placeholder cleared, and every finite
// running animation (the CSS intro, task 15.1, and any transition in flight)
// has reached its end. Infinite and paused animations are ignored. The document is left at
// scroll 0.

export const HERO_SELECTOR = "section[data-hero]";
export const HERO_EMBLEM_IMG_SELECTOR = `${HERO_SELECTOR} .emblem-stage .raster-emblem__img`;

/** Waits for the settled final composition on the current page. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const img = document.querySelector<HTMLImageElement>(sel);
          return !!img && img.complete && img.naturalWidth > 0 && !img.style.backgroundImage;
        }, HERO_EMBLEM_IMG_SELECTOR),
      { timeout: 15_000 },
    )
    .toBe(true);
  // Animations may start after hydration (GSAP enhancement), so re-check
  // until no finite animation is left running.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const running = document
            .getAnimations()
            .filter(
              (a) => a.playState === "running" && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)),
            );
          await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
          return running.length;
        }),
      { timeout: 15_000 },
    )
    .toBe(0);
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: "instant" }));
}

/** Loads `path` (default `/`) and waits for the settled final composition. */
export async function gotoSettled(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await settle(page);
}
