import { expect, test, type Page } from "@playwright/test";
import { gotoSettled } from "./support/settle";
import {
  LANDSCAPE_667x375,
  LANDSCAPE_844x390,
  MOBILE_320x568,
  MOBILE_360x640,
  MOBILE_375x667,
  MOBILE_390x844,
  MOBILE_414x896,
  type TestViewport,
} from "./support/viewports";

// Mobile composition e2e (task 13.2; Req 1.3, 1.4, 10.1–10.11, 16.5, 16.6).
// Untagged: runs against the default build (`npm run build`, port 3000).
//
// Every layout check runs on the settled page: fonts ready, the emblem
// decoded with the next/image placeholder cleared, and every finite CSS
// animation finished (the final state of the intro, task 15.1).
//
// Safe areas: desktop Chromium reports env(safe-area-inset-*) as 0. The
// geometry tests therefore assert the 0-inset values, a stylesheet audit
// asserts every mobile edge adds its env(safe-area-inset-*), and one test
// applies CDP `Emulation.setSafeAreaInsetsOverride` where this Chromium
// supports it (skipped otherwise). Notched-device checks are manual (24.1).

const HEADLINE = "Bridging the Gap Between Innovation and Institutional Capital.";
const SUPPORTING_COPY =
  "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation.";
const PRIMARY_LABEL = "Start a Conversation";
const SECONDARY_LABEL = "Explore Advisory";

const HERO = "section[data-hero]";
const GRID = `${HERO} .hero__grid`;
const TEXT = `${HERO} .hero-text`;
const STAGE = `${HERO} .emblem-stage`;
const EMBLEM_IMG = `${STAGE} .raster-emblem__img`;
const H1 = `${HERO} h1`;
const COPY = `${HERO} .hero-supporting`;
const CTAS = `${HERO} .cta-group > a`;
const HEADER = "header#site-header";

/**
 * Emblem master ratio (measured 1003×1144, task 4.1; Site_Config and
 * docs/decisions.md) and the source trim (972:1108, Req 5.1, ±1%).
 */
const EMBLEM_RATIO = 1003 / 1144;
const SOURCE_RATIO = 972 / 1108;

/** The iPhone-with-toolbars case: 390 wide, about 660 px of small viewport. */
const MOBILE_390x660: TestViewport = { name: "390x660", width: 390, height: 660, deviceScaleFactor: 1 };

type Band = "tall" | "compact" | "landscape";

const PORTRAIT: ReadonlyArray<{ vp: TestViewport; band: Band }> = [
  { vp: MOBILE_320x568, band: "compact" },
  { vp: MOBILE_360x640, band: "compact" },
  { vp: MOBILE_375x667, band: "compact" },
  { vp: MOBILE_390x660, band: "compact" },
  { vp: MOBILE_390x844, band: "tall" },
  { vp: MOBILE_414x896, band: "tall" },
];
const LANDSCAPE: ReadonlyArray<{ vp: TestViewport; band: Band }> = [
  { vp: LANDSCAPE_667x375, band: "landscape" },
  { vp: LANDSCAPE_844x390, band: "landscape" },
];
const ALL = [...PORTRAIT, ...LANDSCAPE];

/** Tall-band rhythm (Req 10.2) and the compact band at 75% (Req 10.3). */
const RHYTHM = {
  tall: { padTop: 24, gapEmblem: 32, gapCopy: 20, gapCta: 28, padBottom: 24 },
  compact: { padTop: 18, gapEmblem: 24, gapCopy: 15, gapCta: 21, padBottom: 18 },
} as const;

/** Emblem height rule per portrait band, in px of the small viewport height. */
const EMBLEM_HEIGHT = {
  tall: { min: 120, svh: 0.22, max: 200 },
  compact: { min: 96, svh: 0.16, max: 140 },
} as const;

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

const rectOf = (page: Page, selector: string): Promise<Rect> =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  });

const rectsOf = (page: Page, selector: string): Promise<Rect[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }),
  );

/** Edge-to-edge distance between two boxes (0 when they touch or overlap). */
const spacing = (a: Rect, b: Rect): number =>
  Math.max(0, b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);

const intersects = (a: Rect, b: Rect): boolean =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.01 &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.01;

