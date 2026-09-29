import { expect, test, type Locator, type Page } from "@playwright/test";
import { NAV_LIVE_TAG } from "./support/builds";
import {
  MOBILE_320x568,
  MOBILE_390x844,
  TABLET_1024x768,
  TABLET_768x1024,
  type TestViewport,
} from "./support/viewports";

// Mobile_Menu and no-JS disclosure e2e (task 8.6; Req 8.1–8.14, 12.12,
// 17.4–17.6, 20.2).
//
// The `@nav-live` describes run on the live-nav fixture build (DEC-05,
// `npm run build:fixture`): Advisory "/", Industries "#main", About "#top"
// (all live) and Contact (planned, shown). The untagged describe at the end
// runs on the default build, where no Nav_Item renders (DEC-01).
//
// Live-item focus return is checked on About ("#top"): the fragment has no
// target element, so the default navigation scrolls to the top and leaves
// focus where the menu put it. "#main" targets the focusable main#main, so
// the browser moves focus there after the menu returns it (skip-link style).

const MENU_VIEWPORTS: readonly TestViewport[] = [MOBILE_320x568, MOBILE_390x844, TABLET_768x1024, TABLET_1024x768];

const OPEN_LABEL = "Menu";
const CLOSE_LABEL = "Close menu";
const DIALOG_LABEL = "Site navigation";
const MENU_NAV_LABEL = "Menu navigation";
const BRAND_NAME = "Peyman Consulting, home";
const CTA_LABEL = "Start a Conversation";
const LOCATION = "Bengaluru, Karnataka";
const ITEM_NAMES = ["Advisory", "Industries", "About", "Contact (coming soon)"] as const;

const slot = (page: Page) => page.locator("header#site-header .site-header__menu");
const trigger = (page: Page) => slot(page).locator("button.menu-trigger");
const panel = (page: Page) => page.locator(".mobile-menu__panel");
const backdrop = (page: Page) => page.locator(".mobile-menu__backdrop");
const closeButton = (page: Page) => panel(page).locator("button.mobile-menu__close");
const menuNav = (page: Page) => panel(page).locator("nav.mobile-menu__nav");
const menuLink = (page: Page, name: string) => menuNav(page).getByRole("link", { name, exact: true });
const menuCta = (page: Page) => panel(page).locator(".mobile-menu__cta");

async function gotoHydrated(page: Page) {
  await page.goto("/");
  await expect(slot(page)).toHaveAttribute("data-menu-ready", "true");
}

async function openMenu(page: Page) {
  await trigger(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(closeButton(page)).toBeFocused();
}

async function waitSettledOpen(page: Page) {
  await expect(panel(page)).toHaveAttribute("data-phase", "open");
}

/** Closed state per Req 8.13: dialog unmounted, inert released, aria-expanded false. */
async function expectClosed(page: Page) {
  await expect(panel(page)).toHaveCount(0, { timeout: 1000 });
  await expect(backdrop(page)).toHaveCount(0);
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  expect(await page.locator("body > [inert]").count()).toBe(0);
}

async function expectFocusReturned(page: Page) {
  await expect(trigger(page)).toBeFocused();
  await expectClosed(page);
  await expect(trigger(page)).toHaveAccessibleName(OPEN_LABEL);
}

async function addSpacer(page: Page) {
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.setAttribute("data-test-spacer", "");
    spacer.style.blockSize = "2000px";
    document.body.appendChild(spacer);
  });
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  expect(b).not.toBeNull();
  return b!;
}

/** Parses a computed color (rgb[a]() or color(srgb …)) into 0–255 channels and alpha. */
function parseColor(value: string): { r: number; g: number; b: number; a: number } {
  const nums = (value.match(/-?[\d.]+/g) ?? []).map(Number);
  if (value.startsWith("color(")) {
    const [r, g, b, a = 1] = nums;
    return { r: r * 255, g: g * 255, b: b * 255, a };
  }
  const [r, g, b, a = 1] = nums;
  return { r, g, b, a };
}

