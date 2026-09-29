import { expect, test, type Page } from "@playwright/test";
import { computeHeroLayout, rectGap, intersectionArea, type Rect } from "../../lib/layout-model";
import { gotoSettled, HERO_SELECTOR } from "./support/settle";
import { TEST_VIEWPORTS, type TestViewport } from "./support/viewports";

// Layout-model conformance and headline line counts (task 12.2; Req 2.3, 2.4,
// 6.9, 11.1–11.4, 15.7, 16.3, 18.2, 18.3, 20.2). Untagged: runs against the
// default build at every Test_Viewport, both after the intro has settled and
// with Reduced_Motion_Mode emulated. This is the enforcement for risk R3.
//
// The DOM is compared with lib/layout-model.ts `computeHeroLayout()` (the pure
// test oracle) within 1 CSS px. Line counts are counted from line boxes
// (Range.getClientRects), with the Inter web font and with the web font
// blocked so the size-adjusted fallback renders (Req 16.3).

const TOLERANCE_PX = 1;
const FALLBACK_HEIGHT_TOLERANCE = 0.02;

/** The design's headline breaks table: 5 lines at 320–360, 4 at 375–414 and 667×375, 3 elsewhere. */
function expectedHeadlineLines(vp: TestViewport): number {
  if (vp.width === 320 || vp.width === 360) return 5;
  if (vp.width === 375 || vp.width === 390 || vp.width === 414) return 4;
  if (vp.width === 667 && vp.height === 375) return 4;
  return 3;
}

type Measured = {
  rects: Record<"hero" | "textBlock" | "headline" | "copy" | "primary" | "secondary" | "emblem" | "plinth", Rect>;
  headerBottom: number;
  headlineFontSize: number;
  headlineLines: number;
  headlineScroll: { scrollWidth: number; clientWidth: number };
  scrollWidth: number;
  innerWidth: number;
  innerHeight: number;
  ctaCount: number;
};

/** Measures every compared box in document coordinates (the page is at scroll 0). */
function measure(page: Page): Promise<Measured> {
  return page.evaluate((heroSel) => {
    const hero = document.querySelector(heroSel)!;
    const q = (sel: string) => {
      const el = hero.querySelector(sel);
      if (!el) throw new Error(`missing ${sel}`);
      return el;
    };
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    };
    const h1 = q("h1") as HTMLElement;
    const ctas = [...hero.querySelectorAll(".cta-group a")];

    // Line boxes: one client rect per line fragment; fragments whose tops lie
    // within half a line-height belong to the same line.
    const cs = getComputedStyle(h1);
    const fontSize = parseFloat(cs.fontSize);
    const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.06;
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

    const header = document.querySelector("header");
    return {
      rects: {
        hero: box(hero),
        textBlock: box(q(".hero-text")),
        headline: box(h1),
        copy: box(q(".hero-supporting")),
        primary: box(ctas[0]),
        secondary: box(ctas[1]),
        emblem: box(q(".emblem-stage")),
        plinth: box(q(".hero-framing__plinth")),
      },
      headerBottom: header ? header.getBoundingClientRect().bottom : 0,
      headlineFontSize: fontSize,
      headlineLines: lines,
      headlineScroll: { scrollWidth: h1.scrollWidth, clientWidth: h1.clientWidth },
      scrollWidth: document.scrollingElement!.scrollWidth,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      ctaCount: ctas.length,
    };
  }, HERO_SELECTOR);
}

const fmt = (r: Rect) => `{x:${r.x.toFixed(2)} y:${r.y.toFixed(2)} w:${r.w.toFixed(2)} h:${r.h.toFixed(2)}}`;