/** Visible, interactive elements in the Site_Header and the Hero. */
function targets(page: Page) {
  return page.evaluate(
    ({ header, hero }) =>
      [...document.querySelectorAll(`${header} :is(a, button, summary), ${hero} :is(a, button, summary)`)]
        .filter((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          // The unfocused skip link is clipped to 1 px on purpose (Req 7.14).
          return cs.display !== "none" && cs.visibility === "visible" && r.width > 1 && r.height > 1;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim(),
            rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
          };
        }),
    { header: HEADER, hero: HERO },
  );
}

// ---------------------------------------------------------------------------
// Geometry per viewport
// ---------------------------------------------------------------------------

for (const { vp, band } of ALL) {
  test.describe(`Mobile composition at ${vp.name} (${band})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

    test.beforeEach(async ({ page }) => {
      await gotoSettled(page);
    });

    test("DOM order keeps the Emblem_Stage last (Req 3.1, 10.1)", async ({ page }) => {
      const order = await page.locator(GRID).evaluate((grid, stageSel) => {
        const stage = document.querySelector(stageSel)!;
        const h1 = grid.querySelector("h1")!;
        const content = [...grid.querySelectorAll("h1, p, a, .emblem-stage")].filter(
          (el) => !el.closest('[aria-hidden="true"]') || el === stage,
        );
        return {
          lastChildIsStage: grid.lastElementChild === stage,
          stageAfterHeadline: Boolean(h1.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING),
          lastContent: content.at(-1) === stage,
          visualOrder: getComputedStyle(stage).order,
        };
      }, STAGE);
      expect(order.lastChildIsStage).toBe(true);
      expect(order.stageAfterHeadline).toBe(true);
      expect(order.lastContent).toBe(true);
    });

    if (band !== "landscape") {
      test("emblem stacks above the text, end-aligned in columns 3–4 (Req 10.1)", async ({ page }) => {
        const grid = await rectOf(page, GRID);
        const stage = await rectOf(page, STAGE);
        const text = await rectOf(page, TEXT);
        expect(stage.bottom, JSON.stringify({ stage, text })).toBeLessThanOrEqual(text.top + 0.5);
        expect(stage.right).toBeCloseTo(grid.right, 0);
        // 4 columns, 16 px gap: the emblem stays inside columns 3–4.
        const col = (grid.width - 3 * 16) / 4;
        expect(stage.left).toBeGreaterThanOrEqual(grid.left + 2 * (col + 16) - 0.5);
      });

      test(`emblem height follows the ${band} band rule and the 972:1108 ratio (Req 10.2, 10.3)`, async ({ page }) => {
        const rule = EMBLEM_HEIGHT[band as "tall" | "compact"];
        const svh = await page.evaluate(() => window.innerHeight);
        const expected = clamp(rule.min, rule.svh * svh, rule.max);
        const stage = await rectOf(page, STAGE);
        expect(Math.abs(stage.height - expected), `height ${stage.height} vs ${expected}`).toBeLessThanOrEqual(1);
        expect(Math.abs(stage.width - stage.height * EMBLEM_RATIO)).toBeLessThanOrEqual(1);
        expect(Math.abs(stage.width / stage.height / SOURCE_RATIO - 1)).toBeLessThanOrEqual(0.01);
        const img = await rectOf(page, EMBLEM_IMG);
        expect(img.height).toBeCloseTo(stage.height, 0);
        expect(img.width).toBeCloseTo(stage.width, 0);
      });

      test(`vertical rhythm matches the ${band} band (Req 10.2, 10.3)`, async ({ page }) => {
        const r = RHYTHM[band as "tall" | "compact"];
        const header = await rectOf(page, HEADER);
        const stage = await rectOf(page, STAGE);
        const h1 = await rectOf(page, H1);
        const copy = await rectOf(page, COPY);
        const [primary] = await rectsOf(page, CTAS);
        const padBottom = await page
          .locator(HERO)
          .evaluate((el) => parseFloat(getComputedStyle(el).paddingBlockEnd));
        const measured = {
          padTop: stage.top - header.bottom,
          gapEmblem: h1.top - stage.bottom,
          gapCopy: copy.top - h1.bottom,
          gapCta: primary.top - copy.bottom,
          padBottom,
        };
        for (const key of Object.keys(r) as Array<keyof typeof r>) {
          expect(Math.abs(measured[key] - r[key]), `${key}: ${measured[key]} vs ${r[key]}`).toBeLessThanOrEqual(1);
        }
      });

      test("CTAs stack full text width, ≥ 48 px tall, 12 px apart, Primary first (Req 10.5)", async ({ page }) => {
        const text = await rectOf(page, TEXT);
        const ctas = await page.locator(CTAS).evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { label: el.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          }),
        );
        expect(ctas.map((c) => c.label)).toEqual([PRIMARY_LABEL, SECONDARY_LABEL]);
        const [primary, secondary] = ctas;
        for (const c of ctas) {
          expect(c.height, c.label ?? "").toBeGreaterThanOrEqual(48);
          expect(Math.abs(c.left - text.left), c.label ?? "").toBeLessThanOrEqual(1);
          expect(Math.abs(c.width - text.width), c.label ?? "").toBeLessThanOrEqual(1);
        }
        expect(primary.bottom).toBeLessThanOrEqual(secondary.top);
        expect(Math.abs(secondary.top - primary.bottom - 12)).toBeLessThanOrEqual(1);
      });
    } else {
      test("landscape: 60/40 split, emblem ≤ 70svh and inside its column (Req 10.7)", async ({ page }) => {
        const grid = await page.locator(GRID).evaluate((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            tracks: cs.gridTemplateColumns.split(/\s+/).map(parseFloat),
            gap: parseFloat(cs.columnGap),
            left: r.left,
            right: r.right,
            width: r.width,
          };
        });
        expect(grid.tracks).toHaveLength(2);
        const [textCol, stageCol] = grid.tracks;
        expect(grid.gap).toBe(24);
        expect(textCol / (textCol + stageCol)).toBeCloseTo(0.6, 3);
        expect(textCol + stageCol + grid.gap).toBeCloseTo(grid.width, 0);

        const text = await rectOf(page, TEXT);
        const stage = await rectOf(page, STAGE);
        const svh = await page.evaluate(() => window.innerHeight);
        expect(text.left).toBeCloseTo(grid.left, 0);
        expect(text.width).toBeCloseTo(textCol, 0);
        expect(stage.left).toBeGreaterThanOrEqual(grid.left + textCol + grid.gap - 0.5);
        expect(stage.right).toBeCloseTo(grid.right, 0);
        expect(stage.width).toBeLessThanOrEqual(stageCol + 0.5);
        expect(stage.height).toBeLessThanOrEqual(0.7 * svh + 0.5);
        expect(Math.abs(stage.width / stage.height / SOURCE_RATIO - 1)).toBeLessThanOrEqual(0.01);
        expect(intersects(stage, text)).toBe(false);
      });

      test("landscape: Site_Header is 56 px tall (Req 10.11)", async ({ page }) => {
        const header = await rectOf(page, HEADER);
        expect(header.top).toBe(0);
        expect(header.height).toBeCloseTo(56, 1);
      });

      test("landscape: CTAs keep order, ≥ 48 px tall, never overlap (Req 3.4, 10.9)", async ({ page }) => {
        const ctas = await page.locator(CTAS).evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { label: el.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          }),
        );
        expect(ctas.map((c) => c.label)).toEqual([PRIMARY_LABEL, SECONDARY_LABEL]);
        const [primary, secondary] = ctas;
        for (const c of ctas) expect(c.height).toBeGreaterThanOrEqual(48);
        expect(intersects(primary, secondary)).toBe(false);
        // Primary first: above, or on the same row to the left.
        expect(primary.top < secondary.top - 0.5 || primary.right <= secondary.left + 0.5).toBe(true);
        if (vp.width < 768) {
          expect(Math.abs(secondary.top - primary.bottom - 12)).toBeLessThanOrEqual(1);
        }
      });
    }

    test("inline gutters are max(20px, safe-area) with no horizontal overflow (Req 10.4, 1.4)", async ({ page }) => {
      const pad = await page.locator(HERO).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { start: parseFloat(cs.paddingInlineStart), end: parseFloat(cs.paddingInlineEnd) };
      });
      expect(pad).toEqual({ start: 20, end: 20 });
      const grid = await rectOf(page, GRID);
      expect(grid.left).toBeCloseTo(20, 1);
      expect(grid.right).toBeCloseTo(vp.width - 20, 1);
      for (const sel of [TEXT, STAGE, H1, COPY]) {
        const r = await rectOf(page, sel);
        expect(r.left, sel).toBeGreaterThanOrEqual(20 - 0.5);
        expect(r.right, sel).toBeLessThanOrEqual(vp.width - 20 + 0.5);
      }
      const overflow = await page.evaluate(() => {
        window.scrollTo({ left: 200, top: 0, behavior: "instant" });
        const d = document.documentElement;
        return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, scrollX: window.scrollX };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(overflow.scrollX).toBe(0);
      const h1 = await page.locator(H1).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      expect(h1.sw).toBeLessThanOrEqual(h1.cw);
    });

    test("Hero min-height is the small viewport and grows with content (Req 10.6)", async ({ page }) => {
      const m = await page.locator(HERO).evaluate((hero, gridSel) => {
        const cs = getComputedStyle(hero);
        const grid = document.querySelector<HTMLElement>(gridSel)!;
        return {
          height: hero.getBoundingClientRect().height,
          inlineHeight: hero.style.height,
          computedHeight: cs.height,
          minHeight: parseFloat(cs.minBlockSize),
          content: parseFloat(cs.paddingBlockStart) + grid.getBoundingClientRect().height + parseFloat(cs.paddingBlockEnd),
          innerHeight: window.innerHeight,
          // No clipped content: every content box ends inside the Hero box.
          heroBottom: hero.getBoundingClientRect().bottom,
          contentBottoms: [...hero.querySelectorAll<HTMLElement>("h1, p, .cta-group > a, .emblem-stage")].map(
            (el) => el.getBoundingClientRect().bottom,
          ),
        };
      }, GRID);
      expect(m.inlineHeight).toBe("");
      expect(m.minHeight).toBeCloseTo(m.innerHeight, 0);
      expect(m.height).toBeGreaterThanOrEqual(m.innerHeight - 0.5);
      expect(Math.abs(m.height - Math.max(m.innerHeight, m.content))).toBeLessThanOrEqual(1);
      for (const bottom of m.contentBottoms) expect(bottom).toBeLessThanOrEqual(m.heroBottom + 0.5);
      // At 320×568 the content is taller than the small viewport: the Hero grows.
      if (vp === MOBILE_320x568) expect(m.height).toBeGreaterThan(m.innerHeight + 1);
    });

    const fold = vp.width >= 360 && vp.height >= 548 ? "1.3" : "1.4";
    test(`initial viewport shows the ${fold === "1.3" ? "headline, copy and Primary_CTA" : "headline"} below the header (Req ${fold})`, async ({
      page,
    }) => {
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const header = await rectOf(page, HEADER);
      const svh = await page.evaluate(() => window.innerHeight);
      const checks: Array<[string, string]> =
        fold === "1.3"
          ? [
              ["Headline", H1],
              ["Supporting_Copy", COPY],
              ["Primary_CTA", `${CTAS} >> nth=0`],
            ]
          : [["Headline", H1]];
      for (const [name, sel] of checks) {
        const r = await page.locator(sel).first().boundingBox();
        expect(r, name).not.toBeNull();
        const box = r!;
        expect(box.y, `${name} top`).toBeGreaterThanOrEqual(header.bottom - 0.5);
        expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(svh + 0.5);
        expect(box.x, `${name} left`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${name} right`).toBeLessThanOrEqual(vp.width + 0.5);
      }

      if (fold === "1.4") {
        // Copy and both CTAs are reachable by vertical scrolling alone.
        for (const sel of [COPY, `${CTAS} >> nth=0`, `${CTAS} >> nth=1`]) {
          await page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
          const box = (await page.locator(sel).first().boundingBox())!;
          const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.innerHeight }));
          expect(scroll.x, sel).toBe(0);
          expect(box.y, sel).toBeGreaterThanOrEqual(header.bottom - 0.5);
          expect(box.y + box.height, sel).toBeLessThanOrEqual(scroll.y + 0.5);
        }
      }
    });

    test("interactive targets are ≥ 44×44 and ≥ 8 px apart (Req 10.9)", async ({ page }) => {
      const list = await targets(page);
      expect(list.length).toBeGreaterThanOrEqual(3); // Brand_Mark and both Hero CTAs.
      for (const t of list) {
        expect(t.rect.width, t.label).toBeGreaterThanOrEqual(44);
        expect(t.rect.height, t.label).toBeGreaterThanOrEqual(44);
      }
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const gap = spacing(list[i].rect, list[j].rect);
          expect(gap, `${list[i].label} ↔ ${list[j].label}`).toBeGreaterThanOrEqual(8 - 0.5);
        }
      }
    });
  });
}

