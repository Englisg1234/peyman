import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { MOTION_MARK } from "../../lib/motion-marks";
import { distance, duration } from "../../lib/motion-tokens";
import { HERO_SELECTOR, settle } from "./support/settle";
import { DESKTOP_1440x900, MOBILE_390x844, type TestViewport } from "./support/viewports";

// Motion enhancement e2e (task 16.6; Req 5.10, 9.6, 9.7, 9.13, 9.14, 9.15,
// 13.10, 13.11, 16.8, 17.7). Untagged: default build.
//
// Chunk timing and chunk failure are covered by motion-loader.spec.ts.
//
// Headless Chromium here reports hardwareConcurrency = 4, which is
// Low_Power_Mode (Req 9.12). "Capable" tests override hardwareConcurrency and
// deviceMemory to 8 in an init script; low-power tests set them to 2.

const EMBLEM_ROOT = `${HERO_SELECTOR} .raster-emblem[data-emblem-slot="hero"]`;
const SPECULAR = `${EMBLEM_ROOT} .raster-emblem__specular`;
const EMBLEM_PARALLAX = `${HERO_SELECTOR} .emblem-parallax`;
const LIGHT_PARALLAX = `${HERO_SELECTOR} .light-parallax`;
const CHUNK_GLOB = "**/_next/static/chunks/**/*.js";
const GSAP_SIGNATURE = /ScrollTrigger/;
/** parallax-driver.ts PERSPECTIVE on `.emblem-parallax`. */
const PERSPECTIVE = 1200;
/** Req 9.14: time allowed for the rest pose after the pointer leaves. */
const REST_WITHIN_MS = 1000;
/** Long enough for any late sweep to have armed (intro ends ≈ 840 ms). */
const NO_SWEEP_WAIT_MS = 2500;

const CAPABLE = { cores: 8, memory: 8 };
const LOW_POWER = { cores: 2, memory: 2 };

// ---------------------------------------------------------------------------
// In-page probe (serialized by addInitScript)
// ---------------------------------------------------------------------------

type Probe = {
  sweep: Array<{ t: number; value: string | null }>;
  introStyle: string[];
  wrapperStyle: number[];
  pageshow: boolean[];
  trace: boolean;
  rafStacks: string[];
};

function motionProbe(signals: { cores: number; memory: number } | null) {
  if (signals) {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { configurable: true, get: () => signals.cores });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => signals.memory });
  }
  const data: Probe = { sweep: [], introStyle: [], wrapperStyle: [], pageshow: [], trace: false, rafStacks: [] };
  (window as unknown as { __motion: Probe }).__motion = data;

  // rAF requests made while `trace` is on keep their call stack, so the
  // test can attribute them to the motion chunk.
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    if (data.trace) data.rafStacks.push(new Error().stack ?? "");
    return raf(cb);
  };

  new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target as Element;
      if (r.attributeName === "data-sweep") {
        data.sweep.push({ t: performance.now(), value: el.getAttribute("data-sweep") });
      } else if (r.attributeName === "style") {
        if (el.hasAttribute("data-intro")) data.introStyle.push(`${el.getAttribute("data-intro")}: ${el.getAttribute("style")}`);
        if (el.matches(".emblem-scroll, .emblem-parallax, .light-parallax")) data.wrapperStyle.push(performance.now());
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-sweep", "style"] });

  addEventListener("pageshow", (e) => data.pageshow.push(e.persisted));
}

const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __motion: Probe }).__motion);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collects console errors and uncaught page errors (Req 17.7). */
function trackErrors(page: Page, ignore: RegExp[] = []): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !ignore.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Records the file names of scripts whose body contains GSAP. */
function trackMotionChunk(page: Page): Set<string> {
  const files = new Set<string>();
  page.on("response", async (res) => {
    if (!res.url().endsWith(".js")) return;
    const body = await res.text().catch(() => "");
    if (GSAP_SIGNATURE.test(body)) files.add(new URL(res.url()).pathname.split("/").pop()!);
  });
  return files;
}

