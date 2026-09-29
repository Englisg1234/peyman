import { expect, test, type Page } from "@playwright/test";
import {
  DESKTOP_1440x900,
  DESKTOP_1920x1080,
  LANDSCAPE_667x375,
  LANDSCAPE_844x390,
  MOBILE_320x568,
  MOBILE_390x844,
  TABLET_1024x768,
  TABLET_768x1024,
  type TestViewport,
} from "./support/viewports";

// Site_Header e2e (task 7.4). Untagged: runs against the default build only,
// where every Nav_Item is planned and `showPlanned` is false (DEC-01).
// Playwright emulates no safe-area insets, so env(safe-area-inset-*) is 0.

const HEADER_BANDS: ReadonlyArray<{ vp: TestViewport; height: number }> = [
  { vp: MOBILE_320x568, height: 64 },
  { vp: MOBILE_390x844, height: 64 },
  { vp: TABLET_768x1024, height: 64 },
  { vp: LANDSCAPE_667x375, height: 56 },
  { vp: LANDSCAPE_844x390, height: 56 },
  { vp: TABLET_1024x768, height: 72 },
  { vp: DESKTOP_1440x900, height: 72 },
  { vp: DESKTOP_1920x1080, height: 72 },
];

const BRAND_NAME = "Peyman Consulting, home";
const CTA_LABEL = "Start a Conversation";
const SKIP_LABEL = "Skip to content";

const header = (page: Page) => page.locator("header#site-header");

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
}

