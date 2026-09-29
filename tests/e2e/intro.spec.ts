import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { toCssCubicBezier } from "../../lib/ease";
import { INTRO_TIMELINE, curve, distance, type IntroTarget } from "../../lib/motion-tokens";
import { settle } from "./support/settle";
import { DESKTOP_1440x900, MOBILE_390x844, type TestViewport } from "./support/viewports";

// Opening state e2e (task 15.2; Req 1.8, 9.1, 9.3, 9.4, 9.5, 9.10, 16.1, 17.3).
// Untagged: runs against the default build (`npm run build`, port 3000).
//
// The CSS intro (task 15.1, app/globals.css "Intro") runs from first paint
// with no JS. Every `[data-intro]` element is sampled on every animation
// frame from document start (an init script, installed before navigation),
// on the same clock as the First Contentful Paint entry. Times below are ms
// after FCP.

const HERO = "section[data-hero]";
const CTAS = `${HERO} .cta-group > a`;
/** The Primary_CTA destination (the Contact route). */
const PRIMARY_FRAGMENT = "/contact";

/** Req 9.5 bounds, ms after first paint. */
const SETTLE_MS = 900;
const HAIRLINE_SETTLE_MS = 800;
/** Req 9.4: lab LCP within this many ms of FCP. */
const LCP_AFTER_FCP_MS = 150;
/** How long after FCP the sampler keeps recording. */
const SAMPLE_WINDOW_MS = 1200;

const ENTRANCE = toCssCubicBezier(curve.entrance);
const STEP = new Map(INTRO_TIMELINE.map((s) => [s.target, s]));

// ---------------------------------------------------------------------------
// In-page frame sampler (serialized into the page by addInitScript)
// ---------------------------------------------------------------------------

type ElSample = { intro: string; op: number; tf: string; anims: number };
type Frame = {
  t: number;
  els: ElSample[];
  headlineEffOp: number | null;
  ctaBlocked: string[];
  ctaHit: boolean[];
};
type LcpEntry = { startTime: number; size: number; tag: string | null; cls: string | null };
type IntroData = { fcp: number | null; lcp: LcpEntry[]; frames: Frame[]; done: boolean };