async function waitMotionReady(page: Page) {
  await expect
    .poll(() => page.evaluate((n) => performance.getEntriesByName(n, "mark").length, MOTION_MARK.ready), {
      timeout: 15_000,
    })
    .toBe(1);
}

async function open(page: Page, signals: { cores: number; memory: number } | null) {
  await page.addInitScript(motionProbe, signals);
  await page.goto("/");
  await waitMotionReady(page);
}

/** Waits for one armed-then-rested sweep. */
async function waitSweepDone(page: Page) {
  await expect
    .poll(async () => (await probe(page)).sweep.map((s) => s.value), { timeout: 10_000 })
    .toEqual(["active", null]);
}

const armedCount = async (page: Page) => (await probe(page)).sweep.filter((s) => s.value === "active").length;

/** The sweep's resting frame: not armed, copy hidden, no band position left behind. */
async function expectSweepAtRest(page: Page) {
  const rest = await page.evaluate(
    ({ root, copy }) => {
      const r = document.querySelector<HTMLElement>(root)!;
      const c = document.querySelector<HTMLElement>(copy)!;
      return { armed: r.dataset.sweep ?? null, display: getComputedStyle(c).display, x: c.style.getPropertyValue("--sweep-x") };
    },
    { root: EMBLEM_ROOT, copy: SPECULAR },
  );
  expect(rest).toEqual({ armed: null, display: "none", x: "" });
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

type Pose = { none: boolean; tx: number; ty: number; rx: number; ry: number; residual: number };

/**
 * Decomposes the computed transform of the parallax wrappers. The emblem's
 * matrix3d is perspective(1200px) · translate · rotateY · rotateX; removing
 * the known perspective leaves an affine matrix (residual ≈ 0).
 */
const poses = (page: Page): Promise<{ emblem: Pose; light: Pose }> =>
  page.evaluate(
    ({ emblem, light, perspective }) => {
      const read = (sel: string, p: number | null): Pose => {
        const tf = getComputedStyle(document.querySelector(sel)!).transform;
        if (tf === "none") return { none: true, tx: 0, ty: 0, rx: 0, ry: 0, residual: 0 };
        let m = new DOMMatrix(tf);
        if (p) {
          const P = new DOMMatrix();
          P.m34 = -1 / p;
          m = P.inverse().multiply(m);
        }
        const deg = (r: number) => (r * 180) / Math.PI;
        return {
          none: false,
          tx: m.m41,
          ty: m.m42,
          rx: deg(Math.atan2(-m.m32, m.m22)),
          ry: deg(Math.atan2(-m.m13, m.m11)),
          residual: Math.max(Math.abs(m.m14), Math.abs(m.m24), Math.abs(m.m34), Math.abs(m.m44 - 1)),
        };
      };
      return { emblem: read(emblem, perspective), light: read(light, null) };
    },
    { emblem: EMBLEM_PARALLAX, light: LIGHT_PARALLAX, perspective: PERSPECTIVE },
  );

/** Points 4 px inside the Hero's visible corners, below the fixed header. */
async function heroCorners(page: Page) {
  const box = await page.evaluate((hero) => {
    const h = document.querySelector(hero)!.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    return {
      left: h.left,
      right: h.right,
      top: Math.max(h.top, header.bottom),
      bottom: Math.min(h.bottom, innerHeight),
    };
  }, HERO_SELECTOR);
  const i = 4;
  return [
    { name: "top-left", x: box.left + i, y: box.top + i },
    { name: "top-right", x: box.right - i, y: box.top + i },
    { name: "bottom-left", x: box.left + i, y: box.bottom - i },
    { name: "bottom-right", x: box.right - i, y: box.bottom - i },
  ];
}

/** Moves the pointer over the Hero and reports whether any parallax transform appeared. */
async function pointerMovesEmblem(page: Page): Promise<boolean> {
  for (const c of await heroCorners(page)) await page.mouse.move(c.x, c.y, { steps: 4 });
  await page.waitForTimeout(duration.ui * 2);
  const { emblem, light } = await poses(page);
  return !emblem.none || !light.none;
}

type Composition = Array<{ intro: string; rect: number[] }>;

const composition = (page: Page): Promise<Composition> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-intro]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { intro: el.dataset.intro ?? "", rect: [r.left, r.top, r.width, r.height] };
    }),
  );