test.describe("Mobile_Menu (fixture build)", { tag: NAV_LIVE_TAG }, () => {
  for (const vp of MENU_VIEWPORTS) {
    test.describe(`at ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await gotoHydrated(page);
      });

      test("trigger is a 44×44 button with aria-expanded, aria-controls and Menu/Close menu names (Req 8.1)", async ({ page }) => {
        const t = trigger(page);
        await expect(t).toBeVisible();
        expect(await t.evaluate((el) => el.tagName)).toBe("BUTTON");
        await expect(t).toHaveAttribute("aria-expanded", "false");
        await expect(t).toHaveAccessibleName(OPEN_LABEL);
        const controls = await t.getAttribute("aria-controls");
        expect(controls).toBeTruthy();
        const b = await box(t);
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        // The no-JS disclosure is hidden once hydrated (Req 17.6).
        await expect(slot(page).locator("summary")).toBeHidden();

        await openMenu(page);
        await expect(t).toHaveAttribute("aria-expanded", "true");
        await expect(t).toHaveAccessibleName(CLOSE_LABEL);
        await expect(panel(page)).toHaveAttribute("id", controls!);
      });

      test("opens as a labelled modal dialog and focuses the close control within 50 ms (Req 8.2)", async ({ page }) => {
        // Measured in-page from the trigger click to the close control's
        // focusin, so no Playwright round trip is included. Under a parallel
        // run another worker can steal the CPU for a single sample, so the
        // test warms up once and takes the fastest of up to 3 real opens: a
        // menu that is actually slower than 50 ms fails every sample.
        const measureOpen = () =>
          page.evaluate(
            () =>
              new Promise<number>((resolve) => {
                const onFocus = (e: FocusEvent) => {
                  if ((e.target as Element).matches?.(".mobile-menu__close")) {
                    document.removeEventListener("focusin", onFocus);
                    resolve(performance.now() - t0);
                  }
                };
                document.addEventListener("focusin", onFocus);
                const t0 = performance.now();
                document.querySelector<HTMLButtonElement>("header .menu-trigger")!.click();
              }),
          );
        const closeViaEscape = async () => {
          await page.keyboard.press("Escape");
          await expectFocusReturned(page);
        };

        await measureOpen();
        await closeViaEscape();
        const samples: number[] = [];
        for (let i = 0; i < 3; i++) {
          samples.push(await measureOpen());
          if (Math.min(...samples) <= 50) break;
          await closeViaEscape();
        }
        expect(Math.min(...samples), `open→focus samples (ms): ${samples.join(", ")}`).toBeLessThanOrEqual(50);

        const dialog = page.getByRole("dialog", { name: DIALOG_LABEL });
        await expect(dialog).toHaveCount(1);
        await expect(dialog).toHaveAttribute("aria-modal", "true");
        await expect(dialog).toHaveAttribute("aria-label", DIALOG_LABEL);
        await expect(closeButton(page)).toBeFocused();
        // Portaled to body, outside header and main.
        expect(await panel(page).evaluate((el) => el.parentElement === document.body)).toBe(true);
        // The panel reveal runs 320–420 ms (Req 8.9).
        const duration = await panel(page).evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
        expect(duration).toBeGreaterThanOrEqual(0.32);
        expect(duration).toBeLessThanOrEqual(0.42);
      });

      test("contains close control, nav items, Primary_CTA and location in DOM order (Req 8.11)", async ({ page }) => {
        await openMenu(page);
        await waitSettledOpen(page);

        const close = closeButton(page);
        await expect(close).toHaveAccessibleName(CLOSE_LABEL);
        const cb = await box(close);
        expect(cb.width).toBeGreaterThanOrEqual(44);
        expect(cb.height).toBeGreaterThanOrEqual(44);

        await expect(menuNav(page)).toHaveAttribute("aria-label", MENU_NAV_LABEL);
        const links = menuNav(page).getByRole("link");
        await expect(links).toHaveCount(ITEM_NAMES.length);
        for (const [i, name] of ITEM_NAMES.entries()) await expect(links.nth(i)).toHaveAccessibleName(name);
        await expect(menuLink(page, "Contact (coming soon)")).toHaveAttribute("aria-disabled", "true");
        expect(await menuLink(page, "Contact (coming soon)").getAttribute("href")).toBeNull();

        await expect(menuCta(page)).toHaveText(CTA_LABEL);
        expect(await menuCta(page).getAttribute("href")).toBe("/contact");
        await expect(panel(page).locator(".mobile-menu__location")).toHaveText(LOCATION);

        const order = await panel(page).evaluate((root) => {
          const parts = [".mobile-menu__close", "nav.mobile-menu__nav", ".mobile-menu__cta", ".mobile-menu__location"].map(
            (s) => root.querySelector(s)!,
          );
          const firstFocusable = root.querySelector("a[href], button, [tabindex]");
          return {
            inOrder: parts.every(
              (el, i) => i === 0 || (parts[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            ),
            closeFirst: firstFocusable === parts[0],
          };
        });
        expect(order.inOrder).toBe(true);
        expect(order.closeFirst).toBe(true);
      });

      test("nav items use 28–32 px type with ≥ 44 px targets spaced ≥ 8 px (Req 8.11)", async ({ page }) => {
        await openMenu(page);
        await waitSettledOpen(page);
        const metrics = await menuNav(page).evaluate((nav) =>
          Array.from(nav.querySelectorAll<HTMLElement>(".nav-link")).map((a) => {
            const r = a.getBoundingClientRect();
            const row = a.closest("li")!.getBoundingClientRect();
            return { font: parseFloat(getComputedStyle(a).fontSize), top: r.top, bottom: r.bottom, w: r.width, h: r.height, rowH: row.height };
          }),
        );
        expect(metrics).toHaveLength(ITEM_NAMES.length);
        for (const [i, m] of metrics.entries()) {
          expect(m.font).toBeGreaterThanOrEqual(28);
          expect(m.font).toBeLessThanOrEqual(32);
          expect(m.h).toBeGreaterThanOrEqual(44);
          expect(m.w).toBeGreaterThanOrEqual(44);
          expect(m.rowH).toBeGreaterThanOrEqual(44);
          if (i > 0) expect(m.top - metrics[i - 1].bottom).toBeGreaterThanOrEqual(8);
        }
      });

      if (vp.width < 768) {
        test("fills the viewport with no backdrop below 768 (Req 8.3)", async ({ page }) => {
          await openMenu(page);
          await waitSettledOpen(page);
          const b = await box(panel(page));
          expect(b.x).toBeCloseTo(0, 0);
          expect(b.y).toBeCloseTo(0, 0);
          expect(b.width).toBeCloseTo(vp.width, 0);
          expect(b.height).toBeCloseTo(vp.height, 0);
          await expect(backdrop(page)).toHaveCSS("display", "none");
          await expect(backdrop(page)).toBeHidden();
        });
      } else {
        test("renders a right 420 px panel over an ink-950 64% backdrop at 768–1279 (Req 8.4)", async ({ page }) => {
          await openMenu(page);
          await waitSettledOpen(page);
          const b = await box(panel(page));
          const expectedW = Math.min(420, vp.width);
          expect(b.width).toBeCloseTo(expectedW, 0);
          expect(b.x + b.width).toBeCloseTo(vp.width, 0);
          expect(b.y).toBeCloseTo(0, 0);
          expect(b.height).toBeCloseTo(vp.height, 0);

          await expect(backdrop(page)).toBeVisible();
          const bb = await box(backdrop(page));
          expect(bb).toEqual({ x: 0, y: 0, width: vp.width, height: vp.height });
          const bg = parseColor(await backdrop(page).evaluate((el) => getComputedStyle(el).backgroundColor));
          expect(bg.r).toBeCloseTo(5, 0);
          expect(bg.g).toBeCloseTo(7, 0);
          expect(bg.b).toBeCloseTo(12, 0);
          expect(bg.a).toBeCloseTo(0.64, 2);
          await expect(backdrop(page)).toHaveCSS("opacity", "1");
        });

        test("backdrop click closes and returns focus to the trigger (Req 8.7)", async ({ page }) => {
          await openMenu(page);
          await backdrop(page).click({ position: { x: 40, y: vp.height / 2 } });
          await expectFocusReturned(page);
        });
      }

      test("sets inert outside the menu, including the trigger, and releases it on close (Req 8.5, 8.13)", async ({ page }) => {
        await openMenu(page);
        const state = await page.evaluate(() => ({
          header: document.querySelector("header#site-header")!.hasAttribute("inert"),
          main: document.querySelector("main#main")!.hasAttribute("inert"),
          trigger: document.querySelector("header .menu-trigger")!.closest("[inert]") !== null,
          panel: document.querySelector(".mobile-menu__panel")!.closest("[inert]") !== null,
          backdrop: document.querySelector(".mobile-menu__backdrop")!.closest("[inert]") !== null,
          outside: Array.from(document.body.children)
            .filter((el) => !el.matches(".mobile-menu__panel, .mobile-menu__backdrop, script, style, link, template"))
            .every((el) => el.hasAttribute("inert")),
        }));
        expect(state).toEqual({ header: true, main: true, trigger: true, panel: false, backdrop: false, outside: true });
        // Inert content is not focusable: focusing the trigger or brand is a no-op.
        await page.evaluate(() => {
          document.querySelector<HTMLElement>("header .menu-trigger")!.focus();
          document.querySelector<HTMLElement>(".brand-mark")!.focus();
        });
        await expect(closeButton(page)).toBeFocused();

        await page.keyboard.press("Escape");
        await expectFocusReturned(page);
        expect(await page.locator("header#site-header").getAttribute("inert")).toBeNull();
        expect(await page.locator("main#main").getAttribute("inert")).toBeNull();
      });

      test("Tab and Shift+Tab wrap inside the menu (Req 8.12, 12.12)", async ({ page }) => {
        await openMenu(page);
        const sequence: Locator[] = [
          closeButton(page),
          ...ITEM_NAMES.map((n) => menuLink(page, n)),
          menuCta(page),
        ];
        for (let i = 1; i <= sequence.length; i++) {
          await page.keyboard.press("Tab");
          await expect(sequence[i % sequence.length]).toBeFocused();
        }
        // Back on the close control: Shift+Tab wraps to the last element.
        await page.keyboard.press("Shift+Tab");
        await expect(menuCta(page)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(closeButton(page)).toBeFocused();
      });

      test("Escape closes and returns focus to the trigger (Req 8.6)", async ({ page }) => {
        await openMenu(page);
        await page.keyboard.press("Escape");
        await expectFocusReturned(page);
      });

      test("close control closes within 280 ms and returns focus (Req 8.7, 8.10)", async ({ page }) => {
        // Measured in-page from the close click to the panel's removal (240 ms
        // fade, 280 ms safety net), with no Playwright round trip included.
        // The fastest of up to 3 real closes is asserted so a single sample
        // delayed by another worker's CPU load does not fail the run.
        const measureClose = () =>
          page.evaluate(
            () =>
              new Promise<number>((resolve) => {
                const panelEl = document.querySelector(".mobile-menu__panel")!;
                const observer = new MutationObserver(() => {
                  if (panelEl.isConnected) return;
                  observer.disconnect();
                  resolve(performance.now() - t0);
                });
                observer.observe(document.body, { childList: true });
                const t0 = performance.now();
                document.querySelector<HTMLButtonElement>(".mobile-menu__close")!.click();
              }),
          );
        const samples: number[] = [];
        for (let i = 0; i < 3; i++) {
          await openMenu(page);
          await waitSettledOpen(page);
          samples.push(await measureClose());
          await expectFocusReturned(page);
          if (Math.min(...samples) <= 280) break;
        }
        expect(Math.min(...samples), `close→unmount samples (ms): ${samples.join(", ")}`).toBeLessThanOrEqual(280);
      });

      test("a live Nav_Item closes, returns focus and navigates (Req 8.7)", async ({ page }) => {
        await openMenu(page);
        await menuLink(page, "About").click();
        await expectFocusReturned(page);
        await expect(page).toHaveURL(/#top$/);
      });

      test("a live in-page Nav_Item closes the menu and follows its anchor (Req 8.7)", async ({ page }) => {
        await openMenu(page);
        await menuLink(page, "Industries").click();
        await expectClosed(page);
        await expect(page).toHaveURL(/#main$/);
      });

      test("the Primary_CTA closes, returns focus and keeps its destination (Req 8.7)", async ({ page }) => {
        await openMenu(page);
        // The CTA is a real route now; hold the document so focus return is observable.
        await page.evaluate(() =>
          document.addEventListener("click", (e) => {
            if ((e.target as Element).closest(".mobile-menu__cta")) e.preventDefault();
          }, { capture: true, once: true }),
        );
        await menuCta(page).click();
        await expectFocusReturned(page);
        expect(await menuCta(page).count()).toBe(0);
        await expect(page.locator("header .site-header__cta")).toHaveAttribute("href", "/contact");
      });

      test("a planned item keeps the menu open and focus on itself (Req 8.14)", async ({ page }) => {
        await openMenu(page);
        const planned = menuLink(page, "Contact (coming soon)");
        const urlBefore = page.url();

        await planned.focus();
        await page.keyboard.press("Enter");
        await expect(planned).toBeFocused();
        // Playwright treats aria-disabled as not enabled, so the pointer click is forced.
        await planned.click({ force: true });
        await expect(planned).toBeFocused();
        await page.keyboard.press("Space");

        await expect(panel(page)).toBeVisible();
        await expect(panel(page)).not.toHaveAttribute("data-phase", "closing");
        await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
        await expect(planned).toBeFocused();
        expect(page.url()).toBe(urlBefore);
      });

      test("locks scroll with 0 px horizontal shift and restores the position (Req 8.5, 8.13)", async ({ page }) => {
        await addSpacer(page);
        await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);

        const measure = () =>
          page.evaluate(() => {
            const rect = (s: string) => {
              const r = document.querySelector(s)!.getBoundingClientRect();
              return { left: r.left, top: r.top, width: r.width };
            };
            return { main: rect("main#main"), header: rect("header#site-header .site-header__inner"), brand: rect(".brand-mark") };
          });
        const before = await measure();

        await openMenu(page);
        await waitSettledOpen(page);
        const during = await measure();
        expect(during.main.left).toBeCloseTo(before.main.left, 1);
        expect(during.main.width).toBeCloseTo(before.main.width, 1);
        expect(during.main.top).toBeCloseTo(before.main.top, 1);
        expect(during.header.left).toBeCloseTo(before.header.left, 1);
        expect(during.header.width).toBeCloseTo(before.header.width, 1);
        expect(during.brand.left).toBeCloseTo(before.brand.left, 1);

        // Wheel over the menu does not scroll the document.
        await page.mouse.move(vp.width - 20, vp.height / 2);
        await page.mouse.wheel(0, 400);
        expect((await measure()).main.top).toBeCloseTo(before.main.top, 1);

        await page.keyboard.press("Escape");
        await expectFocusReturned(page);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
        const after = await measure();
        expect(after.main.left).toBeCloseTo(before.main.left, 1);
        expect(after.main.top).toBeCloseTo(before.main.top, 1);
      });

      test("crossing to 1280 closes instantly and focuses the Brand_Mark (Req 8.8)", async ({ page }) => {
        await openMenu(page);
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(panel(page)).toHaveCount(0);
        await expect(page.getByRole("link", { name: BRAND_NAME, exact: true })).toBeFocused();
        expect(await page.locator("body > [inert]").count()).toBe(0);
        await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
        await expect(slot(page)).toBeHidden();
      });
    });
  }

  for (const vp of [MOBILE_390x844, TABLET_1024x768]) {
    test.describe(`reduced motion at ${vp.name} (Req 8.9, 8.10)`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });

      test("open and close use an opacity-only fade of at most 150 ms, with no stagger", async ({ page }) => {
        await gotoHydrated(page);
        await openMenu(page);

        const inspect = (selectors: string[]) =>
          page.evaluate((sels) => {
            const layers = sels.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)));
            return layers.map((el) => {
              const cs = getComputedStyle(el);
              return {
                name: cs.animationName,
                duration: parseFloat(cs.animationDuration) * 1000,
                props: el
                  .getAnimations()
                  .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes())
                  .flatMap((k) => Object.keys(k))
                  .filter((k) => !["offset", "computedOffset", "easing", "composite"].includes(k)),
              };
            });
          }, selectors);

        const layers = vp.width >= 768 ? [".mobile-menu__panel", ".mobile-menu__backdrop"] : [".mobile-menu__panel"];
        for (const l of await inspect(layers)) {
          expect(l.name).toBe("menu-fade-in");
          expect(l.duration).toBeLessThanOrEqual(150);
          for (const p of l.props) expect(p).toBe("opacity");
        }
        const items = await inspect([".mobile-menu__nav .nav-list__item", ".mobile-menu__footer"]);
        expect(items.length).toBeGreaterThan(0);
        for (const i of items) expect(i.name).toBe("none");

        // Close: read the closing layer in the frame after Escape, within the fade.
        const closing = await page.evaluate(
          () =>
            new Promise<{ phase: string | undefined; name: string; duration: number }>((resolve) => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  const el = document.querySelector<HTMLElement>(".mobile-menu__panel");
                  const cs = el ? getComputedStyle(el) : null;
                  resolve({
                    phase: el?.dataset.phase,
                    name: cs?.animationName ?? "",
                    duration: cs ? parseFloat(cs.animationDuration) * 1000 : 0,
                  });
                }),
              );
            }),
        );
        if (closing.phase === "closing") {
          expect(closing.name).toBe("menu-fade-out");
          expect(closing.duration).toBeLessThanOrEqual(150);
        }
        await expectFocusReturned(page);
      });
    });
  }
});

test.describe("No-JS disclosure (fixture build)", { tag: NAV_LIVE_TAG }, () => {
  for (const vp of [MOBILE_320x568, MOBILE_390x844, TABLET_1024x768]) {
    test.describe(`at ${vp.name} (Req 17.4, 17.5)`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, javaScriptEnabled: false });

      test.beforeEach(async ({ page }) => {
        await page.goto("/");
      });

      const details = (page: Page) => slot(page).locator("details[data-nojs-menu]");
      const summary = (page: Page) => details(page).locator("summary");
      const disclosureLinks = (page: Page) => details(page).locator("nav").getByRole("link");

      test("shows a 44×44 'Menu' summary in place of the hidden JS trigger", async ({ page }) => {
        await expect(trigger(page)).toBeHidden();
        await expect(summary(page)).toBeVisible();
        await expect(summary(page)).toHaveText(OPEN_LABEL);
        const b = await box(summary(page));
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        await expect(details(page)).not.toHaveAttribute("open", /.*/);
        await expect(disclosureLinks(page).first()).toBeHidden();
      });

      test("opens and closes by click", async ({ page }) => {
        await summary(page).click();
        await expect(details(page)).toHaveAttribute("open", "");
        await expect(disclosureLinks(page)).toHaveCount(ITEM_NAMES.length);
        for (const [i, name] of ITEM_NAMES.entries()) await expect(disclosureLinks(page).nth(i)).toHaveAccessibleName(name);
        await expect(details(page).locator(".nojs-menu__cta")).toHaveText(CTA_LABEL);
        await summary(page).click();
        await expect(details(page)).not.toHaveAttribute("open", /.*/);
      });

      test("opens by Enter and Space, and every item is reachable by keyboard with no horizontal overflow", async ({ page }) => {
        await summary(page).focus();
        await page.keyboard.press("Enter");
        await expect(details(page)).toHaveAttribute("open", "");
        await page.keyboard.press("Space");
        await expect(details(page)).not.toHaveAttribute("open", /.*/);
        await page.keyboard.press("Space");
        await expect(details(page)).toHaveAttribute("open", "");

        const sequence: Locator[] = [
          ...ITEM_NAMES.map((n) => details(page).locator("nav").getByRole("link", { name: n, exact: true })),
          details(page).locator(".nojs-menu__cta"),
        ];
        for (const target of sequence) {
          await page.keyboard.press("Tab");
          await expect(target).toBeFocused();
          await expect(target).toBeInViewport();
        }
        expect(await details(page).locator("nav a[href]").count()).toBe(3);

        const overflow = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>(".nojs-menu__panel")!;
          const root = document.documentElement;
          return { panel: p.scrollWidth - p.clientWidth, doc: root.scrollWidth - root.clientWidth };
        });
        expect(overflow.panel).toBeLessThanOrEqual(0);
        expect(overflow.doc).toBeLessThanOrEqual(0);
      });
    });
  }
});

test.describe("Hydration swap (fixture build)", { tag: NAV_LIVE_TAG }, () => {
  for (const vp of [MOBILE_390x844, TABLET_1024x768]) {
    test.describe(`at ${vp.name} (Req 17.6)`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("the trigger replaces an open, focused disclosure in place with CLS 0 and takes focus", async ({ page }) => {
        await page.addInitScript(() => {
          const w = window as unknown as { __headerShift: number };
          w.__headerShift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; sources?: Array<{ node?: Node | null }> }>) {
              const inHeader = (entry.sources ?? []).some((s) => s.node instanceof Element && s.node.closest("header") !== null);
              if (inHeader) w.__headerShift += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });

        // Hold every script chunk so the server-rendered disclosure can be
        // used before hydration, then release them.
        let release!: () => void;
        const gate = new Promise<void>((resolve) => (release = resolve));
        await page.route(/\/_next\/static\/.+\.js(\?.*)?$/, async (route) => {
          await gate;
          try {
            await route.continue();
          } catch {
            // Page closed while the request was held.
          }
        });

        await page.goto("/", { waitUntil: "commit" });
        const details = slot(page).locator("details[data-nojs-menu]");
        const summary = details.locator("summary");
        await expect(summary).toBeVisible();
        await expect(slot(page)).not.toHaveAttribute("data-menu-ready", /.*/);
        // Let the Inter swap settle first so only the hydration swap is compared.
        await page.evaluate(() => document.fonts.ready.then(() => undefined));

        const measure = () =>
          page.evaluate(() => {
            const r = (s: string) => {
              const b = document.querySelector(s)!.getBoundingClientRect();
              return { x: b.x, y: b.y, w: b.width, h: b.height };
            };
            return { slot: r("header .site-header__menu"), header: r("header#site-header"), brand: r(".brand-mark") };
          });
        const before = await measure();

        await summary.click();
        await expect(details).toHaveAttribute("open", "");
        await expect(summary).toBeFocused();

        release();
        await expect(slot(page)).toHaveAttribute("data-menu-ready", "true", { timeout: 15_000 });
        await expect(trigger(page)).toBeVisible();
        await expect(trigger(page)).toBeFocused();
        await expect(details).not.toHaveAttribute("open", /.*/);
        await expect(summary).toBeHidden();

        const after = await measure();
        expect(after).toEqual(before);
        const t = await box(trigger(page));
        expect(t.x).toBeGreaterThanOrEqual(after.slot.x - 0.5);
        expect(t.x + t.width).toBeLessThanOrEqual(after.slot.x + after.slot.w + 0.5);
        expect(await page.evaluate(() => (window as unknown as { __headerShift: number }).__headerShift)).toBe(0);
      });
    });
  }
});

// Default build: all six routes are live, so the menu ships below 1280 px.
test.describe("Mobile_Menu in the default build", () => {
  for (const vp of [MOBILE_390x844, TABLET_1024x768]) {
    test(`opens with the six live routes at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.locator(".site-header__menu")).toHaveCount(1);
      await page.getByRole("button", { name: OPEN_LABEL }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".nav-link")).toHaveText(["Advisory", "Industries", "Intelligence", "Insights", "About", "Contact"]);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: OPEN_LABEL })).toBeFocused();
    });
  }
});
