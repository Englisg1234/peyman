import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { MOTION_MARK } from "../../lib/motion-marks";
import { HERO_EMBLEM_IMG_SELECTOR, HERO_SELECTOR, gotoSettled } from "./support/settle";
import { DESKTOP_1440x900, MOBILE_320x568, MOBILE_390x844, type TestViewport } from "./support/viewports";

// Failure injection (task 20.2; Req 16.3, 16.7, 16.8, 17.1, 17.2, 17.3, 17.7,
// 17.9, 17.10). Default build, Chromium. Each test compares the failure path
// with a normal render of the same viewport (the reference). Behavioral
// checks of the feature-query fallbacks on Firefox and WebKit run in 24.1;
// here the compiled CSS is checked statically.

const STAGE_SELECTOR = `${HERO_SELECTOR} .emblem-stage`;
const EMBLEM_ROOT = `${HERO_SELECTOR} .raster-emblem[data-emblem-slot="hero"]`;
const LIGHT_LAYER = `${HERO_SELECTOR} .light-layer`;
const THUMB_SELECTOR = ".brand-mark .brand-mark__thumb";
const BRAND_IMG_SELECTOR = `${THUMB_SELECTOR} .brand-mark__img`;
const CHUNK_GLOB = "**/_next/static/chunks/**/*.js";
const GSAP_SIGNATURE = /ScrollTrigger/;
/** Largest Brand_Mark thumbnail candidate (32 px × DPR 3). Hero candidates are larger. */
const BRAND_MAX_WIDTH = 96;
/** Long enough for any late sweep to have armed (intro ends ≈ 840 ms). */
const NO_SWEEP_WAIT_MS = 2500;
/** Req 16.8: a chunk later than this skips the sweep. */
const CHUNK_DELAY_MS = 2000;
const RECT_TOLERANCE_PX = 0.5;
const NAVY_950 = "rgb(4, 14, 35)";
/** Headless Chromium reports 4 cores (Low_Power_Mode); the sweep needs a capable device. */
const CAPABLE = { cores: 8, memory: 8 };

type Rect = { x: number; y: number; w: number; h: number };

const useViewport = (vp: TestViewport) =>
  test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

// ---------------------------------------------------------------------------
// In-page probes
// ---------------------------------------------------------------------------

type Probe = { shifts: number; sweepArmed: number };

/** Init script: capable signals, layout-shift total and sweep arming count. */
function failureProbe(signals: { cores: number; memory: number }) {
  Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { configurable: true, get: () => signals.cores });
  Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => signals.memory });
  const data: Probe = { shifts: 0, sweepArmed: 0 };
  (window as unknown as { __fallback: Probe }).__fallback = data;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
      if (!e.hadRecentInput) data.shifts += e.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
  new MutationObserver((records) => {
    for (const r of records) {
      if ((r.target as Element).getAttribute("data-sweep") === "active") data.sweepArmed++;
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-sweep"] });
}

const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __fallback: Probe }).__fallback);

/** Waits for fonts, the emblem request to finish (loaded or failed) and every finite animation. */
async function settleAny(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(() => page.evaluate((sel) => document.querySelector<HTMLImageElement>(sel)?.complete ?? false, HERO_EMBLEM_IMG_SELECTOR), {
      timeout: 15_000,
    })
    .toBe(true);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const running = document
            .getAnimations()
            .filter((a) => a.playState === "running" && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
          await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
          return running.length;
        }),
      { timeout: 15_000 },
    )
    .toBe(0);
  // Let pending layout-shift entries reach the observer. Waited from Node:
  // with JS disabled the page runs no rAF or timer callbacks.
  await page.waitForTimeout(100);
}

async function waitMotionMark(page: Page, name: string) {
  await expect
    .poll(() => page.evaluate((n) => performance.getEntriesByName(n, "mark").length, name), { timeout: 15_000 })
    .toBe(1);
}

