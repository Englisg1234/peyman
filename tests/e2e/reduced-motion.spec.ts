import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { MOTION_MARK } from "../../lib/motion-marks";
import { duration } from "../../lib/motion-tokens";
import { NAV_LIVE_TAG } from "./support/builds";
import { HERO_SELECTOR, settle } from "./support/settle";
import {
  DESKTOP_1440x900,
  LANDSCAPE_844x390,
  MOBILE_390x844,
  TABLET_1024x768,
  type TestViewport,
} from "./support/viewports";

// Reduced-motion e2e (task 17.2; Req 8.9, 8.10, 9.10, 9.11, 18.4, 20.2).
//
// Untagged describes run on the default build. The `@nav-live` describe runs
// on the live-nav fixture build (DEC-05) for the Mobile_Menu.
//
// Headless Chromium reports hardwareConcurrency = 4 (Low_Power_Mode, Req
// 9.12), which would hide parallax and the sweep for reasons other than
// reduced motion. Every page here reports 8 cores and 8 GB instead.
//
// Req 18.4 pairs (reduced vs default-motion final state) are written to
// qa/screenshots/reduced-motion/.

const RM_FADE = duration.rmFade;
const SHOTS_DIR = "qa/screenshots/reduced-motion";
const WRAPPERS = ".emblem-scroll, .emblem-parallax, .light-parallax";
const EMBLEM_ROOT = `${HERO_SELECTOR} .raster-emblem[data-emblem-slot="hero"]`;
/** Long enough for any late sweep to arm (intro ends ≈ 880 ms). */
const NO_SWEEP_WAIT_MS = 2500;

// ---------------------------------------------------------------------------
// In-page probe (serialized by addInitScript)
// ---------------------------------------------------------------------------

type Probe = { sweepArmed: number; wrapperWrites: number; introAnimsSeen: number };

function probeScript() {
  Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { configurable: true, get: () => 8 });
  Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => 8 });
  const data: Probe = { sweepArmed: 0, wrapperWrites: 0, introAnimsSeen: 0 };
  (window as unknown as { __rm: Probe }).__rm = data;
  new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target as Element;
      if (r.attributeName === "data-sweep" && el.getAttribute("data-sweep") === "active") data.sweepArmed++;
      if (r.attributeName === "style" && el.matches(".emblem-scroll, .emblem-parallax, .light-parallax")) {
        data.wrapperWrites++;
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-sweep", "style"] });
  // Counts every intro animation seen on any frame from document start.
  const tick = () => {
    data.introAnimsSeen += document
      .getAnimations()
      .filter((a) => (a as CSSAnimation).animationName?.startsWith("intro-")).length;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const probe = (page: Page): Promise<Probe> => page.evaluate(() => ({ ...(window as unknown as { __rm: Probe }).__rm }));

const resetIntroCount = (page: Page) =>
  page.evaluate(() => ((window as unknown as { __rm: Probe }).__rm.introAnimsSeen = 0));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function waitMotionReady(page: Page) {
  await expect
    .poll(() => page.evaluate((n) => performance.getEntriesByName(n, "mark").length, MOTION_MARK.ready), {
      timeout: 15_000,
    })
    .toBe(1);
}

async function waitIntroDone(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-intro-done", "", { timeout: 10_000 });
}

/** Resolves after `n` animation frames. */
const frames = (page: Page, n: number) =>
  page.evaluate(
    (count) =>
      new Promise<void>((res) => {
        const step = (left: number) => (left === 0 ? res() : requestAnimationFrame(() => step(left - 1)));
        step(count);
      }),
    n,
  );

type State = {
  introAnims: number;
  notFinal: string[];
  wrapperInline: string[];
  wrapperComputed: string[];
};

/** Intro and motion-wrapper state: final means opacity 1 and identity transform. */
const state = (page: Page): Promise<State> =>
  page.evaluate((wrappers) => {
    const identity = (tf: string) => tf === "none" || tf === "matrix(1, 0, 0, 1, 0, 0)";
    const notFinal: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-intro]")) {
      const cs = getComputedStyle(el);
      if (Number(cs.opacity) !== 1 || !identity(cs.transform)) {
        notFinal.push(`${el.dataset.intro}: opacity ${cs.opacity}, transform ${cs.transform}`);
      }
    }
    const ws = [...document.querySelectorAll<HTMLElement>(wrappers)];
    return {
      introAnims: document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith("intro-")).length,
      notFinal,
      wrapperInline: ws.filter((w) => w.style.transform !== "").map((w) => `${w.className}: ${w.style.transform}`),
      wrapperComputed: ws
        .filter((w) => !identity(getComputedStyle(w).transform))
        .map((w) => `${w.className}: ${getComputedStyle(w).transform}`),
    };
  }, WRAPPERS);