function introSampler({ hero, ctas, windowMs }: { hero: string; ctas: string; windowMs: number }) {
  const data: IntroData = { fcp: null, lcp: [], frames: [], done: false };
  (window as unknown as { __intro: IntroData }).__intro = data;

  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === "first-contentful-paint") data.fcp = e.startTime;
  }).observe({ type: "paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as Array<PerformanceEntry & { size: number; element: Element | null }>) {
      data.lcp.push({
        startTime: e.startTime,
        size: e.size,
        tag: e.element?.tagName ?? null,
        cls: e.element?.getAttribute("class") ?? null,
      });
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });

  const frame = (t: number) => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-intro]")];
    if (els.length > 0) {
      const headline = document.querySelector<HTMLElement>(`${hero} [data-intro="headline"]`);
      let headlineEffOp: number | null = null;
      if (headline) {
        headlineEffOp = 1;
        for (let n: Element | null = headline; n; n = n.parentElement) {
          headlineEffOp *= Number(getComputedStyle(n).opacity);
        }
      }
      const ctaBlocked: string[] = [];
      const ctaHit: boolean[] = [];
      for (const a of document.querySelectorAll<HTMLElement>(ctas)) {
        for (let n: Element | null = a; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const who = `${n.tagName.toLowerCase()}.${n.getAttribute("class") ?? ""}`;
          if (cs.pointerEvents === "none") ctaBlocked.push(`${who}: pointer-events none`);
          if (cs.visibility !== "visible") ctaBlocked.push(`${who}: visibility ${cs.visibility}`);
          if (n.hasAttribute("inert")) ctaBlocked.push(`${who}: inert`);
          if (n.getAttribute("aria-hidden") === "true") ctaBlocked.push(`${who}: aria-hidden`);
        }
        const r = a.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        if (r.width > 0 && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) {
          const hit = document.elementFromPoint(x, y);
          ctaHit.push(!!hit && (hit === a || a.contains(hit)));
        }
      }
      data.frames.push({
        t,
        els: els.map((el) => {
          const cs = getComputedStyle(el);
          return { intro: el.dataset.intro ?? "", op: Number(cs.opacity), tf: cs.transform, anims: el.getAnimations().length };
        }),
        headlineEffOp,
        ctaBlocked,
        ctaHit,
      });
    }
    if ((data.fcp !== null && t - data.fcp >= windowMs) || t > 10_000) {
      data.done = true;
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function installSampler(page: Page) {
  await page.addInitScript(introSampler, { hero: HERO, ctas: CTAS, windowMs: SAMPLE_WINDOW_MS });
}

async function readSamples(page: Page): Promise<IntroData & { fcp: number }> {
  await page.waitForFunction(() => (window as unknown as { __intro?: IntroData }).__intro?.done === true, null, {
    timeout: 15_000,
  });
  const data = await page.evaluate(() => (window as unknown as { __intro: IntroData }).__intro);
  expect(data.fcp, "first-contentful-paint entry").not.toBeNull();
  return data as IntroData & { fcp: number };
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/** 2D matrix [a, b, c, d, e, f] of a computed transform; null for 3D. */
function matrixOf(tf: string): number[] | null {
  if (tf === "none") return [1, 0, 0, 1, 0, 0];
  const m = /^matrix\(([^)]+)\)$/.exec(tf);
  return m ? m[1].split(",").map(Number) : null;
}

const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps;

function isIdentity(tf: string): boolean {
  const m = matrixOf(tf);
  return !!m && [1, 0, 0, 1, 0, 0].every((v, i) => near(m[i], v));
}

/** translateY in px when `tf` is a pure vertical translation, else null. */
function pureTranslateY(tf: string): number | null {
  const m = matrixOf(tf);
  if (!m || ![1, 0, 0, 1, 0].every((v, i) => near(m[i], v))) return null;
  return m[5];
}

/**
 * Loads `/` without waiting for `load` and holds the CSS intro at its current
 * frame: polls every animation frame until every `[data-intro]` element has
 * exactly one animation (all INTRO_TIMELINE targets present), then pauses
 * them. Paused animations never finish, so lib/intro-done.ts cannot set
 * `html[data-intro-done]` (which drops the intro rules) before the test reads
 * them, and short steps (brand, 240 ms) are still attached however slow the
 * page load is.
 */
async function gotoHoldingIntro(page: Page) {
  await page.goto("/", { waitUntil: "commit" });
  const held = await page.evaluate(async (targets) => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    for (let i = 0; i < 600; i++) {
      const els = [...document.querySelectorAll<HTMLElement>("[data-intro]")];
      const present = new Set(els.map((el) => el.dataset.intro));
      if (
        document.documentElement?.hasAttribute("data-intro-done") === false &&
        targets.every((t) => present.has(t)) &&
        els.every((el) => el.getAnimations().length === 1)
      ) {
        for (const el of els) el.getAnimations()[0].pause();
        return true;
      }
      await nextFrame();
    }
    return false;
  }, INTRO_TIMELINE.map((s) => s.target));
  expect(held, "every [data-intro] element carries its intro animation").toBe(true);
}

/** Waits until no finite intro animation is running (works with JS disabled). */
async function waitForIntroEnd(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .filter((a) => a.playState === "running" && (a as CSSAnimation).animationName?.startsWith("intro-")).length,
        ),
      { timeout: 15_000 },
    )
    .toBe(0);
}

type Composition = Array<{ intro: string; op: number; tf: string; rect: [number, number, number, number] }>;

const composition = (page: Page): Promise<Composition> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-intro]")].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        intro: el.dataset.intro ?? "",
        op: Number(cs.opacity),
        tf: cs.transform,
        rect: [r.left, r.top, r.width, r.height] as [number, number, number, number],
      };
    }),
  );

function baseURL(): string {
  const url = test.info().project.use.baseURL;
  if (!url) throw new Error("project baseURL is not set");
  return url;
}