/** Acceptance geometry shared by every render (Req 10.9, 18.2, 18.3). */
function expectAcceptanceGeometry(m: Measured) {
  // Req 18.2: zero horizontal overflow.
  expect(m.scrollWidth, "document scrollWidth ≤ innerWidth").toBeLessThanOrEqual(m.innerWidth);
  // Headline never overflows its own box.
  expect(m.headlineScroll.scrollWidth, "headline scrollWidth ≤ clientWidth").toBeLessThanOrEqual(
    m.headlineScroll.clientWidth,
  );

  // Req 18.3: headline inside the viewport and below the Site_Header.
  const h = m.rects.headline;
  expect(h.x, `headline left ${fmt(h)}`).toBeGreaterThanOrEqual(0);
  expect(h.x + h.w, `headline right ${fmt(h)}`).toBeLessThanOrEqual(m.innerWidth);
  expect(h.y, `headline top ${fmt(h)}`).toBeGreaterThanOrEqual(0);
  expect(h.y + h.h, `headline bottom ${fmt(h)}`).toBeLessThanOrEqual(m.innerHeight);
  expect(m.headerBottom, "Site_Header rendered").toBeGreaterThan(0);
  expect(h.y, `headline top vs header bottom ${m.headerBottom}`).toBeGreaterThanOrEqual(m.headerBottom);

  // Req 18.3 and 10.9: CTAs never intersect, ≥ 8 px apart, ≥ 44×44 each.
  expect(m.ctaCount).toBe(2);
  const { primary, secondary } = m.rects;
  expect(intersectionArea(primary, secondary), `${fmt(primary)} × ${fmt(secondary)}`).toBe(0);
  expect(rectGap(primary, secondary), `CTA gap ${fmt(primary)} / ${fmt(secondary)}`).toBeGreaterThanOrEqual(8);
  for (const [name, r] of [["Primary", primary], ["Secondary", secondary]] as const) {
    expect(r.w, `${name}_CTA width ${fmt(r)}`).toBeGreaterThanOrEqual(44);
    expect(r.h, `${name}_CTA height ${fmt(r)}`).toBeGreaterThanOrEqual(44);
  }
}

for (const vp of TEST_VIEWPORTS) {
  test.describe(`Hero layout conformance at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

    const model = computeHeroLayout({ width: vp.width, height: vp.height });
    const expectedLines = expectedHeadlineLines(vp);

    for (const mode of ["default", "reduced"] as const) {
      test(`${mode} motion: rects match computeHeroLayout within 1 px; ${expectedLines}-line headline`, async ({
        page,
      }) => {
        if (mode === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
        await gotoSettled(page);
        const m = await measure(page);

        // Oracle sanity: the model agrees with the design's breaks table.
        expect(model.headline.lines, "model line count").toBe(expectedLines);

        const expected: Record<keyof Measured["rects"], Rect> = {
          hero: model.hero,
          textBlock: model.textBlock,
          headline: model.headline,
          copy: model.copy,
          primary: model.cta.primary,
          secondary: model.cta.secondary,
          emblem: model.emblem,
          plinth: model.plinth,
        };
        const mismatches: string[] = [];
        for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
          const a = m.rects[key];
          const e = expected[key];
          const off = (["x", "y", "w", "h"] as const).filter((k) => Math.abs(a[k] - e[k]) > TOLERANCE_PX);
          if (off.length) mismatches.push(`${key} [${off.join(",")}]: dom ${fmt(a)} model ${fmt(e)}`);
        }
        if (Math.abs(m.headerBottom - model.headerHeight) > TOLERANCE_PX) {
          mismatches.push(`header bottom: dom ${m.headerBottom} model ${model.headerHeight}`);
        }
        expect(mismatches, `band ${model.band}`).toEqual([]);

        expect(m.headlineFontSize, "headline font size").toBeCloseTo(model.headline.fontSize, 1);
        expect(m.headlineLines, "headline line boxes").toBe(expectedLines);
        expectAcceptanceGeometry(m);
      });
    }

    test("web font blocked: same line count, headline height within 2% (Req 16.3)", async ({ page, browser }, testInfo) => {
      await gotoSettled(page);
      const webFont = await measure(page);
      const interLoaded = await page.evaluate(() =>
        [...document.fonts].some((f) => f.status === "loaded" && !/fallback/i.test(f.family)),
      );
      expect(interLoaded, "Inter web font loaded in the reference render").toBe(true);

      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      try {
        const aborted: string[] = [];
        await context.route(/\.woff2(?:\?|$)/, (route) => {
          aborted.push(route.request().url());
          return route.abort();
        });
        const blocked = await context.newPage();
        await gotoSettled(blocked);
        const fallback = await measure(blocked);

        expect(aborted.length, "web font request was blocked").toBeGreaterThan(0);
        const webFaces = await blocked.evaluate(() =>
          [...document.fonts].filter((f) => f.status === "loaded" && !/fallback/i.test(f.family)).map((f) => f.family),
        );
        expect(webFaces, "no web font face rendered").toEqual([]);

        expect(webFont.headlineLines, "web-font line boxes").toBe(expectedLines);
        expect(fallback.headlineLines, "fallback line boxes").toBe(expectedLines);
        const hw = webFont.rects.headline.h;
        const hf = fallback.rects.headline.h;
        expect(Math.abs(hf - hw) / hw, `headline height web ${hw.toFixed(2)} vs fallback ${hf.toFixed(2)}`).toBeLessThanOrEqual(
          FALLBACK_HEIGHT_TOLERANCE,
        );
        expectAcceptanceGeometry(fallback);
      } finally {
        await context.close();
      }
    });
  });
}