for (const { vp, height } of HEADER_BANDS) {
  test.describe(`Site_Header at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test(`is fixed at ${height}px tall with no horizontal overflow (Req 7.2, 12.11)`, async ({ page }) => {
      const metrics = await header(page).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const inner = el.querySelector<HTMLElement>(".site-header__inner");
        return {
          position: getComputedStyle(el).position,
          top: r.top,
          height: r.height,
          left: r.left,
          right: r.right,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          innerScrollWidth: inner?.scrollWidth ?? 0,
          innerClientWidth: inner?.clientWidth ?? 0,
          docScrollWidth: document.documentElement.scrollWidth,
          docClientWidth: document.documentElement.clientWidth,
        };
      });

      expect(metrics.position).toBe("fixed");
      expect(metrics.top).toBe(0);
      expect(metrics.height).toBeCloseTo(height, 1);
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(vp.width);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.innerScrollWidth).toBeLessThanOrEqual(metrics.innerClientWidth);
      expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth);
    });

    const inline = vp.width >= 1280;
    test(`renders the live nav ${inline ? "inline" : "behind the menu trigger"}`, async ({ page }) => {
      await expect(header(page)).toHaveAttribute("data-nav", "items");
      const primary = header(page).getByRole("navigation", { name: "Primary" });
      const trigger = header(page).getByRole("button", { name: "Menu" });
      if (inline) {
        await expect(primary).toBeVisible();
        await expect(primary.getByRole("link")).toHaveText(["Advisory", "Industries", "Intelligence", "Insights", "About", "Contact"]);
        await expect(trigger).toBeHidden();
      } else {
        await expect(primary).toHaveCount(0);
        await expect(trigger).toBeVisible();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
      }
    });

    test("Brand_Mark has one accessible name and aria-current on / (Req 7.11)", async ({ page }) => {
      const brand = header(page).getByRole("link", { name: BRAND_NAME, exact: true });
      await expect(brand).toHaveCount(1);
      await expect(brand).toBeVisible();
      await expect(brand).toHaveAttribute("href", "/");
      await expect(brand).toHaveAttribute("aria-current", "page");
      // Decorative images only: nothing adds a second name.
      const alts = await brand.locator("img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("alt")));
      expect(alts.length).toBeGreaterThan(0);
      for (const alt of alts) expect(alt).toBe("");
    });

    const ctaShown = vp.width >= 768;
    test(`header CTA is ${ctaShown ? "visible" : "hidden"} (Req 7.6, 7.7)`, async ({ page }) => {
      const cta = header(page).locator(".site-header__cta");
      await expect(cta).toHaveCount(1);
      if (ctaShown) {
        await expect(cta).toBeVisible();
        await expect(cta).toHaveText(CTA_LABEL);
        await expect(header(page).getByRole("link", { name: CTA_LABEL, exact: true })).toHaveCount(1);
        const href = await cta.getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
      } else {
        await expect(cta).toBeHidden();
        await expect(cta).toHaveCSS("display", "none");
        // Removed from the accessibility tree, so the header exposes no CTA link.
        await expect(header(page).getByRole("link", { name: CTA_LABEL })).toHaveCount(0);
      }
    });
  });
}

test.describe("Site_Header scroll state (Req 7.3, 7.4)", () => {
  test.use({ viewport: { width: MOBILE_390x844.width, height: MOBILE_390x844.height } });

  test("switches at 25px and back at 24px; height stays constant", async ({ page }) => {
    await page.goto("/");
    const h = header(page);
    await expect(h).not.toHaveAttribute("data-scrolled", /.*/);
    const restHeight = await h.evaluate((el) => el.getBoundingClientRect().height);

    // The page can be a single screen tall: add a spacer so 24/25 px scrolls exist.
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.setAttribute("data-test-spacer", "");
      spacer.style.blockSize = "2000px";
      document.body.appendChild(spacer);
    });

    // 25 px first: the attribute only appears once HeaderScrollState has
    // hydrated and its observer is live, so later checks are meaningful.
    await scrollToY(page, 25);
    await expect(h).toHaveAttribute("data-scrolled", "true");

    await scrollToY(page, 24);
    await expect(h).not.toHaveAttribute("data-scrolled", /.*/);

    await scrollToY(page, 25);
    await expect(h).toHaveAttribute("data-scrolled", "true");

    const surface = h.locator(".site-header__surface");
    await expect(surface).toHaveAttribute("aria-hidden", "true");
    // The fade finishes within 240 ms (--dur-ui).
    const durations = await surface.evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(",")
        .map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 1 : 1000)),
    );
    expect(Math.max(...durations)).toBeLessThanOrEqual(240);
    await expect(surface).toHaveCSS("opacity", "1", { timeout: 1000 });
    expect(await h.evaluate((el) => el.getBoundingClientRect().height)).toBe(restHeight);

    await scrollToY(page, 0);
    await expect(h).not.toHaveAttribute("data-scrolled", /.*/);
    await expect(surface).toHaveCSS("opacity", "0", { timeout: 1000 });
    expect(await h.evaluate((el) => el.getBoundingClientRect().height)).toBe(restHeight);
  });
});

for (const vp of [MOBILE_320x568, DESKTOP_1440x900]) {
  test.describe(`Skip link at ${vp.name} (Req 7.14, 7.15)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("is hidden until focused, first in tab order, and moves focus to main", async ({ page }) => {
      await page.goto("/");
      const skip = page.locator("a.skip-link");
      await expect(skip).toHaveCount(1);
      await expect(skip).toHaveText(SKIP_LABEL);
      await expect(skip).toHaveAttribute("href", "#main");

      // Visually hidden but still in the accessibility tree.
      const hidden = await skip.boundingBox();
      expect(hidden).not.toBeNull();
      expect(hidden!.width).toBeLessThanOrEqual(1);
      expect(hidden!.height).toBeLessThanOrEqual(1);
      await expect(page.getByRole("link", { name: SKIP_LABEL })).toHaveCount(1);

      await page.keyboard.press("Tab");
      await expect(skip).toBeFocused();

      const shown = await skip.boundingBox();
      expect(shown).not.toBeNull();
      expect(shown!.width).toBeGreaterThan(1);
      expect(shown!.height).toBeGreaterThanOrEqual(44);
      expect(shown!.x).toBeGreaterThanOrEqual(0);
      expect(shown!.y).toBeGreaterThanOrEqual(0);
      expect(shown!.x + shown!.width).toBeLessThanOrEqual(vp.width);
      expect(shown!.y + shown!.height).toBeLessThanOrEqual(vp.height);
      await expect(skip).toHaveCSS("clip-path", "none");
      // Topmost at its center: the skip layer (z 100) sits above the header.
      const onTop = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit === el || el.contains(hit);
      });
      expect(onTop).toBe(true);

      await page.keyboard.press("Enter");
      await expect(page.locator("main#main")).toBeFocused();
      await expect(skip).not.toBeFocused();
      const hiddenAgain = await skip.boundingBox();
      expect(hiddenAgain!.width).toBeLessThanOrEqual(1);
    });
  });
}