async function freshPage(browser: Browser, vp: TestViewport, options: BrowserContextOptions = {}) {
  const context = await browser.newContext({
    baseURL: baseURL(),
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    ...options,
  });
  return { context, page: await context.newPage() };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// ---------------------------------------------------------------------------
// Default motion, per viewport
// ---------------------------------------------------------------------------

for (const vp of [MOBILE_390x844, DESKTOP_1440x900]) {
  const mobile = vp.width < 768;

  test.describe(`opening state at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

    test("every sampled frame: headline at opacity 1, rise ≤ 12 px; CTAs operable; settled by 900 ms (Req 1.8, 9.4, 9.5, 16.1)", async ({
      page,
    }) => {
      await installSampler(page);
      await page.goto("/");
      const { fcp, frames } = await readSamples(page);
      const withHero = frames.filter((f) => f.headlineEffOp !== null);

      // Sampled from first paint: a frame at or before the FCP frame, and
      // samples at 0, 100 and 300 ms (the frame sampling covers every frame).
      // The hydration task can hold one frame back by > 50 ms under parallel
      // workers, so each checkpoint allows a 100 ms window.
      expect(withHero.length, "frames with the headline").toBeGreaterThan(20);
      expect(withHero[0].t - fcp, "first headline sample vs FCP").toBeLessThanOrEqual(20);
      for (const at of [0, 100, 300]) {
        expect(withHero.some((f) => f.t - fcp >= at && f.t - fcp < at + 100), `a sample at ${at} ms`).toBe(true);
      }
      expect(withHero.at(-1)!.t - fcp).toBeGreaterThanOrEqual(SETTLE_MS);

      for (const f of withHero) {
        const at = `t=${(f.t - fcp).toFixed(1)} ms`;
        expect(f.headlineEffOp, `headline opacity (incl. ancestors) at ${at}`).toBe(1);
        const headline = f.els.find((e) => e.intro === "headline")!;
        const ty = pureTranslateY(headline.tf);
        expect(ty, `headline transform ${headline.tf} at ${at}`).not.toBeNull();
        expect(ty!, at).toBeGreaterThanOrEqual(-1e-3);
        expect(ty!, at).toBeLessThanOrEqual(distance.headlineRise + 1e-3);

        expect(f.ctaBlocked, `CTA ancestors at ${at}`).toEqual([]);
        expect(f.ctaHit.length, `CTAs in view at ${at}`).toBeGreaterThanOrEqual(1);
        expect(f.ctaHit.every(Boolean), `CTA hit-testing at ${at}`).toBe(true);

        const dt = f.t - fcp;
        for (const e of f.els) {
          const bound = e.intro === "hairline" ? HAIRLINE_SETTLE_MS : SETTLE_MS;
          if (dt >= bound) {
            expect(e.op, `${e.intro} opacity at ${at}`).toBe(1);
            expect(isIdentity(e.tf), `${e.intro} transform ${e.tf} at ${at}`).toBe(true);
          }
        }
      }

      // The emblem is never below its 0.24 start opacity (D8).
      const firstEmblem = withHero.find((f) => f.els.some((e) => e.intro === "emblem"))!;
      const emblemOps = withHero.flatMap((f) => f.els.filter((e) => e.intro === "emblem").map((e) => e.op));
      expect(firstEmblem.els.find((e) => e.intro === "emblem")!.op).toBeCloseTo(distance.emblemFromOpacity, 3);
      expect(Math.min(...emblemOps)).toBeGreaterThanOrEqual(distance.emblemFromOpacity - 1e-3);

      // The intro did run (not a reduced-motion render by accident).
      expect(withHero[0].els.some((e) => e.anims > 0)).toBe(true);
    });

    test("intro animates only transform and opacity with INTRO_TIMELINE timing (Req 9.1, 9.3, 9.5)", async ({ page }) => {
      await gotoHoldingIntro(page);
      const report = await page.evaluate(
        ({ hero }) => {
          const IGNORED = new Set(["offset", "computedOffset", "easing", "composite"]);
          const intro = [...document.querySelectorAll<HTMLElement>("[data-intro]")].map((el) => ({
            intro: el.dataset.intro ?? "",
            cls: el.getAttribute("class") ?? "",
            anims: el.getAnimations().map((a) => {
              const effect = a.effect as KeyframeEffect;
              const timing = effect.getComputedTiming();
              const frames = effect.getKeyframes();
              return {
                name: (a as CSSAnimation).animationName ?? "",
                delay: Number(timing.delay),
                duration: Number(timing.duration),
                endTime: Number(timing.endTime),
                fill: timing.fill,
                iterations: timing.iterations,
                direction: timing.direction,
                firstEasing: frames[0]?.easing ?? null,
                props: [...new Set(frames.flatMap((k) => Object.keys(k).filter((p) => !IGNORED.has(p))))].sort(),
              };
            }),
          }));
          // Every animation or transition on the Header and Hero, intro or not.
          const all = document
            .getAnimations()
            .filter((a) => {
              const target = (a.effect as KeyframeEffect | null)?.target;
              return !!target && !!target.closest(`header, ${hero}`);
            })
            .map((a) => {
              const effect = a.effect as KeyframeEffect;
              const props =
                "transitionProperty" in a
                  ? [(a as CSSTransition).transitionProperty]
                  : effect.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !IGNORED.has(p)));
              return { kind: a.constructor.name, props: [...new Set(props)] };
            });
          return { intro, all };
        },
        { hero: HERO },
      );

      const targets = new Set(report.intro.map((e) => e.intro));
      expect([...targets].sort()).toEqual(INTRO_TIMELINE.map((s) => s.target).sort());

      for (const el of report.intro) {
        const step = STEP.get(el.intro as IntroTarget);
        expect(step, `unknown data-intro="${el.intro}"`).toBeDefined();
        const who = `${el.intro} (${el.cls})`;
        expect(el.anims, who).toHaveLength(1);
        const [a] = el.anims;
        expect(a.name, who).toMatch(/^intro-/);
        // Chromium keeps animation times in seconds, so ms sums carry float noise.
        expect(a.delay, `${who} delay`).toBeCloseTo(step!.delay, 6);
        expect(a.duration, `${who} duration`).toBeCloseTo(step!.duration, 6);
        expect(a.endTime, `${who} delay + duration`).toBeCloseTo(step!.delay + step!.duration, 6);
        expect(a.endTime, `${who} settles`).toBeLessThanOrEqual(
          (el.intro === "hairline" ? HAIRLINE_SETTLE_MS : SETTLE_MS) + 1e-6,
        );
        expect(a.fill, who).toBe("both");
        expect(a.iterations, who).toBe(1);
        expect(a.direction, who).toBe("normal");
        expect(a.firstEasing, `${who} curve`).toBe(ENTRANCE);

        // Exactly the properties named in the step's start state.
        const expected = [
          ...(step!.from.opacity !== undefined ? ["opacity"] : []),
          ...(step!.from.translateY !== undefined || step!.from.scale !== undefined ? ["transform"] : []),
        ].sort();
        expect(a.props, `${who} animated properties`).toEqual(expected);
      }
      // K5: the headline never animates opacity.
      expect(report.intro.find((e) => e.intro === "headline")!.anims[0].props).toEqual(["transform"]);

      for (const a of report.all) {
        for (const p of a.props) expect(["opacity", "transform"], `${a.kind} animates ${p}`).toContain(p);
      }
    });

    test("start state: emblem 0.24 / scale 0.98, headline +12 px at opacity 1, CTAs at 0 (Req 9.5, D8)", async ({ page }) => {
      await gotoHoldingIntro(page);
      // Rewind every intro animation to t = 0 (the backwards-fill start state).
      const start = await page.evaluate(() => {
        const out: Record<string, { op: number; tf: string }> = {};
        for (const el of document.querySelectorAll<HTMLElement>("[data-intro]")) {
          for (const a of el.getAnimations()) {
            a.pause();
            a.currentTime = 0;
          }
          const cs = getComputedStyle(el);
          out[el.dataset.intro ?? ""] ??= { op: Number(cs.opacity), tf: cs.transform };
        }
        return out;
      });

      const emblem = matrixOf(start.emblem.tf)!;
      expect(start.emblem.op).toBeCloseTo(distance.emblemFromOpacity, 3);
      expect(emblem[0]).toBeCloseTo(distance.emblemFromScale, 4);
      expect(emblem[3]).toBeCloseTo(distance.emblemFromScale, 4);
      expect(emblem[1]).toBeCloseTo(0, 6);
      expect(emblem[2]).toBeCloseTo(0, 6);

      expect(start.headline.op).toBe(1);
      expect(pureTranslateY(start.headline.tf)).toBeCloseTo(distance.headlineRise, 3);

      for (const t of ["copy", "cta"]) {
        expect(start[t].op, t).toBe(0);
        expect(pureTranslateY(start[t].tf), t).toBeCloseTo(distance.copyRise, 3);
      }
      expect(start.brand.op).toBe(0);
      expect(start.atmosphere.op).toBe(0);
    });

    test("Primary_CTA focused at 550 ms snaps to opacity 1 and activates (Req 1.8)", async ({ page }) => {
      await page.goto("/", { waitUntil: "commit" });
      const r = await page.evaluate(async (hero) => {
        const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
        let group: HTMLElement | null = null;
        let anim: Animation | undefined;
        while (!(anim = (group = document.querySelector<HTMLElement>(`${hero} [data-intro="cta"]`))?.getAnimations()[0])) {
          await nextFrame();
        }
        while (Number(anim.currentTime ?? 0) < 550) await nextFrame();
        const primary = group!.querySelector<HTMLAnchorElement>("a")!;
        const before = { time: Number(anim.currentTime), opacity: Number(getComputedStyle(group!).opacity) };
        primary.focus();
        const cs = getComputedStyle(group!);
        return {
          before,
          active: document.activeElement === primary,
          focusWithin: group!.matches(":focus-within"),
          opacity: Number(cs.opacity),
          transform: cs.transform,
          anims: group!.getAnimations().length,
        };
      }, HERO);

      // Focused mid-fade: the CTA fade runs 520–760 ms.
      expect(r.before.time).toBeGreaterThanOrEqual(550);
      expect(r.before.time).toBeLessThan(760);
      expect(r.before.opacity).toBeLessThan(1);
      expect(r.active).toBe(true);
      expect(r.focusWithin).toBe(true);
      expect(r.anims, ".cta-group:focus-within cancels the intro").toBe(0);
      expect(r.opacity).toBe(1);
      expect(isIdentity(r.transform), r.transform).toBe(true);

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`${PRIMARY_FRAGMENT}$`));
    });

    test("Primary_CTA is clickable from 100 ms, before its fade (Req 1.8)", async ({ page }) => {
      await page.goto("/", { waitUntil: "commit" });
      const center = await page.evaluate(async (hero) => {
        const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
        let group: HTMLElement | null = null;
        let anim: Animation | undefined;
        while (!(anim = (group = document.querySelector<HTMLElement>(`${hero} [data-intro="cta"]`))?.getAnimations()[0])) {
          await nextFrame();
        }
        while (Number(anim.currentTime ?? 0) < 100) await nextFrame();
        const primary = group!.querySelector<HTMLAnchorElement>("a")!;
        const w = window as unknown as { __press?: { time: number; opacity: number } };
        primary.addEventListener(
          "pointerdown",
          () => {
            w.__press = { time: Number(anim!.currentTime), opacity: Number(getComputedStyle(group!).opacity) };
            // The CTA navigates to a real route; keep the record across the navigation.
            sessionStorage.setItem("__press", JSON.stringify(w.__press));
          },
          { once: true },
        );
        const box = primary.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }, HERO);

      await page.mouse.click(center.x, center.y);
      await expect(page).toHaveURL(new RegExp(`${PRIMARY_FRAGMENT}$`));
      const press = await page.evaluate(() => {
        const raw = sessionStorage.getItem("__press");
        return raw ? (JSON.parse(raw) as { time: number; opacity: number }) : undefined;
      });
      expect(press, "pointerdown reached the Primary_CTA").toBeDefined();
      expect(press!.time, "pressed during the intro").toBeLessThan(760);
    });

    test(`LCP is the ${mobile ? "headline" : "emblem or headline"} within 150 ms of FCP (median of 3 loads; Req 9.4)`, async ({
      page,
      browser,
    }) => {
      test.setTimeout(90_000);
      // Warm the server and the image optimizer (risk R1) so a cold derivative
      // does not stand in for the page's own LCP timing.
      await page.goto("/");
      await settle(page);

      const runs: Array<{ delta: number; tag: string | null; cls: string | null }> = [];
      for (let i = 0; i < 3; i++) {
        const { context, page: p } = await freshPage(browser, vp);
        await installSampler(p);
        await p.goto("/");
        const { fcp } = await readSamples(p);
        await settle(p);
        const lcp = await p.evaluate(() => (window as unknown as { __intro: IntroData }).__intro.lcp);
        await context.close();
        expect(lcp.length, `run ${i}: LCP entries`).toBeGreaterThan(0);
        const last = lcp.at(-1)!;
        runs.push({ delta: last.startTime - fcp, tag: last.tag, cls: last.cls });
      }
      test.info().annotations.push({ type: "lcp-fcp", description: JSON.stringify(runs) });

      for (const [i, run] of runs.entries()) {
        const isH1 = run.tag === "H1";
        const isEmblem = run.tag === "IMG" && (run.cls ?? "").split(/\s+/).includes("raster-emblem__img");
        expect(mobile ? isH1 : isH1 || isEmblem, `run ${i}: LCP element ${run.tag}.${run.cls}`).toBe(true);
        expect(run.delta, `run ${i}: LCP before FCP`).toBeGreaterThanOrEqual(0);
      }
      expect(median(runs.map((r) => r.delta)), `LCP − FCP per run: ${JSON.stringify(runs)}`).toBeLessThanOrEqual(
        LCP_AFTER_FCP_MS,
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Reduced motion and no JS
// ---------------------------------------------------------------------------

for (const vp of [MOBILE_390x844, DESKTOP_1440x900]) {
  test.describe(`reduced motion at ${vp.name}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      reducedMotion: "reduce",
    });

    test("no intro animation: final composition from first paint (Req 9.10)", async ({ page }) => {
      await installSampler(page);
      await page.goto("/");
      const { fcp, frames } = await readSamples(page);
      const withHero = frames.filter((f) => f.headlineEffOp !== null);
      expect(withHero.length).toBeGreaterThan(20);
      expect(withHero[0].t - fcp, "first sample vs FCP").toBeLessThanOrEqual(20);
      for (const f of withHero) {
        const at = `t=${(f.t - fcp).toFixed(1)} ms`;
        expect(f.ctaBlocked, at).toEqual([]);
        for (const e of f.els) {
          expect(e.anims, `${e.intro} animations at ${at}`).toBe(0);
          expect(e.op, `${e.intro} opacity at ${at}`).toBe(1);
          expect(isIdentity(e.tf), `${e.intro} transform ${e.tf} at ${at}`).toBe(true);
        }
      }
    });
  });

  test.describe(`JavaScript disabled at ${vp.name}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      javaScriptEnabled: false,
    });

    test("the CSS intro runs and ends in the reduced-motion composition (Req 9.5, 17.3)", async ({ page, browser }) => {
      await page.goto("/");
      // The intro is CSS: it runs without JS.
      const introAnims = await page.evaluate(
        () => document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith("intro-")).length,
      );
      expect(introAnims).toBeGreaterThan(0);
      await waitForIntroEnd(page);
      const noJs = await composition(page);

      const { context, page: reduced } = await freshPage(browser, vp, { reducedMotion: "reduce" });
      await reduced.goto("/");
      await waitForIntroEnd(reduced);
      const reference = await composition(reduced);
      await context.close();

      expect(noJs.map((e) => e.intro)).toEqual(reference.map((e) => e.intro));
      noJs.forEach((e, i) => {
        const ref = reference[i];
        expect(e.op, `${e.intro} #${i} opacity`).toBe(1);
        expect(isIdentity(e.tf), `${e.intro} #${i} transform ${e.tf}`).toBe(true);
        e.rect.forEach((v, k) => expect(Math.abs(v - ref.rect[k]), `${e.intro} #${i} rect[${k}]`).toBeLessThanOrEqual(1));
      });
    });
  });
}
