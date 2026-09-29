import { expect, test, type Page } from "@playwright/test";
import { MOTION_MARK } from "../../lib/motion-marks";
import { HERO_SELECTOR } from "./support/settle";

// MotionLoader (task 16.4; Req 13.5, 16.4, 17.7). Default build.
//
// The motion chunk is identified by content: it is the only script that
// contains GSAP's ScrollTrigger. "Hydration" is MotionLoader's
// `peyman:motion-start` User Timing mark, set in its post-hydration effect.

const GSAP_SIGNATURE = /ScrollTrigger/;
const CHUNK_GLOB = "**/_next/static/chunks/**/*.js";

interface JsResource {
  file: string;
  start: number;
}

/** Records the file names of scripts whose body contains GSAP. */
async function trackMotionChunk(page: Page): Promise<Set<string>> {
  const gsapFiles = new Set<string>();
  page.on("response", async (res) => {
    if (!res.url().endsWith(".js")) return;
    const body = await res.text().catch(() => "");
    if (GSAP_SIGNATURE.test(body)) gsapFiles.add(new URL(res.url()).pathname.split("/").pop()!);
  });
  return gsapFiles;
}

const marks = (page: Page) =>
  page.evaluate((names) => {
    const at = (n: string) => performance.getEntriesByName(n, "mark").map((e) => e.startTime);
    return { start: at(names.start), ready: at(names.ready), failed: at(names.failed) };
  }, MOTION_MARK);

const jsResources = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => new URL(r.name).pathname.endsWith(".js"))
      .map((r) => ({ file: new URL(r.name).pathname.split("/").pop()!, start: r.startTime })),
  );

test("requests the motion chunk only after hydration, and never from the initial HTML", async ({ page, request }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  const gsapFiles = await trackMotionChunk(page);

  await page.goto("/");
  await expect.poll(async () => (await marks(page)).ready.length, { timeout: 10_000 }).toBe(1);
  await expect.poll(() => gsapFiles.size).toBe(1);
  const [motionFile] = [...gsapFiles];

  const { start } = await marks(page);
  expect(start).toHaveLength(1);
  const resources: JsResource[] = await jsResources(page);
  const motion = resources.filter((r) => r.file === motionFile);
  expect(motion).toHaveLength(1);
  expect(motion[0].start).toBeGreaterThanOrEqual(start[0]);
  // Every other script belongs to the initial load, before hydration.
  for (const r of resources.filter((r) => r.file !== motionFile)) expect(r.start).toBeLessThan(start[0]);

  // The initial HTML has no script, preload or modulepreload for the chunk.
  const html = await (await request.get("/")).text();
  expect(html).not.toContain(motionFile);
  const preloaded = [...html.matchAll(/<link[^>]+rel="(?:modulepreload|preload)"[^>]*href="([^"]+\.js)"/g)].map((m) => m[1]);
  for (const href of preloaded) {
    const body = await (await request.get(href)).text();
    expect(GSAP_SIGNATURE.test(body), `${href} preloads GSAP`).toBe(false);
  }

  // MotionLoader and HeroMotion insert no DOM (Req 15.6).
  expect(await page.locator(`${HERO_SELECTOR} > *`).count()).toBe(1);
  expect(errors).toEqual([]);
});

// MotionLoader calls `import()` once and never again. Inside that one call the
// Turbopack chunk loader re-requests a script once after a network error
// (200–600 ms jitter) before rejecting; see docs/decisions.md "Motion chunk
// loading (task 16.4)". After the rejection nothing requests it again.
test("a failed motion chunk leaves the static page, with no uncaught error and no app retry", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  const aborted: string[] = [];
  await page.route(CHUNK_GLOB, async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (GSAP_SIGNATURE.test(body)) {
      aborted.push(route.request().url());
      return route.abort("failed");
    }
    return route.fulfill({ response: res, body });
  });

  await page.goto("/");
  await expect.poll(async () => (await marks(page)).failed.length, { timeout: 10_000 }).toBe(1);
  const attemptsAtFailure = aborted.length;
  await page.waitForTimeout(1500);

  expect(attemptsAtFailure).toBeGreaterThanOrEqual(1);
  expect(attemptsAtFailure).toBeLessThanOrEqual(2);
  expect(aborted).toHaveLength(attemptsAtFailure);
  expect((await marks(page)).failed).toHaveLength(1);
  expect((await marks(page)).ready).toHaveLength(0);
  expect(errors).toEqual([]);
  const primary = page.locator(`${HERO_SELECTOR} .cta-group a`).first();
  await expect(primary).toBeVisible();
  await expect(page.locator(`${HERO_SELECTOR} h1`)).toBeVisible();
});
