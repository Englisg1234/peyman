import { expect, test, type Page } from "@playwright/test";
import { ACCEPT_VARIANTS, MAX_WIDTH, budgetFor, formatReport, warmImages } from "../../scripts/warm-images.mjs";
import { HERO_EMBLEM_IMG_SELECTOR, HERO_SELECTOR, gotoSettled } from "./support/settle";
import {
  DESKTOP_1440x900,
  DESKTOP_1920x1080_DPR2,
  LANDSCAPE_667x375,
  MOBILE_320x568,
  MOBILE_390x844,
  TABLET_768x1024,
  ULTRA_3840x2160,
  type TestViewport,
} from "./support/viewports";

// Image budgets and delivery (task 19.2; Req 5.2, 5.5, 13.6, 16.2).
//
// Runs on the default build. The Playwright globalSetup has already warmed
// every derivative (tests/e2e/support/warm-images.ts), so no measurement here
// includes a cold AVIF encode (risk R1).

/**
 * Intrinsic width of the emblem master (assets/emblem/README.md: 1003×1144).
 * The optimizer never upscales: a 1080 or 1240 candidate is served at 1003 px.
 * So once rendered width × DPR passes 1003, no candidate can add real pixels,
 * and the "candidate covers the rendered size" check is capped at the master.
 */
const MASTER_WIDTH = 1003;
/** Largest Brand_Mark thumbnail candidate: 32 px × DPR 3 → the 96 px size. */
const BRAND_MAX_WIDTH = 96;
/** navy-950 (#040e23), the Req 16.2 placeholder surface. */
const NAVY_950 = "rgb(4, 14, 35)";
const IMAGE_DELAY_MS = 1500;
const RECT_TOLERANCE_PX = 0.5;

const BRAND_IMG_SELECTOR = ".brand-mark .brand-mark__thumb .brand-mark__img";
const STAGE_SELECTOR = `${HERO_SELECTOR} .emblem-stage`;
const AVIF = ACCEPT_VARIANTS.find((v) => v.name === "avif")!;

const MOBILE_390x844_DPR3: TestViewport = { ...MOBILE_390x844, name: "390x844@3x", deviceScaleFactor: 3 };

const CANDIDATE_VIEWPORTS: readonly TestViewport[] = [
  MOBILE_320x568,
  MOBILE_390x844_DPR3,
  LANDSCAPE_667x375,
  TABLET_768x1024,
  DESKTOP_1440x900,
  DESKTOP_1920x1080_DPR2,
  ULTRA_3840x2160,
];

const useViewport = (vp: TestViewport) =>
  test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

function baseURL(): string {
  const url = test.info().project.use.baseURL;
  if (!url) throw new Error("project baseURL is not set");
  return url;
}

/** Parses an optimizer URL; returns its `w` or throws with the offending URL. */
function optimizerWidth(src: string): number {
  const url = new URL(src);
  expect(url.pathname, `optimizer URL: ${src}`).toBe("/_next/image");
  const w = Number(url.searchParams.get("w"));
  expect(w, `w parameter of ${src}`).toBeGreaterThan(0);
  return w;
}

/** Value of `name` on a raw HTML tag (case-insensitive), or undefined. */
function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];
}

async function stageRect(page: Page) {
  return page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, STAGE_SELECTOR);
}

test.describe("Image optimizer", () => {
  test("derivative budgets: every srcset candidate is served within Req 13.6 (Req 5.5, 13.6)", async () => {
    test.setTimeout(60_000);
    const result = await warmImages(baseURL());
    expect(result.rows.length, "derivatives requested").toBeGreaterThan(0);
    expect(result.failures, formatReport(result)).toEqual([]);
  });
});

test.describe("Selected candidates (Req 5.2, 5.5, 13.6)", () => {
  for (const vp of CANDIDATE_VIEWPORTS) {
    test.describe(`at ${vp.name}`, () => {
      useViewport(vp);

      test("hero emblem and Brand_Mark candidates, budget and preload", async ({ page }) => {
        test.setTimeout(60_000);
        const imageRequests: string[] = [];
        page.on("request", (req) => {
          if (new URL(req.url()).pathname === "/_next/image") imageRequests.push(req.url());
        });
        await gotoSettled(page);

        // Hero emblem: selected candidate.
        const hero = await page.evaluate((sel) => {
          const img = document.querySelector<HTMLImageElement>(sel)!;
          return { src: img.currentSrc, width: img.getBoundingClientRect().width, dpr: window.devicePixelRatio };
        }, HERO_EMBLEM_IMG_SELECTOR);
        expect(hero.dpr, "device pixel ratio").toBe(vp.deviceScaleFactor);
        const w = optimizerWidth(hero.src);
        expect(new URL(hero.src).searchParams.get("url") ?? "", "optimizer source").toContain("peyman-emblem");
        expect(w, `candidate width ≤ ${MAX_WIDTH} (Req 5.5)`).toBeLessThanOrEqual(MAX_WIDTH);
        expect(
          hero.width * hero.dpr,
          `rendered ${hero.width} CSS px × DPR ${hero.dpr} is covered by w=${w} (or the ${MASTER_WIDTH} px master)`,
        ).toBeLessThanOrEqual(Math.max(w, MASTER_WIDTH));

        // The same candidate under an AVIF-first Accept header: type and budget.
        const res = await page.request.get(hero.src, { headers: { Accept: AVIF.accept } });
        expect(res.status(), `GET ${hero.src}`).toBe(200);
        const type = (res.headers()["content-type"] ?? "").split(";")[0].trim();
        expect(type, "served format").toBe(AVIF.expect);
        const bytes = (await res.body()).byteLength;
        const limit = budgetFor(type, w);
        expect(limit, `Req 13.6 budget for ${type} at w=${w}`).toBeDefined();
        expect(bytes, `w=${w} ${type} bytes (limit ${limit})`).toBeLessThanOrEqual(limit!);

        // Served HTML: exactly one image preload, for the hero emblem (Req 16.2).
        const html = await (await page.request.get("/")).text();
        const preloads = (html.match(/<link\b[^>]*>/gi) ?? []).filter(
          (tag) => attr(tag, "rel")?.toLowerCase() === "preload" && attr(tag, "as")?.toLowerCase() === "image",
        );
        expect(preloads, "image preloads in the served HTML").toHaveLength(1);
        expect(attr(preloads[0], "imagesrcset") ?? "", "preload imagesrcset").toContain("peyman-emblem");
        expect(attr(preloads[0], "fetchpriority"), "preload fetchpriority").toBe("high");

        // Brand_Mark thumbnail: a small candidate (32/64/96 px), never a separate
        // hero-size download. Its srcset shares URLs with the hero's (same
        // source and quality), and Chromium may pick a larger candidate that is
        // already in its memory cache: reusing the hero derivative costs no bytes.
        const brand = page.locator(BRAND_IMG_SELECTOR).first();
        await expect.poll(() => brand.evaluate((img: HTMLImageElement) => img.currentSrc), { timeout: 15_000 }).not.toBe("");
        const brandSrc = await brand.evaluate((img: HTMLImageElement) => img.currentSrc);
        const brandW = optimizerWidth(brandSrc);
        if (brandSrc !== hero.src) {
          expect(brandW, `Brand_Mark candidate ${brandSrc}`).toBeLessThanOrEqual(BRAND_MAX_WIDTH);
        }
        const extra = [...new Set(imageRequests)].filter((u) => u !== hero.src && optimizerWidth(u) > BRAND_MAX_WIDTH);
        expect(extra, `optimizer downloads besides the hero candidate ${hero.src}`).toEqual([]);
      });
    });
  }
});