type Snapshot = {
  header: Rect;
  thumb: Rect;
  brand: Rect;
  stage: Rect;
  headline: Rect;
  headlineLines: number;
  headlineText: string;
  ctas: Array<{ href: string | null; text: string; rect: Rect }>;
  intro: Array<{ intro: string; rect: Rect; opacity: string }>;
};

/** Geometry and text of everything a failure path must not change. */
function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(
    ({ hero, stage, thumb }) => {
      const box = (el: Element | null): { x: number; y: number; w: number; h: number } => {
        if (!el) throw new Error("missing element");
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      };
      const h = document.querySelector(hero)!;
      const h1 = h.querySelector<HTMLElement>("h1")!;
      const cs = getComputedStyle(h1);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.06;
      const range = document.createRange();
      range.selectNodeContents(h1);
      const fragments = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0).sort((a, b) => a.top - b.top);
      let lines = 0;
      let lastTop = -Infinity;
      for (const r of fragments) {
        if (r.top - lastTop > lineHeight / 2) {
          lines++;
          lastTop = r.top;
        }
      }
      return {
        header: box(document.querySelector("header")),
        thumb: box(document.querySelector(thumb)),
        brand: box(document.querySelector(".brand-mark")),
        stage: box(document.querySelector(stage)),
        headline: box(h1),
        headlineLines: lines,
        headlineText: h1.innerText,
        ctas: [...h.querySelectorAll<HTMLAnchorElement>(".cta-group a")].map((a) => ({
          href: a.getAttribute("href"),
          text: a.innerText,
          rect: box(a),
        })),
        intro: [...document.querySelectorAll<HTMLElement>("[data-intro]")].map((el) => ({
          intro: el.dataset.intro ?? "",
          rect: box(el),
          opacity: getComputedStyle(el).opacity,
        })),
      };
    },
    { hero: HERO_SELECTOR, stage: STAGE_SELECTOR, thumb: THUMB_SELECTOR },
  );
}

function expectSameRect(actual: Rect, expected: Rect, label: string) {
  for (const k of ["x", "y", "w", "h"] as const) {
    expect(Math.abs(actual[k] - expected[k]), `${label}.${k}: ref ${expected[k]} → ${actual[k]}`).toBeLessThanOrEqual(
      RECT_TOLERANCE_PX,
    );
  }
}

/** A normal render of `/` in a fresh context, settled. */
async function reference(browser: Browser, vp: TestViewport, extra: BrowserContextOptions = {}): Promise<Snapshot> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    ...extra,
  });
  try {
    const page = await context.newPage();
    await gotoSettled(page);
    return await snapshot(page);
  } finally {
    await context.close();
  }
}

/** The static final composition: same boxes, text and CTAs as the reference, every [data-intro] at opacity 1. */
function expectStaticComposition(actual: Snapshot, ref: Snapshot) {
  expect(actual.headlineText).toBe(ref.headlineText);
  expect(actual.headlineLines).toBe(ref.headlineLines);
  expectSameRect(actual.headline, ref.headline, "headline");
  expectSameRect(actual.header, ref.header, "header");
  expect(actual.ctas.map((c) => [c.href, c.text])).toEqual(ref.ctas.map((c) => [c.href, c.text]));
  actual.ctas.forEach((c, i) => expectSameRect(c.rect, ref.ctas[i].rect, `cta ${i}`));
  expect(actual.intro.map((e) => e.intro)).toEqual(ref.intro.map((e) => e.intro));
  actual.intro.forEach((e, i) => {
    expectSameRect(e.rect, ref.intro[i].rect, `[data-intro=${e.intro}] #${i}`);
    expect(e.opacity, `[data-intro=${e.intro}] #${i} opacity`).toBe("1");
  });
}

function trackErrors(page: Page, ignore: RegExp[] = []): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !ignore.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const RESOURCE_ERROR = /Failed to load resource/;

// ---------------------------------------------------------------------------
// Emblem 404 (Req 17.1)
// ---------------------------------------------------------------------------