// Req 10.3: the compact rhythm is 75% (±1 px) of the tall rhythm at the same width.
test.describe("compact rhythm at 390 wide", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("390×660 gaps are 75% of 390×844 (Req 10.3)", async ({ page }) => {
    const measure = async () => {
      const header = await rectOf(page, HEADER);
      const stage = await rectOf(page, STAGE);
      const h1 = await rectOf(page, H1);
      const copy = await rectOf(page, COPY);
      const [primary] = await rectsOf(page, CTAS);
      const padBottom = await page.locator(HERO).evaluate((el) => parseFloat(getComputedStyle(el).paddingBlockEnd));
      return [stage.top - header.bottom, h1.top - stage.bottom, copy.top - h1.bottom, primary.top - copy.bottom, padBottom];
    };
    await gotoSettled(page);
    const tall = await measure();
    await page.setViewportSize({ width: 390, height: 660 });
    await gotoSettled(page);
    const compact = await measure();
    tall.forEach((t, i) => expect(Math.abs(compact[i] - 0.75 * t), `gap ${i}: ${compact[i]} vs ${t}`).toBeLessThanOrEqual(1));
  });
});

// ---------------------------------------------------------------------------
// No hover-only content; touch press feedback (Req 10.8, 10.10)
// ---------------------------------------------------------------------------

