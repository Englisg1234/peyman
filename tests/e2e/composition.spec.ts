import { expect, test, type Page } from "@playwright/test";
import { PALETTE, type PaletteToken } from "../../lib/contrast";
import { gotoSettled } from "./support/settle";
import { TEST_VIEWPORTS } from "./support/viewports";

// Hero visual composition rules (task 11.3; Req 2.1, 2.2, 2.5, 2.6, 2.7, 4.2–4.9,
// 5.4, 12.8). Untagged: runs against the default build at every Test_Viewport.
//
// Every check runs on the settled page: fonts ready, the emblem decoded with
// the next/image placeholder cleared, and every finite CSS animation finished
// (the final state of the intro).

const HERO = "section[data-hero]";
const STAGE = `${HERO} .emblem-stage`;
const EMBLEM_IMG = `${STAGE} .raster-emblem__img`;
const FRAMING = `${HERO} .hero-framing`;
const LINE_SELECTOR = ".hero-framing__spine, .hero-framing__tick, .hero-framing__plinth";

const DERIVATIVE_TYPES = ["image/avif", "image/webp"];
const EMBLEM_SOURCE = /\/peyman-emblem[.\-]/;

// ---------------------------------------------------------------------------
// Color and gradient parsing (computed-value syntax as serialized by Chromium)
// ---------------------------------------------------------------------------

type Rgba = { r: number; g: number; b: number; a: number };

const hexToRgb = (hex: string): Omit<Rgba, "a"> => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const TOKENS = (Object.keys(PALETTE) as PaletteToken[]).map((token) => ({ token, ...hexToRgb(PALETTE[token]) }));
const GOLD_TOKENS: readonly PaletteToken[] = ["gold-500", "gold-300", "gold-100"];

/** Parses `rgb()`, `rgba()`, `color(srgb …)` and `transparent`. Returns null for anything else. */
function parseColor(value: string): Rgba | null {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^rgba?\(([^)]*)\)$/.exec(v);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
    return { r: Number(r), g: Number(g), b: Number(b), a: parseAlpha(a) };
  }
  m = /^color\(srgb\s+([^)]*)\)$/.exec(v);
  if (m) {
    const [rgb, a = "1"] = m[1].split("/");
    const [r, g, b] = rgb.trim().split(/\s+/).map((c) => (c === "none" ? 0 : Number(c) * 255));
    return { r, g, b, a: parseAlpha(a.trim()) };
  }
  return null;
}

const parseAlpha = (a: string): number => (a.endsWith("%") ? Number(a.slice(0, -1)) / 100 : Number(a));

/** The Palette token whose RGB equals the color (±1 per channel), at any alpha. */
function paletteToken(c: Rgba): PaletteToken | null {
  const hit = TOKENS.find((t) => Math.abs(t.r - c.r) <= 1 && Math.abs(t.g - c.g) <= 1 && Math.abs(t.b - c.b) <= 1);
  return hit?.token ?? null;
}

/** Every color function or keyword inside a computed value (gradients included). */
function colorsIn(value: string): string[] {
  return value.match(/(?:rgba?|color|oklab|oklch|lab|lch|hsla?|hwb)\([^)]*\)|\btransparent\b/gi) ?? [];
}

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

type Gradient = { source: string; stops: number };