interface ShiftSource {
  node?: Node | null;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}
interface ShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: ShiftSource[];
}

test.describe("Reserved emblem box (Req 16.2)", () => {
  for (const vp of [MOBILE_390x844, DESKTOP_1440x900]) {
    test.describe(`at ${vp.name}`, () => {
      useViewport(vp);

      test("reserved box and CLS 0 while the emblem is delayed", async ({ page }) => {
        test.setTimeout(60_000);
        await page.addInitScript(() => {
          const w = window as unknown as { __shifts: PerformanceEntry[] };
          w.__shifts = [];
          new PerformanceObserver((list) => {
            w.__shifts.push(...list.getEntries());
          }).observe({ type: "layout-shift", buffered: true });
        });
        await page.route("**/_next/image**", async (route) => {
          await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
          try {
            await route.continue();
          } catch {
            // Page closed while the request was held.
          }
        });

        await page.goto("/", { waitUntil: "commit" });
        await page.locator(STAGE_SELECTOR).waitFor({ state: "attached" });
        // Measure the reservation with styles applied and fonts settled, so a
        // font swap cannot be mistaken for (or hide) an image-driven change.
        await page.waitForLoadState("domcontentloaded");
        await expect
          .poll(() =>
            page.evaluate(() =>
              [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every((l) => l.sheet !== null),
            ),
          )
          .toBe(true);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));

        const before = await stageRect(page);
        expect(before.width, "reserved stage width").toBeGreaterThan(0);
        expect(before.height, "reserved stage height").toBeGreaterThan(0);

        const placeholder = await page.evaluate((sel) => {
          const img = document.querySelector<HTMLImageElement>(sel)!;
          return {
            active: img.style.backgroundImage !== "" && img.naturalWidth === 0,
            color: getComputedStyle(img).backgroundColor,
          };
        }, HERO_EMBLEM_IMG_SELECTOR);
        expect(placeholder.active, "placeholder still shown while the image is delayed").toBe(true);
        expect(placeholder.color, "placeholder surface is navy-950").toBe(NAVY_950);

        await expect
          .poll(
            () =>
              page.evaluate((sel) => {
                const img = document.querySelector<HTMLImageElement>(sel)!;
                return img.complete && img.naturalWidth > 0;
              }, HERO_EMBLEM_IMG_SELECTOR),
            { timeout: 20_000 },
          )
          .toBe(true);

        const after = await stageRect(page);
        for (const key of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(after[key] - before[key]), `stage ${key}: ${before[key]} → ${after[key]}`).toBeLessThanOrEqual(
            RECT_TOLERANCE_PX,
          );
        }

        // Let any pending layout-shift entries reach the observer.
        await page.evaluate(
          () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
        );
        const shift = await page.evaluate((sel) => {
          const hero = document.querySelector(sel)!;
          const h = hero.getBoundingClientRect();
          const hits = (r: DOMRectReadOnly) =>
            r.width > 0 && r.height > 0 && r.left < h.right && r.right > h.left && r.top < h.bottom && r.bottom > h.top;
          const entries = (window as unknown as { __shifts: ShiftEntry[] }).__shifts;
          let total = 0;
          const nodes: string[] = [];
          for (const e of entries) {
            if (e.hadRecentInput) continue;
            const inHero = (e.sources ?? []).filter(
              (s) => (s.node != null && hero.contains(s.node)) || hits(s.previousRect) || hits(s.currentRect),
            );
            if (inHero.length === 0) continue;
            total += e.value;
            for (const s of inHero) nodes.push(s.node instanceof Element ? s.node.className || s.node.tagName : String(s.node));
          }
          return { total, nodes };
        }, HERO_SELECTOR);
        expect(shift.total, `layout shift in the Hero (sources: ${shift.nodes.join(", ") || "none"})`).toBe(0);
      });
    });
  }
});