async function reducedReference(browser: Browser, vp: TestViewport, extra: BrowserContextOptions = {}): Promise<Composition> {
  const url = test.info().project.use.baseURL;
  const options: BrowserContextOptions = {
    baseURL: url,
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    ...extra,
    reducedMotion: "reduce",
  };
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto("/");
  await settle(page);
  const ref = await composition(page);
  await context.close();
  return ref;
}

function expectSameComposition(actual: Composition, reference: Composition) {
  expect(actual.map((e) => e.intro)).toEqual(reference.map((e) => e.intro));
  actual.forEach((e, i) =>
    e.rect.forEach((v, k) =>
      expect(Math.abs(v - reference[i].rect[k]), `${e.intro} #${i} rect[${k}]`).toBeLessThanOrEqual(1),
    ),
  );
}

// The sweep needs a decoded emblem when the CSS intro ends (Req 5.10). A cold
// image optimizer (risk R1) can miss that point, so warm both derivatives.
test.beforeAll(async ({ browser }) => {
  const baseURL = test.info().project.use.baseURL;
  for (const vp of [DESKTOP_1440x900, MOBILE_390x844]) {
    const touch = vp.width < 768;
    const context = await browser.newContext({
      baseURL,
      viewport: { width: vp.width, height: vp.height },
      isMobile: touch,
      hasTouch: touch,
    });
    const page = await context.newPage();
    await page.goto("/");
    await settle(page);
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// Desktop, fine pointer
// ---------------------------------------------------------------------------

const desktop = { viewport: { width: DESKTOP_1440x900.width, height: DESKTOP_1440x900.height } };

test.describe(`motion at ${DESKTOP_1440x900.name} (capable)`, () => {
  test.use(desktop);

  test("Specular_Sweep arms once for ~1400 ms, rests, and is not re-armed by resize, scroll or visibility (Req 9.6, 9.15)", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await open(page, CAPABLE);
    await waitSweepDone(page);
    const [armed, rested] = (await probe(page)).sweep;
    const span = rested.t - armed.t;
    expect(span, "sweep duration").toBeGreaterThanOrEqual(duration.sweep - 150);
    expect(span, "sweep duration").toBeLessThanOrEqual(duration.sweep + 150);
    await expectSweepAtRest(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setViewportSize(desktop.viewport);
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.blockSize = "3000px";
      document.body.append(spacer);
    });
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await setHidden(page, true);
    await setHidden(page, false);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);

    expect(await armedCount(page)).toBe(1);
    await expectSweepAtRest(page);
    expect(errors).toEqual([]);
  });

  test("a hidden document jumps a running sweep to rest; returning does not replay it (Req 9.13, 9.15)", async ({ page }) => {
    const errors = trackErrors(page);
    await open(page, CAPABLE);
    await page.waitForFunction((root) => document.querySelector<HTMLElement>(root)?.dataset.sweep === "active", EMBLEM_ROOT, {
      timeout: 10_000,
    });
    await setHidden(page, true);
    await expectSweepAtRest(page);
    const { sweep } = await probe(page);
    expect(sweep.at(-1)!.t - sweep[0].t, "stopped mid-pass").toBeLessThan(duration.sweep);

    await setHidden(page, false);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(1);
    await expectSweepAtRest(page);
    expect(errors).toEqual([]);
  });

  test("Pointer_Parallax stays within 12 px / 2°, moves the light opposite and rests on leave; GSAP never writes [data-intro] (Req 9.7, 9.14, 13.11)", async ({
    page,
    browser,
  }) => {
    const errors = trackErrors(page);
    await open(page, CAPABLE);
    await settle(page);
    await waitSweepDone(page);

    let maxTranslate = 0;
    for (const c of await heroCorners(page)) {
      await page.mouse.move(c.x, c.y, { steps: 6 });
      await page.waitForTimeout(duration.ui * 2);
      const { emblem, light } = await poses(page);
      const at = `${c.name} (${c.x.toFixed(0)}, ${c.y.toFixed(0)})`;
      expect(emblem.none, `emblem moved at ${at}`).toBe(false);
      expect(emblem.residual, `emblem matrix is perspective · affine at ${at}`).toBeLessThan(1e-6);
      const t = Math.hypot(emblem.tx, emblem.ty);
      maxTranslate = Math.max(maxTranslate, t);
      expect(t, `emblem translation at ${at}`).toBeLessThanOrEqual(distance.parallaxMax + 0.5);
      expect(Math.abs(emblem.rx), `rotationX at ${at}`).toBeLessThanOrEqual(distance.rotateMaxDeg + 0.05);
      expect(Math.abs(emblem.ry), `rotationY at ${at}`).toBeLessThanOrEqual(distance.rotateMaxDeg + 0.05);
      expect(Math.hypot(light.tx, light.ty), `light translation at ${at}`).toBeLessThanOrEqual(distance.parallaxMax + 0.5);
      for (const [e, l] of [
        [emblem.tx, light.tx],
        [emblem.ty, light.ty],
      ]) {
        if (Math.abs(e) > 0.5) expect(Math.sign(l), `light opposite at ${at}`).toBe(-Math.sign(e));
      }
    }
    expect(maxTranslate, "the corners reach most of the range").toBeGreaterThan(distance.parallaxMax / 2);

    // Leave the Hero for the fixed header: back to the static frame.
    const left = Date.now();
    await page.mouse.move(DESKTOP_1440x900.width / 2, 5, { steps: 2 });
    await expect
      .poll(async () => {
        const { emblem, light } = await poses(page);
        return emblem.none && light.none;
      }, { timeout: REST_WITHIN_MS, intervals: [50] })
      .toBe(true);
    expect(Date.now() - left).toBeLessThanOrEqual(REST_WITHIN_MS + 100);

    const p = await probe(page);
    expect(p.wrapperStyle.length, "GSAP wrote the parallax wrappers").toBeGreaterThan(0);
    // Any write to a [data-intro] style attribute after document start
    // (the SSR `--frame-tick-at` on the ticks is not a mutation).
    expect(p.introStyle, "inline style writes on [data-intro]").toEqual([]);

    expectSameComposition(await composition(page), await reducedReference(browser, DESKTOP_1440x900));
    expect(errors).toEqual([]);
  });

  test("idle and off-screen: no GSAP frames and no wrapper writes, even with pointer input (Req 9.13, 13.10)", async ({ page }) => {
    const errors = trackErrors(page);
    const motionFiles = trackMotionChunk(page);
    await open(page, CAPABLE);
    await settle(page);
    await waitSweepDone(page);
    await expect.poll(() => motionFiles.size).toBe(1);
    const [motionFile] = [...motionFiles];

    const window1s = async (move: () => Promise<void>) => {
      await page.evaluate(() => {
        const d = (window as unknown as { __motion: Probe }).__motion;
        d.rafStacks = [];
        d.wrapperStyle = [];
        d.trace = true;
      });
      const before = await poses(page);
      await move();
      await page.waitForTimeout(1000);
      await page.evaluate(() => ((window as unknown as { __motion: Probe }).__motion.trace = false));
      const p = await probe(page);
      const gsapFrames = p.rafStacks.filter((s) => s.includes(motionFile)).length;
      return { before, after: await poses(page), gsapFrames, writes: p.wrapperStyle.length };
    };

    // Idle on-screen: the pointer is outside the Hero and GSAP's ticker has
    // had time to sleep after the sweep.
    await page.waitForTimeout(2500);
    const idle = await window1s(async () => {});
    expect(idle.gsapFrames, "GSAP rAF while idle").toBe(0);
    expect(idle.writes).toBe(0);

    // Off-screen: scroll the Hero fully out, then move the pointer around.
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.blockSize = "3000px";
      document.body.append(spacer);
    });
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
    expect(await page.locator(HERO_SELECTOR).evaluate((h) => h.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.waitForTimeout(2500);
    const off = await window1s(async () => {
      for (const [x, y] of [
        [100, 200],
        [1300, 800],
        [720, 450],
      ])
        await page.mouse.move(x, y, { steps: 5 });
    });
    expect(off.gsapFrames, "GSAP rAF while off-screen").toBe(0);
    expect(off.writes, "wrapper style writes while off-screen").toBe(0);
    expect(off.after).toEqual(off.before);
    expect(errors).toEqual([]);
  });

  test("a chunk later than 1600 ms skips the sweep but keeps parallax (Req 16.8)", async ({ page }) => {
    const errors = trackErrors(page);
    await page.route(CHUNK_GLOB, async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (GSAP_SIGNATURE.test(body)) await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ response: res, body });
    });
    await open(page, CAPABLE);
    await settle(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(0);
    await expectSweepAtRest(page);
    expect(await pointerMovesEmblem(page), "parallax still enabled").toBe(true);
    expect(errors).toEqual([]);
  });

  test("a failed emblem image never gets the sweep (Req 5.10, 17.1)", async ({ page }) => {
    const errors = trackErrors(page, [/Failed to load resource/]);
    await page.route("**/_next/image**", (route) => route.abort("failed"));
    await open(page, CAPABLE);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(0);
    await expectSweepAtRest(page);
    expect(errors).toEqual([]);
  });

  test("Low_Power_Mode: no sweep and no parallax (Req 9.12)", async ({ page }) => {
    const errors = trackErrors(page);
    await open(page, LOW_POWER);
    await settle(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(0);
    expect(await pointerMovesEmblem(page)).toBe(false);
    expect((await probe(page)).wrapperStyle).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("bfcache restore holds the resting frame with no replay (Req 9.15)", async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(motionProbe, CAPABLE);
    await page.goto("/#x");
    await waitMotionReady(page);
    await waitSweepDone(page);
    await page.goto("about:blank");
    await page.goBack();
    await page.waitForLoadState();
    const p = await probe(page);
    test.skip(!p.pageshow.includes(true), "Chromium did not restore this page from the bfcache");
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(1);
    await expectSweepAtRest(page);
    expect(errors).toEqual([]);
  });
});