/** Each gradient function in a computed `background-image` / `mask-image`, with its color-stop count. */
function gradientsIn(value: string): Gradient[] {
  const out: Gradient[] = [];
  const re = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < value.length && depth > 0; i++) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") depth--;
    }
    const args = value.slice(re.lastIndex, i - 1);
    const stops = splitTopLevel(args).filter((part) => colorsIn(part).length > 0 && /^[a-z]+\(|^transparent/i.test(part)).length;
    out.push({ source: value.slice(m.index, i), stops });
    re.lastIndex = i;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

type StyleRecord = {
  label: string;
  inStage: boolean;
  isHero: boolean;
  colors: Record<string, string>;
  backgroundImage: string;
  maskImage: string;
  borderImageSource: string;
  listStyleImage: string;
  content: string;
  backdropFilter: string;
  textShadow: string;
};

/** Computed styles of the Hero, its descendants and their generated ::before/::after. */
function collectStyles(page: Page): Promise<StyleRecord[]> {
  return page.evaluate((heroSel) => {
    const hero = document.querySelector(heroSel)!;
    const stage = hero.querySelector(".emblem-stage");
    const records: StyleRecord[] = [];
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.classList.length ? `.${[...el.classList].join(".")}` : ""}`;
    for (const el of [hero, ...hero.querySelectorAll("*")]) {
      if (el.tagName === "NOSCRIPT" || el.tagName === "STYLE") continue;
      for (const pseudo of [null, "::before", "::after"] as const) {
        const cs = getComputedStyle(el, pseudo);
        // A pseudo-element without generated content is not rendered.
        if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
        records.push({
          label: `${describe(el)}${pseudo ?? ""}`,
          inStage: !!stage && stage.contains(el),
          isHero: el === hero && !pseudo,
          colors: {
            color: cs.color,
            "background-color": cs.backgroundColor,
            "border-top-color": cs.borderTopColor,
            "border-right-color": cs.borderRightColor,
            "border-bottom-color": cs.borderBottomColor,
            "border-left-color": cs.borderLeftColor,
            "outline-color": cs.outlineColor,
          },
          backgroundImage: cs.backgroundImage,
          maskImage: cs.maskImage || cs.getPropertyValue("-webkit-mask-image"),
          borderImageSource: cs.borderImageSource,
          listStyleImage: cs.listStyleImage,
          content: cs.content,
          backdropFilter: cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter"),
          textShadow: cs.textShadow,
        });
      }
    }
    return records;
  }, HERO);
}

const rectOf = (page: Page, selector: string): Promise<Rect[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }),
  );

/** True when two rects share a positive area (touching edges do not count). */
const intersects = (a: Rect, b: Rect): boolean =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.01 &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.01;

const inside = (inner: Rect, outer: Rect, tol = 0.5): boolean =>
  inner.left >= outer.left - tol &&
  inner.top >= outer.top - tol &&
  inner.right <= outer.right + tol &&
  inner.bottom <= outer.bottom + tol;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const vp of TEST_VIEWPORTS) {
  test.describe(`Hero composition at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

    test("paints only emblem derivatives: no canvas, WebGL, SVG or other images (Req 2.6, 4.9)", async ({ page }) => {
      await page.addInitScript(() => {
        const calls: string[] = [];
        (window as unknown as { __contexts: string[] }).__contexts = calls;
        const wrap = (proto: { getContext: (...args: never[]) => unknown } | undefined) => {
          if (!proto) return;
          const original = proto.getContext;
          proto.getContext = function (this: unknown, ...args: never[]) {
            calls.push(String(args[0]));
            return original.apply(this, args);
          };
        };
        wrap(HTMLCanvasElement.prototype as never);
        if (typeof OffscreenCanvas !== "undefined") wrap(OffscreenCanvas.prototype as never);
      });

      const images = new Map<string, { status: number; type: string }>();
      page.on("response", (res) => {
        if (res.request().resourceType() !== "image") return;
        images.set(res.url(), { status: res.status(), type: (res.headers()["content-type"] ?? "").split(";")[0] });
      });

      await gotoSettled(page);

      // No vector, canvas or embedded media in the Hero.
      const foreign = await page.locator(HERO).evaluate((hero) =>
        [...hero.querySelectorAll("svg, canvas, video, iframe, object, embed, picture, math")].map((el) =>
          el.tagName.toLowerCase(),
        ),
      );
      expect(foreign).toEqual([]);
      const contexts = await page.evaluate(() => (window as unknown as { __contexts: string[] }).__contexts);
      expect(contexts.filter((c) => /webgl|webgpu|bitmaprenderer|2d/i.test(c))).toEqual([]);

      // Every <img> in the Hero is an optimizer derivative of the emblem master.
      const imgs = await page.locator(`${HERO} img`).evaluateAll((els) =>
        (els as HTMLImageElement[]).map((img) => ({
          cls: img.className,
          src: img.getAttribute("src") ?? "",
          srcset: img.getAttribute("srcset") ?? "",
          currentSrc: img.currentSrc,
          shown: getComputedStyle(img).display !== "none",
        })),
      );
      expect(imgs.length).toBeGreaterThan(0);
      expect(imgs.filter((i) => i.shown).map((i) => i.cls)).toEqual([expect.stringContaining("raster-emblem__img")]);
      for (const img of imgs) {
        const candidates = [img.src, ...img.srcset.split(",").map((c) => c.trim().split(/\s+/)[0])].filter(Boolean);
        expect(candidates.length).toBeGreaterThan(1);
        for (const candidate of candidates) {
          const url = new URL(candidate, page.url());
          expect(url.pathname, candidate).toBe("/_next/image");
          expect(url.searchParams.get("url") ?? "", candidate).toMatch(EMBLEM_SOURCE);
        }
        if (img.shown) {
          const res = images.get(img.currentSrc);
          expect(res, `response for ${img.currentSrc}`).toBeDefined();
          expect(res!.status).toBe(200);
          expect(DERIVATIVE_TYPES).toContain(res!.type);
        }
      }

      // Every image the page fetched is an AVIF/WebP emblem derivative.
      for (const [url, res] of images) {
        if (res.status >= 400) continue;
        const u = new URL(url);
        expect(u.pathname, url).toBe("/_next/image");
        expect(u.searchParams.get("url") ?? "", url).toMatch(EMBLEM_SOURCE);
        expect(DERIVATIVE_TYPES, url).toContain(res.type);
      }

      // No CSS-referenced images (url()) anywhere in the Hero.
      const styles = await collectStyles(page);
      const urlRefs = styles.flatMap((s) =>
        [s.backgroundImage, s.maskImage, s.borderImageSource, s.listStyleImage, s.content]
          .filter((v) => /url\(/i.test(v))
          .map((v) => `${s.label}: ${v.slice(0, 120)}`),
      );
      expect(urlRefs).toEqual([]);
    });

    test("no backdrop-filter or text-shadow; gradients within budget (Req 2.2, 4.7)", async ({ page }) => {
      await gotoSettled(page);
      const styles = await collectStyles(page);

      const effects = styles.flatMap((s) => [
        ...(s.backdropFilter && s.backdropFilter !== "none" ? [`${s.label} backdrop-filter: ${s.backdropFilter}`] : []),
        ...(s.textShadow && s.textShadow !== "none" ? [`${s.label} text-shadow: ${s.textShadow}`] : []),
      ]);
      expect(effects).toEqual([]);

      const gradientsOf = (s: StyleRecord) => [...gradientsIn(s.backgroundImage), ...gradientsIn(s.maskImage)];

      // Stage background: exactly one 2-stop gradient on the Hero section.
      const hero = styles.find((s) => s.isHero)!;
      const heroGradients = gradientsIn(hero.backgroundImage);
      expect(heroGradients.map((g) => g.stops)).toEqual([2]);
      expect(gradientsIn(hero.maskImage)).toEqual([]);

      // Outside the Emblem_Stage no other Hero element paints a gradient.
      const stray = styles
        .filter((s) => !s.inStage)
        .flatMap((s) => (s.isHero ? gradientsIn(s.maskImage) : gradientsOf(s)).map((g) => `${s.label}: ${g.source}`));
      expect(stray).toEqual([]);

      // Emblem_Stage: ≤ 3 gradient images in total, each ≤ 2 stops.
      const stage = styles.filter((s) => s.inStage).flatMap((s) => gradientsOf(s).map((g) => ({ ...g, label: s.label })));
      expect(stage.length, stage.map((g) => g.label).join(", ")).toBeLessThanOrEqual(3);
      for (const g of stage) {
        expect(g.stops, `${g.label}: ${g.source}`).toBeGreaterThanOrEqual(1);
        expect(g.stops, `${g.label}: ${g.source}`).toBeLessThanOrEqual(2);
      }
    });

    test("every painted color is a Palette token (Req 4.1, 4.8, 4.9)", async ({ page }) => {
      await gotoSettled(page);
      const styles = await collectStyles(page);
      const offenders: string[] = [];
      for (const s of styles) {
        const values: Array<[string, string]> = [
          ...Object.entries(s.colors),
          ...colorsIn(s.backgroundImage).map((c): [string, string] => ["background-image stop", c]),
          ...colorsIn(s.maskImage).map((c): [string, string] => ["mask-image stop", c]),
        ];
        for (const [prop, value] of values) {
          const c = parseColor(value);
          if (!c) {
            offenders.push(`${s.label} ${prop}: unparsed ${value}`);
            continue;
          }
          if (c.a === 0) continue;
          if (!paletteToken(c)) offenders.push(`${s.label} ${prop}: ${value}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    test("hairlines are 1px, decorative, text-free and clear of text; one gold hairline (Req 2.5, 2.7, 4.3)", async ({
      page,
    }) => {
      await gotoSettled(page);
      await expect(page.locator(FRAMING)).toHaveCount(1);
      await expect(page.locator(FRAMING)).toHaveAttribute("aria-hidden", "true");

      const lines = await page.locator(`${FRAMING}`).locator(LINE_SELECTOR).evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            kind: el.classList.contains("hero-framing__spine")
              ? "spine"
              : el.classList.contains("hero-framing__tick")
                ? "tick"
                : "plinth",
            rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
            hidden: el.closest('[aria-hidden="true"]') !== null,
            text: el.textContent ?? "",
            children: el.childElementCount,
            before: getComputedStyle(el, "::before").content,
            after: getComputedStyle(el, "::after").content,
            background: cs.backgroundColor,
            focusable: el.matches("a, button, input, select, textarea, [tabindex]"),
          };
        }),
      );

      expect(lines.map((l) => l.kind).sort()).toEqual(["plinth", "spine", "tick", "tick", "tick"]);
      for (const l of lines) {
        const label = `${l.kind} ${JSON.stringify(l.rect)}`;
        expect(l.hidden, label).toBe(true);
        expect(l.text, label).toBe("");
        expect(l.children, label).toBe(0);
        expect(l.before, label).toBe("none");
        expect(l.after, label).toBe("none");
        expect(l.focusable, label).toBe(false);
        const [thin, long] = l.kind === "spine" ? [l.rect.width, l.rect.height] : [l.rect.height, l.rect.width];
        expect(thin, label).toBeCloseTo(1, 2);
        expect(long, label).toBeGreaterThan(1);
      }

      // No hairline box intersects the headline, supporting copy or a CTA.
      const textBoxes = [
        ...(await rectOf(page, `${HERO} h1`)).map((r) => ({ name: "headline", r })),
        ...(await rectOf(page, `${HERO} .hero-supporting`)).map((r) => ({ name: "supporting copy", r })),
        ...(await rectOf(page, `${HERO} .cta-group a`)).map((r, i) => ({ name: `CTA ${i + 1}`, r })),
      ];
      expect(textBoxes.length).toBe(4);
      const hits = lines.flatMap((l) =>
        textBoxes.filter((t) => intersects(l.rect, t.r)).map((t) => `${l.kind} ${JSON.stringify(l.rect)} × ${t.name}`),
      );
      expect(hits).toEqual([]);

      // Exactly one gold hairline in the Hero: the plinth.
      const goldLines = await page.locator(HERO).evaluate((hero, golds) => {
        const out: string[] = [];
        const tokenRgb = golds.map((hex) => {
          const n = parseInt(hex.slice(1), 16);
          return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        });
        const isGold = (value: string) => {
          const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
          if (nums.length < 3) return false;
          const srgb = value.startsWith("color(");
          const [r, g, b] = srgb ? nums.slice(0, 3).map((n) => n * 255) : nums.slice(0, 3);
          const a = nums.length > 3 ? nums[3] : 1;
          return a > 0 && tokenRgb.some(([tr, tg, tb]) => Math.abs(tr - r) <= 1 && Math.abs(tg - g) <= 1 && Math.abs(tb - b) <= 1);
        };
        for (const el of hero.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility !== "visible") continue;
          const r = el.getBoundingClientRect();
          const thin = Math.min(r.width, r.height);
          const long = Math.max(r.width, r.height);
          if (thin > 0 && thin <= 1.01 && long > 1 && isGold(cs.backgroundColor)) out.push(el.className);
        }
        return out;
      }, GOLD_TOKENS.map((t) => PALETTE[t]));
      expect(goldLines).toEqual(["hero-framing__plinth"]);
    });

    test("layers stay inside the Hero; no horizontal overflow; emblem clear of text (Req 2.6, 2.7, 5.4)", async ({
      page,
    }) => {
      await gotoSettled(page);

      const clip = await page.locator(HERO).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { x: cs.overflowX, y: cs.overflowY, isolation: cs.isolation };
      });
      expect(clip).toEqual({ x: "clip", y: "clip", isolation: "isolate" });

      const [heroRect] = await rectOf(page, HERO);
      const [stageRect] = await rectOf(page, STAGE);
      const [lightRect] = await rectOf(page, `${STAGE} .light-stage`);
      const [emblemRect] = await rectOf(page, EMBLEM_IMG);
      const [textRect] = await rectOf(page, `${HERO} .hero-text`);
      const lineRects = await rectOf(page, `${FRAMING} :is(${LINE_SELECTOR})`);

      // The Hero is full-bleed at every width.
      expect(heroRect.left).toBeCloseTo(0, 1);
      expect(heroRect.width).toBeCloseTo(vp.width, 0);

      // Emblem_Stage and every painted layer inside the Hero; the Light_Layer clipped to the stage.
      expect(inside(stageRect, heroRect), JSON.stringify({ stageRect, heroRect })).toBe(true);
      expect(inside(emblemRect, stageRect), JSON.stringify({ emblemRect, stageRect })).toBe(true);
      await expect(page.locator(`${STAGE} .light-stage`)).toHaveCSS("overflow", "clip");
      expect(inside(lightRect, stageRect), JSON.stringify({ lightRect, stageRect })).toBe(true);
      for (const r of lineRects) expect(inside(r, heroRect), JSON.stringify({ line: r, heroRect })).toBe(true);
      await expect(page.locator(`${STAGE} .light-stage`)).toHaveCSS("pointer-events", "none");

      // Emblem box and text block never intersect.
      expect(intersects(stageRect, textRect), JSON.stringify({ stageRect, textRect })).toBe(false);

      // Zero horizontal overflow.
      const overflow = await page.evaluate(() => {
        window.scrollTo({ left: 200, top: 0, behavior: "instant" });
        const d = document.documentElement;
        return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, scrollX: window.scrollX };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(overflow.scrollX).toBe(0);
    });

    test("forced colors: decoration hidden, emblem kept, CTAs bordered (Req 12.8)", async ({ page }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await gotoSettled(page);

      await expect(page.locator(FRAMING)).toHaveCSS("display", "none");
      await expect(page.locator(`${STAGE} .light-stage`)).toHaveCSS("display", "none");
      await expect(page.locator(FRAMING).locator(LINE_SELECTOR).first()).toBeHidden();

      const emblem = page.locator(EMBLEM_IMG);
      await expect(emblem).toBeVisible();
      const box = await emblem.boundingBox();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);

      const ctas = page.locator(`${HERO} .cta-group a`);
      await expect(ctas).toHaveCount(2);
      const borders = await ctas.evaluateAll((els) =>
        els.map((el) => {
          const cs = getComputedStyle(el);
          return {
            label: el.textContent,
            widths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat),
            styles: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle],
          };
        }),
      );
      for (const b of borders) {
        for (const w of b.widths) expect(w, `${b.label} border width`).toBeGreaterThanOrEqual(1);
        for (const s of b.styles) expect(s, `${b.label} border style`).not.toBe("none");
      }
    });
  });
}