test.describe(`emblem 404 at ${DESKTOP_1440x900.name}`, () => {
  useViewport(DESKTOP_1440x900);

  test("same box, CLS 0, no sweep; placeholder cover, vignette and pool kept; no alt text (Req 17.1)", async ({
    page,
    browser,
  }) => {
    const ref = await reference(browser, DESKTOP_1440x900);
    const errors = trackErrors(page, [RESOURCE_ERROR]);
    const failed: string[] = [];
    // Hero candidates only; the Brand_Mark thumbnail (≤ 96 px) still loads.
    await page.route("**/_next/image**", (route) => {
      const w = Number(new URL(route.request().url()).searchParams.get("w"));
      if (w > BRAND_MAX_WIDTH) {
        failed.push(route.request().url());
        return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
      }
      return route.continue();
    });
    await page.addInitScript(failureProbe, CAPABLE);
    await page.goto("/");
    await settleAny(page);
    await waitMotionMark(page, MOTION_MARK.ready);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);

    expect(failed.length, "hero emblem requests were failed").toBeGreaterThan(0);
    const img = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLImageElement>(sel)!;
      const after = getComputedStyle(el, "::after");
      return {
        naturalWidth: el.naturalWidth,
        alt: el.getAttribute("alt"),
        color: getComputedStyle(el).color,
        coverContent: after.content,
        coverBorder: after.borderTopColor,
        coverTint: after.backgroundColor,
        iconCover: getComputedStyle(el, "::before").backgroundColor,
      };
    }, HERO_EMBLEM_IMG_SELECTOR);
    expect(img.naturalWidth, "emblem failed").toBe(0);
    expect(img.alt, "decorative alt").toBe("");
    expect(img.color, "alt text guard").toBe("rgba(0, 0, 0, 0)");
    // The cover is a translucent navy-950 tint (the vignette and pool show
    // through) with an opaque navy-950 frame and icon square (task 20.1).
    expect(img.coverContent, "failure cover").not.toBe("none");
    expect(img.coverBorder, "cover frame hides the broken-image border").toBe(NAVY_950);
    expect(img.iconCover, "cover square hides the broken-image icon").toBe(NAVY_950);
    expect(img.coverTint, "translucent navy-950 tint").toMatch(/^color\(srgb 0\.0156\d* 0\.0549\d* 0\.1372\d* \/ 0\.\d+\)$/);

    const light = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel)!;
      const layer = (p: string) => {
        const s = getComputedStyle(el, p);
        return { content: s.content, image: s.backgroundImage };
      };
      return { opacity: getComputedStyle(el).opacity, vignette: layer("::before"), pool: layer("::after") };
    }, LIGHT_LAYER);
    expect(light.opacity, "Light_Layer visible").toBe("1");
    for (const [name, l] of [["vignette", light.vignette], ["pool", light.pool]] as const) {
      expect(l.content, `${name} rendered`).not.toBe("none");
      expect(l.image, `${name} gradient`).toContain("radial-gradient");
    }

    const actual = await snapshot(page);
    expectSameRect(actual.stage, ref.stage, "emblem stage");
    expectStaticComposition(actual, ref);

    const p = await probe(page);
    expect(p.shifts, "CLS").toBe(0);
    expect(p.sweepArmed, "sweep armed").toBe(0);
    expect(await page.locator(EMBLEM_ROOT).getAttribute("data-sweep")).toBeNull();
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Brand_Mark thumbnail 404 (Req 17.2)
// ---------------------------------------------------------------------------