function expectFinal(s: State, when: string) {
  expect(s.introAnims, `intro animations ${when}`).toBe(0);
  expect(s.notFinal, `[data-intro] not at the final composition ${when}`).toEqual([]);
  expect(s.wrapperInline, `inline transforms on motion wrappers ${when}`).toEqual([]);
  expect(s.wrapperComputed, `motion wrapper transforms ${when}`).toEqual([]);
}

/** Moves the pointer across the Hero; true when a parallax wrapper moved. */
async function pointerMovesEmblem(page: Page): Promise<boolean> {
  const box = await page.evaluate((hero) => {
    const h = document.querySelector(hero)!.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    return { l: h.left + 4, r: h.right - 4, t: Math.max(h.top, header.bottom) + 4, b: Math.min(h.bottom, innerHeight) - 4 };
  }, HERO_SELECTOR);
  for (const [x, y] of [
    [box.l, box.t],
    [box.r, box.b],
    [box.r, box.t],
    [box.l, box.b],
  ]) {
    await page.mouse.move(x, y, { steps: 4 });
  }
  await page.waitForTimeout(duration.ui * 2);
  return (await state(page)).wrapperComputed.length > 0;
}

type Rects = Array<{ key: string; rect: number[] }>;

/** Boxes of every intro element, the headline, the CTAs and the emblem image. */
const rects = (page: Page): Promise<Rects> =>
  page.evaluate((hero) => {
    const sel = `[data-intro], ${hero} h1, ${hero} .cta-group > a, ${hero} .raster-emblem__img`;
    return [...document.querySelectorAll<HTMLElement>(sel)].map((el, i) => {
      const r = el.getBoundingClientRect();
      return { key: `${i}:${el.dataset.intro ?? el.tagName.toLowerCase()}`, rect: [r.left, r.top, r.width, r.height] };
    });
  }, HERO_SELECTOR);

function expectSameRects(actual: Rects, reference: Rects) {
  expect(actual.map((e) => e.key)).toEqual(reference.map((e) => e.key));
  actual.forEach((e, i) =>
    e.rect.forEach((v, k) => expect(Math.abs(v - reference[i].rect[k]), `${e.key} rect[${k}]`).toBeLessThanOrEqual(1)),
  );
}

/** Resolves once `ms` have passed since first-contentful-paint; returns the offset reached. */
const afterFcp = (page: Page, ms: number) =>
  page.evaluate(async (wait) => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    let fcp: PerformanceEntry | undefined;
    while (!(fcp = performance.getEntriesByName("first-contentful-paint")[0])) await nextFrame();
    while (performance.now() - fcp.startTime < wait) await nextFrame();
    return performance.now() - fcp.startTime;
  }, ms);

/** Counts differing pixels between two PNG screenshots (decoded in a blank page). */
async function diffPixels(browser: Browser, a: Buffer, b: Buffer): Promise<{ count: number; box: number[] | null }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const result = await page.evaluate(
    async ([x, y]) => {
      const decode = async (b64: string) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, bmp.width, bmp.height);
      };
      const [p, q] = await Promise.all([decode(x), decode(y)]);
      if (p.width !== q.width || p.height !== q.height) return { count: -1, box: null };
      let count = 0;
      let [l, t, r, btm] = [Infinity, Infinity, -1, -1];
      for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i] !== q.data[i] || p.data[i + 1] !== q.data[i + 1] || p.data[i + 2] !== q.data[i + 2]) {
          count++;
          const px = (i / 4) % p.width;
          const py = Math.floor(i / 4 / p.width);
          [l, t, r, btm] = [Math.min(l, px), Math.min(t, py), Math.max(r, px), Math.max(btm, py)];
        }
      }
      return { count, box: count ? [l, t, r, btm] : null };
    },
    [a.toString("base64"), b.toString("base64")],
  );
  await context.close();
  return result;
}