test.describe("hover and touch", () => {
  test("stylesheet: hover rules reveal nothing and each has a touch :active twin (Req 10.8, 10.10)", async ({ page }) => {
    await page.goto("/");
    const audit = await page.evaluate(() => {
      type Found = { selector: string; media: string; props: string[] };
      const found: Found[] = [];
      const walk = (rules: CSSRuleList, media: string[]) => {
        for (const rule of [...rules]) {
          let nextMedia = media;
          if (rule instanceof CSSMediaRule) nextMedia = [...media, rule.conditionText];
          if (rule instanceof CSSStyleRule && /:hover|:active/.test(rule.selectorText)) {
            found.push({ selector: rule.selectorText, media: nextMedia.join(" and "), props: [...rule.style] });
          }
          if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules, nextMedia);
        }
      };
      for (const sheet of [...document.styleSheets]) {
        try {
          walk(sheet.cssRules, []);
        } catch {
          // Cross-origin sheets are not expected; ignore.
        }
      }
      return found;
    });

    const hover = audit.filter((r) => r.selector.includes(":hover"));
    const active = audit.filter((r) => r.selector.includes(":active") && /hover:\s*none/.test(r.media));
    expect(hover.length).toBeGreaterThan(0);

    const REVEALING = ["display", "visibility", "content", "clip-path", "max-height", "max-block-size", "height", "block-size", "width", "inline-size"];
    for (const rule of hover) {
      // Hover never reveals content: no display, visibility or size change,
      // and opacity changes only on decorative ::before / ::after layers.
      const revealing = rule.props.filter((p) => REVEALING.includes(p));
      expect(revealing, rule.selector).toEqual([]);
      if (rule.props.includes("opacity")) expect(rule.selector, rule.selector).toMatch(/::?(before|after)\b/);
      // Hover styling applies only where the primary input can hover.
      expect(rule.media, rule.selector).toMatch(/hover:\s*hover/);
      // Touch mirror: the same selector with :active under (hover: none).
      const twin = rule.selector.replaceAll(":hover", ":active");
      expect(
        active.some((a) => a.selector === twin),
        `${rule.selector} has no (hover: none) ${twin}`,
      ).toBe(true);
    }
  });

  test.describe("hover-capable pointer at 390×844", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("hovering any control reveals no element (Req 10.10)", async ({ page }) => {
      await gotoSettled(page);
      const snapshot = () =>
        page.evaluate(
          ({ header, hero }) =>
            [...document.querySelectorAll(`${header} *, ${hero} *`)].map((el) => {
              const cs = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              return cs.display !== "none" && cs.visibility === "visible" && Number(cs.opacity) > 0 && r.width > 0 && r.height > 0;
            }),
          { header: HEADER, hero: HERO },
        );
      const before = await snapshot();
      // The unfocused skip link is a 1 px clipped box and cannot be hovered.
      const controls = page.locator(
        `${HEADER} :is(a, button, summary):not(.skip-link):visible, ${HERO} :is(a, button, summary):visible`,
      );
      const count = await controls.count();
      expect(count).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < count; i++) {
        await controls.nth(i).hover();
        expect(await snapshot(), `hovering control ${i}`).toEqual(before);
      }
    });
  });

  test.describe("touch device at 390×844", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    test("press shows the hover overlay on :active; hover alone does nothing (Req 10.8)", async ({ page }) => {
      await gotoSettled(page);
      let hoverNone = await page.evaluate(() => matchMedia("(hover: none)").matches);
      if (!hoverNone) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "hover", value: "none" }, { name: "pointer", value: "coarse" }] });
        hoverNone = await page.evaluate(() => matchMedia("(hover: none)").matches);
      }
      expect(hoverNone).toBe(true);

      // No pinch-zoom-out needed: the layout width is the device width.
      const scale = await page.evaluate(() => ({ w: window.innerWidth, s: window.visualViewport?.scale ?? 1 }));
      expect(scale).toEqual({ w: 390, s: 1 });

      const overlay = (i: number) =>
        page.locator(CTAS).nth(i).evaluate((el) => Number(getComputedStyle(el, "::before").opacity));

      for (const i of [0, 1]) {
        const box = (await page.locator(CTAS).nth(i).boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        expect(await overlay(i), `CTA ${i} overlay on hover`).toBe(0);
        await page.mouse.down();
        await expect.poll(() => overlay(i), { message: `CTA ${i} overlay while pressed` }).toBe(1);
        // Release off the button so the pending placeholder link is not followed.
        await page.mouse.move(box.x + box.width / 2, box.y - 200);
        await page.mouse.up();
        await page.mouse.move(1, 1);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Safe areas (Req 10.4, 10.11, 16.5)
// ---------------------------------------------------------------------------

test.describe("safe areas", () => {
  test("every mobile edge adds env(safe-area-inset-*) in the stylesheet (Req 10.4, 16.5)", async ({ page }) => {
    await page.goto("/");
    const decls = await page.evaluate(() => {
      const out: Array<{ selector: string; prop: string; value: string }> = [];
      const walk = (rules: CSSRuleList) => {
        for (const rule of [...rules]) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of [...rule.style]) {
              out.push({ selector: rule.selectorText, prop, value: rule.style.getPropertyValue(prop) });
            }
          }
          if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of [...document.styleSheets]) walk(sheet.cssRules);
      return out;
    });
    const has = (selector: string, prop: string, inset: string) =>
      decls.some(
        (d) =>
          d.selector.split(",").map((s) => s.trim()).includes(selector) &&
          d.prop === prop &&
          d.value.replace(/\s+/g, "").includes(`env(safe-area-inset-${inset})`),
      );
    expect(has(".hero", "padding-inline-start", "left"), ".hero start gutter").toBe(true);
    expect(has(".hero", "padding-inline-end", "right"), ".hero end gutter").toBe(true);
    expect(has(".hero", "padding-block-end", "bottom"), ".hero bottom padding").toBe(true);
    expect(has(".hero", "padding-block-start", "top"), ".hero top padding").toBe(true);
    expect(has(".site-header", "block-size", "top"), "header height").toBe(true);
    expect(has(".site-header", "padding-block-start", "top"), "header top padding").toBe(true);
    expect(has(".site-header", "padding-inline-start", "left"), "header start gutter").toBe(true);
    expect(has(".site-header", "padding-inline-end", "right"), "header end gutter").toBe(true);
    // Req 10.6: no dvh-based Hero height.
    const heroHeights = decls.filter((d) => d.selector === ".hero" && /(^|-)(height|block-size)$/.test(d.prop));
    for (const d of heroHeights) expect(d.value, `${d.prop}`).not.toMatch(/dvh/);
    expect(heroHeights.some((d) => d.prop === "min-block-size" && /100svh/.test(d.value))).toBe(true);
  });

  for (const { vp, insets, expected } of [
    {
      vp: MOBILE_390x844,
      insets: { top: 47, right: 0, bottom: 34, left: 0 },
      expected: { header: 64 + 47, gutter: [20, 20], padBottom: 24 + 34, padTop: 64 + 47 + 24 },
    },
    {
      vp: LANDSCAPE_844x390,
      insets: { top: 0, right: 47, bottom: 21, left: 47 },
      expected: { header: 56, gutter: [47, 47], padBottom: 24 + 21, padTop: 56 + 24 },
    },
  ]) {
    test.describe(`emulated insets at ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("header, gutters and bottom padding add the insets (Req 10.4, 10.11)", async ({ page }) => {
        const cdp = await page.context().newCDPSession(page);
        try {
          await cdp.send("Emulation.setSafeAreaInsetsOverride" as never, { insets } as never);
        } catch (err) {
          test.skip(true, `Emulation.setSafeAreaInsetsOverride unavailable in this Chromium (${String(err).slice(0, 80)}); covered by the stylesheet audit and the manual device check (24.1).`);
        }
        await gotoSettled(page);
        const m = await page.evaluate(
          ({ hero, header }) => {
            const h = document.querySelector<HTMLElement>(hero)!;
            const cs = getComputedStyle(h);
            return {
              header: document.querySelector(header)!.getBoundingClientRect().height,
              gutter: [parseFloat(cs.paddingInlineStart), parseFloat(cs.paddingInlineEnd)],
              padBottom: parseFloat(cs.paddingBlockEnd),
              padTop: parseFloat(cs.paddingBlockStart),
              probe: (() => {
                const el = document.createElement("div");
                el.style.paddingTop = "env(safe-area-inset-top, -1px)";
                el.style.paddingLeft = "env(safe-area-inset-left, -1px)";
                document.body.append(el);
                const p = getComputedStyle(el);
                const v = { top: p.paddingTop, left: p.paddingLeft };
                el.remove();
                return v;
              })(),
            };
          },
          { hero: HERO, header: HEADER },
        );
        test.skip(
          m.probe.top === "0px" && m.probe.left === "0px",
          "The inset override did not reach env(); covered by the stylesheet audit and the manual device check (24.1).",
        );
        expect(m.header).toBeCloseTo(expected.header, 0);
        expect(m.gutter).toEqual(expected.gutter);
        expect(m.padBottom).toBeCloseTo(expected.padBottom, 0);
        expect(m.padTop).toBeCloseTo(expected.padTop, 0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Document head (Req 16.5, 16.6)
// ---------------------------------------------------------------------------

test.describe("document head", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("title, description, viewport and theme-color (Req 16.5, 16.6, 12.6)", async ({ page, request }) => {
    // Server-rendered HTML carries the tags (no JS needed).
    const html = await (await request.get("/")).text();
    expect(html).toContain("<title>Peyman Consulting</title>");

    await page.goto("/");
    await expect(page).toHaveTitle("Peyman Consulting");
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", SUPPORTING_COPY);

    const viewports = await page.locator('meta[name="viewport"]').evaluateAll((els) => els.map((el) => el.getAttribute("content") ?? ""));
    expect(viewports).toHaveLength(1);
    const pairs = Object.fromEntries(
      viewports[0].split(",").map((p) => p.trim().split("=").map((s) => s.trim().toLowerCase()) as [string, string]),
    );
    expect(pairs["viewport-fit"]).toBe("cover");
    expect(pairs["width"]).toBe("device-width");
    expect(pairs["initial-scale"]).toBe("1");
    expect(pairs).not.toHaveProperty("maximum-scale");
    expect(pairs["user-scalable"] ?? "yes").not.toMatch(/^(no|0)$/);

    const themes = await page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((el) => el.getAttribute("content") ?? ""));
    expect(themes.map((t) => t.toLowerCase())).toEqual(["#05070c"]);

    // The approved strings render verbatim (sanity for the description source).
    await expect(page.locator(H1)).toHaveText(HEADLINE);
    await expect(page.locator(COPY)).toHaveText(SUPPORTING_COPY);
  });
});