for (const vp of [MOBILE_390x844, DESKTOP_1440x900]) {
  test.describe(`thumbnail 404 at ${vp.name}`, () => {
    useViewport(vp);

    test("header height, thumbnail box and wordmark position unchanged; link intact (Req 17.2)", async ({ page, browser }) => {
      const ref = await reference(browser, vp);
      const errors = trackErrors(page, [RESOURCE_ERROR]);
      // Every optimizer request fails, so the thumbnail cannot reuse a hero candidate.
      await page.route("**/_next/image**", (route) => route.fulfill({ status: 404, contentType: "text/plain", body: "not found" }));
      await page.addInitScript(failureProbe, CAPABLE);
      await page.goto("/");
      await settleAny(page);
      await expect
        .poll(() => page.evaluate((sel) => document.querySelector<HTMLImageElement>(sel)?.complete ?? false, BRAND_IMG_SELECTOR))
        .toBe(true);

      const thumb = await page.evaluate((sel) => {
        const el = document.querySelector<HTMLImageElement>(sel)!;
        return { naturalWidth: el.naturalWidth, alt: el.getAttribute("alt"), cover: getComputedStyle(el, "::after").content };
      }, BRAND_IMG_SELECTOR);
      expect(thumb.naturalWidth, "thumbnail failed").toBe(0);
      expect(thumb.alt).toBe("");
      expect(thumb.cover, "failure cover").not.toBe("none");

      const actual = await snapshot(page);
      expect(actual.header.h, "header height").toBeCloseTo(ref.header.h, 1);
      expectSameRect(actual.thumb, ref.thumb, "thumbnail box");
      expectSameRect(actual.brand, ref.brand, "Brand_Mark link");

      const link = page.locator(".brand-mark");
      await expect(link).toHaveAttribute("href", "/");
      await expect(link).toHaveAccessibleName(/Peyman Consulting/);
      await expect(link).toBeVisible();
      expect((await probe(page)).shifts, "CLS").toBe(0);
      expect(errors).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// Font 404 (Req 6.10, 16.3, 16.7)
// ---------------------------------------------------------------------------

for (const vp of [MOBILE_320x568, DESKTOP_1440x900]) {
  test.describe(`font 404 at ${vp.name}`, () => {
    useViewport(vp);

    test("same line counts and visible text with the size-adjusted fallback (Req 16.3, 16.7)", async ({ page, browser }) => {
      const ref = await reference(browser, vp);
      const errors = trackErrors(page, [RESOURCE_ERROR]);
      const failed: string[] = [];
      await page.route(/\.woff2(?:\?|$)/, (route) => {
        failed.push(route.request().url());
        return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
      });
      await gotoSettled(page);

      expect(failed.length, "web font requests were failed").toBeGreaterThan(0);
      const faces = await page.evaluate(() =>
        [...document.fonts].filter((f) => f.status === "loaded" && !/fallback/i.test(f.family)).map((f) => f.family),
      );
      expect(faces, "no web font face rendered").toEqual([]);

      const actual = await snapshot(page);
      expect(actual.headlineText).toBe(ref.headlineText);
      expect(actual.headlineLines, "headline line boxes").toBe(ref.headlineLines);

      // Visible text: every text block in the Hero and the header is painted.
      const hidden = await page.evaluate((hero) => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(`${hero} h1, ${hero} p, ${hero} .cta-group a, header a`)) {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          // Not rendered by design at this width (e.g. the header CTA below 768) or the skip link.
          // The no-JS menu disclosure is hidden by design once the JS menu hydrates.
          if (el.getClientRects().length === 0 || el.closest(".skip-link, [data-skip-link], [data-nojs-menu]")) continue;
          if (s.visibility !== "visible" || Number(s.opacity) < 1 || r.width === 0 || r.height === 0 || s.color.endsWith(", 0)"))
            out.push(`${el.tagName}.${el.className}: ${s.visibility} ${s.opacity} ${s.color} ${r.width}×${r.height}`);
        }
        return out;
      }, HERO_SELECTOR);
      expect(hidden, "invisible text").toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// JS disabled and pre-hydration failure (Req 17.3)
// ---------------------------------------------------------------------------

for (const vp of [MOBILE_390x844, DESKTOP_1440x900]) {
  test.describe(`no JS at ${vp.name}`, () => {
    useViewport(vp);

    test("JS disabled: the static final composition after the CSS intro; CTAs are links (Req 17.3)", async ({ browser }) => {
      const ref = await reference(browser, vp);
      const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor,
        javaScriptEnabled: false,
      });
      try {
        const page = await context.newPage();
        await page.goto("/");
        await settleAny(page);
        expectStaticComposition(await snapshot(page), ref);
        // The no-JS stylesheet drops the placeholder, so no navy box stays behind the emblem.
        const bg = await page.evaluate(
          (sel) => getComputedStyle(document.querySelector(sel)!).backgroundColor,
          HERO_EMBLEM_IMG_SELECTOR,
        );
        expect(bg, "no placeholder without JS").toBe("rgba(0, 0, 0, 0)");
      } finally {
        await context.close();
      }
    });

    test("every app chunk aborted: the same static composition, no uncaught error (Req 17.3)", async ({ page, browser }) => {
      const ref = await reference(browser, vp);
      const errors = trackErrors(page, [RESOURCE_ERROR]);
      const aborted: string[] = [];
      await page.route(CHUNK_GLOB, (route) => {
        aborted.push(route.request().url());
        return route.abort("failed");
      });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      // Without hydration next/image keeps the placeholder style; wait for the
      // bytes and the CSS intro instead of the settled-emblem condition.
      await expect
        .poll(() => page.evaluate((sel) => document.querySelector<HTMLImageElement>(sel)!.naturalWidth > 0, HERO_EMBLEM_IMG_SELECTOR), {
          timeout: 15_000,
        })
        .toBe(true);
      await settleAny(page);

      expect(aborted.length, "chunks were aborted").toBeGreaterThan(0);
      expectStaticComposition(await snapshot(page), ref);
      expect(await page.evaluate((n) => performance.getEntriesByName(n, "mark").length, MOTION_MARK.start)).toBe(0);
      expect(errors).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// Motion chunk abort and delay (Req 16.8, 17.7)
// ---------------------------------------------------------------------------

test.describe(`motion chunk at ${DESKTOP_1440x900.name}`, () => {
  useViewport(DESKTOP_1440x900);

  /** Fails or delays only the chunk that carries GSAP. */
  async function routeMotionChunk(page: Page, mode: "abort" | "delay") {
    const hits: string[] = [];
    await page.route(CHUNK_GLOB, async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (GSAP_SIGNATURE.test(body)) {
        hits.push(route.request().url());
        if (mode === "abort") return route.abort("failed");
        await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
      }
      try {
        await route.fulfill({ response: res, body });
      } catch {
        // Page closed while the request was held.
      }
    });
    return hits;
  }

  test("abort: static final composition, no sweep, no uncaught error (Req 17.7)", async ({ page, browser }) => {
    const ref = await reference(browser, DESKTOP_1440x900);
    const errors = trackErrors(page, [RESOURCE_ERROR]);
    const hits = await routeMotionChunk(page, "abort");
    await page.addInitScript(failureProbe, CAPABLE);
    await page.goto("/");
    await waitMotionMark(page, MOTION_MARK.failed);
    await settleAny(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);

    expect(hits.length, "motion chunk requested").toBeGreaterThan(0);
    expectStaticComposition(await snapshot(page), ref);
    const p = await probe(page);
    expect(p.sweepArmed).toBe(0);
    expect(p.shifts, "CLS").toBe(0);
    expect(errors).toEqual([]);
  });

  test(`delay ${CHUNK_DELAY_MS} ms: no sweep, the composition is unchanged (Req 16.8)`, async ({ page, browser }) => {
    const ref = await reference(browser, DESKTOP_1440x900);
    const errors = trackErrors(page);
    const hits = await routeMotionChunk(page, "delay");
    await page.addInitScript(failureProbe, CAPABLE);
    await page.goto("/");
    await waitMotionMark(page, MOTION_MARK.ready);
    await settleAny(page);
    await page.waitForTimeout(NO_SWEEP_WAIT_MS);

    expect(hits.length, "motion chunk requested").toBeGreaterThan(0);
    expectStaticComposition(await snapshot(page), ref);
    const p = await probe(page);
    expect(p.sweepArmed, "late chunk skips the sweep").toBe(0);
    expect(p.shifts, "CLS").toBe(0);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Feature-query fallbacks in the compiled CSS (Req 17.8, 17.9, 17.10)
// ---------------------------------------------------------------------------

test.describe("compiled CSS fallbacks", () => {
  test("@supports fallbacks for backdrop-filter, mask-image and svh exist (Req 17.8–17.10)", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => l.href),
    );
    expect(hrefs.length, "stylesheets").toBeGreaterThan(0);
    const css = (await Promise.all(hrefs.map(async (h) => (await request.get(h)).text()))).join("\n");
    const flat = css.replace(/\s+/g, "");

    // Parsed by the browser, so the checks survive minification.
    const rules = await page.evaluate(() => {
      const out: Array<{ condition: string; selectors: string[]; body: string }> = [];
      const walk = (list: CSSRuleList, condition: string | null) => {
        for (const r of list) {
          if (r instanceof CSSSupportsRule) walk(r.cssRules, r.conditionText);
          else if (r instanceof CSSStyleRule) {
            if (condition) out.push({ condition, selectors: [r.selectorText], body: r.style.cssText });
            if (r.cssRules?.length) walk(r.cssRules, condition);
          } else if ("cssRules" in r && (r as CSSGroupingRule).cssRules) walk((r as CSSGroupingRule).cssRules, condition);
        }
      };
      for (const s of document.styleSheets) {
        try {
          walk(s.cssRules, null);
        } catch {
          // Cross-origin sheet: none expected.
        }
      }
      return out;
    });
    const find = (cond: RegExp, sel: RegExp) => rules.filter((r) => cond.test(r.condition) && r.selectors.some((s) => sel.test(s)));

    const backdrop = find(/^not\s*\(.*backdrop-filter/, /\.site-header__surface/);
    expect(backdrop, "@supports not (backdrop-filter) header rule").not.toHaveLength(0);
    expect(backdrop.map((r) => r.body).join(" "), "96% ink-950 fill").toMatch(/background-color: (?:rgba\(5, 7, 12, 0\.96\)|[^;]*96%)/);

    const mask = find(/^not\s*\(.*mask-image/, /\.raster-emblem__specular/);
    expect(mask, "@supports not (mask-image) specular rule").not.toHaveLength(0);
    expect(mask.map((r) => r.body).join(" ")).toContain("display: none");

    // The vh → svh cascade: a 100vh base on .hero, upgraded to 100svh by the feature query.
    const svh = find(/height:\s*1svh/, /^\.hero$/);
    expect(svh, "@supports (height: 1svh) hero rule").not.toHaveLength(0);
    expect(svh.map((r) => r.body).join(" "), "svh upgrade").toContain("min-block-size: 100svh");
    expect(flat, "100vh base on .hero").toMatch(/\.hero\{[^}]*min-block-size:100vh[;}]/);

    // Every other vh base keeps its svh/dvh upgrade in a feature query (the
    // minifier drops same-property fallback declarations).
    const upgrades: Array<[RegExp, RegExp, string, RegExp]> = [
      [/height:\s*1svh/, /^\.hero__stage$/, "block-size: clamp(120px, 22svh, 200px)", /\.hero__stage\{[^}]*block-size:clamp\(120px,22vh,200px\)/],
      [/height:\s*1svh/, /^\.hero__stage$/, "block-size: clamp(96px, 16svh, 140px)", /\.hero__stage\{[^}]*block-size:clamp\(96px,16vh,140px\)/],
      [/height:\s*1dvh/, /^\.mobile-menu__panel$/, "block-size: 100dvh", /\.mobile-menu__panel\{[^}]*block-size:100vh[;}]/],
      [/height:\s*1dvh/, /^\.nojs-menu__panel$/, "max-block-size: calc(100dvh", /\.nojs-menu__panel\{[^}]*max-block-size:calc\(100vh/],
    ];
    for (const [cond, sel, upgrade, base] of upgrades) {
      const hits = find(cond, sel);
      expect(hits.map((r) => r.body).join(" "), `${sel.source} upgrade`).toContain(upgrade);
      expect(flat, `${sel.source} vh base`).toMatch(base);
    }
  });
});