async function defaultMotionFinal(browser: Browser, vp: TestViewport) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript(probeScript);
  await page.goto("/");
  await settle(page);
  await waitIntroDone(page);
  await page.mouse.move(vp.width / 2, 5);
  await page.waitForTimeout(NO_SWEEP_WAIT_MS); // the sweep (if any) is back at rest
  const result = { rects: await rects(page), state: await state(page), shot: await page.screenshot() };
  await context.close();
  return result;
}

function saveShot(name: string, buf: Buffer) {
  mkdirSync(SHOTS_DIR, { recursive: true });
  writeFileSync(`${SHOTS_DIR}/${name}.png`, buf);
}

// Warm the image optimizer (risk R1) so derivative generation never lands
// inside a timed window.
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  for (const vp of [DESKTOP_1440x900, MOBILE_390x844, LANDSCAPE_844x390, TABLET_1024x768]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await settle(page);
  }
  await context.close();
});

// ---------------------------------------------------------------------------
// Reduced motion at load (default build)
// ---------------------------------------------------------------------------

for (const vp of [DESKTOP_1440x900, MOBILE_390x844, LANDSCAPE_844x390]) {
  test.describe(`reduced motion at load, ${vp.name}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      reducedMotion: "reduce",
    });

    test("final composition from first paint: 100 ms and 2000 ms screenshots identical; no intro, sweep or parallax; matches the default-motion final state (Req 9.10, 18.4)", async ({
      page,
      browser,
    }) => {
      test.setTimeout(60_000);
      const errors = trackErrors(page);
      await page.addInitScript(probeScript);
      // Prime this context's HTTP cache, then measure a fresh navigation.
      await page.goto("/");
      await settle(page);

      await page.goto("/", { waitUntil: "commit" });
      const t1 = await afterFcp(page, 100);
      const early = await page.screenshot();
      const earlyState = await state(page);
      await afterFcp(page, 2000);
      const late = await page.screenshot();
      expect(t1, "first screenshot taken ~100 ms after FCP").toBeLessThan(400);

      expectFinal(earlyState, "at 100 ms");
      expectFinal(await state(page), "at 2000 ms");
      await waitIntroDone(page);
      await waitMotionReady(page);

      if (!early.equals(late)) {
        const diff = await diffPixels(browser, early, late);
        expect(diff, "pixels differing between the 100 ms and 2000 ms frames").toEqual({ count: 0, box: null });
      }

      // No sweep and no parallax, even with pointer input on a fine pointer.
      await page.waitForTimeout(NO_SWEEP_WAIT_MS);
      expect(await pointerMovesEmblem(page), "parallax under reduce").toBe(false);
      const p = await probe(page);
      expect(p.introAnimsSeen, "intro animations on any frame").toBe(0);
      expect(p.sweepArmed, "sweep armed").toBe(0);
      expect(p.wrapperWrites, "GSAP writes on motion wrappers").toBe(0);
      expect(await page.locator(`${EMBLEM_ROOT} .raster-emblem__specular`).evaluate((c) => getComputedStyle(c).display)).toBe(
        "none",
      );

      // Req 18.4: same composition as the default-motion final state, within 1 px.
      await page.mouse.move(vp.width / 2, 5);
      const reduced = { rects: await rects(page), shot: await page.screenshot() };
      const reference = await defaultMotionFinal(browser, vp);
      expectFinal(reference.state, "in the default-motion final state");
      expectSameRects(reduced.rects, reference.rects);
      saveShot(`${vp.name}-reduced`, reduced.shot);
      saveShot(`${vp.name}-default`, reference.shot);
      expect(errors).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// Runtime toggles (default build, desktop fine pointer)
// ---------------------------------------------------------------------------

test.describe(`runtime reduced-motion toggle, ${DESKTOP_1440x900.name}`, () => {
  test.use({ viewport: { width: DESKTOP_1440x900.width, height: DESKTOP_1440x900.height } });

  test("reduce ON mid-intro: final within 2 frames; OFF: no replay, no sweep, parallax back; ON again reverts parallax within 2 frames (Req 9.11)", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const errors = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(probeScript);
    await page.goto("/", { waitUntil: "commit" });

    // Wait for the emblem intro (120 → 840 ms) to be mid-flight.
    const at = await page.evaluate(async () => {
      const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
      let anim: Animation | undefined;
      while (!(anim = document.querySelector<HTMLElement>('[data-intro="emblem"]')?.getAnimations()[0])) await nextFrame();
      while (Number(anim.currentTime ?? 0) < 300) await nextFrame();
      return Number(anim.currentTime);
    });
    expect(at, "toggled mid-intro").toBeLessThan(700);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await frames(page, 2);
    expectFinal(await state(page), "2 frames after reduce ON");
    await waitIntroDone(page);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await resetIntroCount(page);
    await frames(page, 2);
    expectFinal(await state(page), "2 frames after reduce OFF");
    await waitMotionReady(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect((await probe(page)).introAnimsSeen, "intro replayed after reduce OFF").toBe(0);
    expect((await probe(page)).sweepArmed, "sweep after toggling").toBe(0);
    expect(await pointerMovesEmblem(page), "parallax re-enabled after reduce OFF").toBe(true);

    // Pointer still over the Hero, parallax engaged: reduce ON reverts it.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await frames(page, 2);
    expectFinal(await state(page), "2 frames after reduce ON with parallax engaged");
    expect(await pointerMovesEmblem(page), "parallax under reduce").toBe(false);
    expect(errors).toEqual([]);
  });

  test("reduce at load, then OFF: no intro replay, no sweep, parallax available (Req 9.11)", async ({ page }) => {
    test.setTimeout(60_000);
    const errors = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(probeScript);
    await page.goto("/");
    await settle(page);
    await waitIntroDone(page);
    await waitMotionReady(page);
    expect(await pointerMovesEmblem(page), "parallax under reduce").toBe(false);
    await page.mouse.move(DESKTOP_1440x900.width / 2, 5);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await frames(page, 2);
    expectFinal(await state(page), "2 frames after reduce OFF");
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    const p = await probe(page);
    expect(p.introAnimsSeen, "intro animations on any frame").toBe(0);
    expect(p.sweepArmed, "sweep armed").toBe(0);
    expect(await pointerMovesEmblem(page), "parallax after reduce OFF").toBe(true);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// UI transitions under reduce (default build)
// ---------------------------------------------------------------------------

/** Every transition duration + delay (ms) of an element or pseudo-element. */
const transitionSpans = (page: Page, sel: string, pseudo: string | null = null) =>
  page.evaluate(
    ([s, p]) =>
      [...document.querySelectorAll(s)].flatMap((el) => {
        const cs = getComputedStyle(el, p);
        const ms = (v: string) => v.split(",").map((x) => parseFloat(x) * (x.trim().endsWith("ms") ? 1 : 1000));
        const d = ms(cs.transitionDuration);
        const delay = ms(cs.transitionDelay);
        return d.map((v, i) => v + (delay[i % delay.length] ?? 0));
      }),
    [sel, pseudo] as const,
  );

/** Running CSS transitions in the document: [property, duration + delay]. */
const runningTransitions = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a instanceof CSSTransition)
      .map((a) => {
        const t = (a.effect as KeyframeEffect).getComputedTiming();
        return [(a as CSSTransition).transitionProperty, Number(t.duration) + Number(t.delay)] as const;
      }),
  );

for (const vp of [DESKTOP_1440x900, MOBILE_390x844]) {
  test.describe(`UI transitions under reduce, ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });

    test("CTA hover overlay and header surface transitions are ≤ 150 ms (Req 9.10)", async ({ page }) => {
      await page.goto("/");
      await settle(page);

      const btn = await transitionSpans(page, ".btn", "::before");
      expect(btn.length).toBeGreaterThan(0);
      for (const v of btn) expect(v, ".btn::before transition").toBeLessThanOrEqual(RM_FADE);
      for (const v of await transitionSpans(page, ".site-header__surface")) {
        expect(v, "header surface transition (top state)").toBeLessThanOrEqual(RM_FADE);
      }

      // Hover the Primary_CTA: the running overlay transition is ≤ 150 ms.
      await page.locator(`${HERO_SELECTOR} .cta-group > a`).first().hover();
      const hover = await runningTransitions(page);
      for (const [prop, ms] of hover) expect(ms, `hover transition on ${prop}`).toBeLessThanOrEqual(RM_FADE);

      // Scroll into the header's scrolled state and back.
      await page.evaluate(() => {
        const spacer = document.createElement("div");
        spacer.style.blockSize = "2000px";
        document.body.append(spacer);
        window.scrollTo({ top: 200, behavior: "instant" });
      });
      await expect(page.locator("header#site-header")).toHaveAttribute("data-scrolled", "true");
      for (const [prop, ms] of await runningTransitions(page)) {
        expect(ms, `scroll-in transition on ${prop}`).toBeLessThanOrEqual(RM_FADE);
      }
      for (const v of await transitionSpans(page, ".site-header__surface")) {
        expect(v, "header surface transition (scrolled state)").toBeLessThanOrEqual(RM_FADE);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(page.locator("header#site-header")).not.toHaveAttribute("data-scrolled", "true");
      for (const [prop, ms] of await runningTransitions(page)) {
        expect(ms, `scroll-out transition on ${prop}`).toBeLessThanOrEqual(RM_FADE);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Mobile_Menu under reduce (fixture build)
// ---------------------------------------------------------------------------

test.describe("Mobile_Menu under reduce (fixture build)", { tag: NAV_LIVE_TAG }, () => {
  for (const vp of [MOBILE_390x844, TABLET_1024x768]) {
    test.describe(`at ${vp.name} (Req 8.9, 8.10)`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });

      test("panel and backdrop fade opacity-only ≤ 150 ms, no item stagger, link overlays ≤ 150 ms", async ({ page }) => {
        const slot = page.locator("header#site-header .site-header__menu");
        await page.goto("/");
        await expect(slot).toHaveAttribute("data-menu-ready", "true");
        await slot.locator("button.menu-trigger").click();
        const panel = page.locator(".mobile-menu__panel");
        await expect(panel).toBeVisible();

        const layers = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".mobile-menu__panel, .mobile-menu__backdrop")].map((el) => ({
            cls: el.className,
            display: getComputedStyle(el).display,
            anims: el.getAnimations().map((a) => {
              const t = (a.effect as KeyframeEffect).getComputedTiming();
              const props = (a.effect as KeyframeEffect)
                .getKeyframes()
                .flatMap((k) => Object.keys(k))
                .filter((k) => !["offset", "computedOffset", "easing", "composite"].includes(k));
              return { span: Number(t.duration) + Number(t.delay), props: [...new Set(props)] };
            }),
          })),
        );
        const visible = layers.filter((l) => l.display !== "none");
        expect(visible.length).toBe(vp.width >= 768 ? 2 : 1);
        for (const l of visible) {
          for (const a of l.anims) {
            expect(a.props, `${l.cls} animated properties`).toEqual(["opacity"]);
            expect(a.span, `${l.cls} fade`).toBeLessThanOrEqual(RM_FADE);
          }
        }
        const itemAnims = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".mobile-menu__nav .nav-list__item, .mobile-menu__footer")].map(
            (el) => el.getAnimations().length,
          ),
        );
        expect(itemAnims.length).toBeGreaterThan(0);
        expect(itemAnims, "item stagger animations").toEqual(itemAnims.map(() => 0));

        for (const v of await transitionSpans(page, ".mobile-menu__nav .nav-link", "::after")) {
          expect(v, ".nav-link::after transition").toBeLessThanOrEqual(RM_FADE);
        }
        await expect(panel).toHaveAttribute("data-phase", "open", { timeout: 1000 });

        // Close: the fade-out is opacity-only and ≤ 150 ms; the dialog unmounts.
        const closing = await page.evaluate(
          () =>
            new Promise<Array<{ span: number; props: string[] }>>((resolve) => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  resolve(
                    [...document.querySelectorAll<HTMLElement>(".mobile-menu__panel, .mobile-menu__backdrop")].flatMap((el) =>
                      el.getAnimations().map((a) => {
                        const t = (a.effect as KeyframeEffect).getComputedTiming();
                        const props = (a.effect as KeyframeEffect)
                          .getKeyframes()
                          .flatMap((k) => Object.keys(k))
                          .filter((k) => !["offset", "computedOffset", "easing", "composite"].includes(k));
                        return { span: Number(t.duration) + Number(t.delay), props: [...new Set(props)] };
                      }),
                    ),
                  ),
                ),
              );
            }),
        );
        for (const a of closing) {
          expect(a.props, "closing animated properties").toEqual(["opacity"]);
          expect(a.span, "closing fade").toBeLessThanOrEqual(RM_FADE);
        }
        await expect(panel).toHaveCount(0, { timeout: 1000 });
      });
    });
  }
});