test.describe(`motion at ${DESKTOP_1440x900.name} (reduced motion)`, () => {
  test.use({ ...desktop, reducedMotion: "reduce" });

  test("no sweep and no parallax under prefers-reduced-motion: reduce (Req 9.10)", async ({ page }) => {
    const errors = trackErrors(page);
    await open(page, CAPABLE);
    await settle(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);
    expect(await armedCount(page)).toBe(0);
    await expectSweepAtRest(page);
    expect(await pointerMovesEmblem(page)).toBe(false);
    expect((await probe(page)).wrapperStyle).toEqual([]);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Mobile, touch
// ---------------------------------------------------------------------------

test.describe(`motion at ${MOBILE_390x844.name} (touch, capable)`, () => {
  test.use({
    viewport: { width: MOBILE_390x844.width, height: MOBILE_390x844.height },
    isMobile: true,
    hasTouch: true,
  });

  test("the sweep plays once; touch and mouse input never drive parallax (Req 9.6, 9.7)", async ({ page, browser }) => {
    const errors = trackErrors(page);
    await open(page, CAPABLE);
    await settle(page);
    await waitSweepDone(page);
    await expectSweepAtRest(page);

    const h1 = await page.locator(`${HERO_SELECTOR} h1`).boundingBox();
    await page.touchscreen.tap(h1!.x + h1!.width / 2, h1!.y + h1!.height / 2);
    expect(await pointerMovesEmblem(page)).toBe(false);
    const p = await probe(page);
    expect(p.wrapperStyle, "no GSAP writes on the parallax wrappers").toEqual([]);
    expect(p.introStyle).toEqual([]);
    expect(await armedCount(page)).toBe(1);

    const ref = await reducedReference(browser, MOBILE_390x844, { isMobile: true, hasTouch: true });
    expectSameComposition(await composition(page), ref);
    expect(errors).toEqual([]);
  });
});
