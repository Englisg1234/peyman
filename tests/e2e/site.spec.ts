// Full-site conformance (default build): every public route renders, has one
// h1, canonical + OG metadata, correct nav state, no horizontal overflow or
// sub-12 px text at every Test_Viewport width, and passes axe (WCAG 2.2 AA).
// Plus the inquiry form's client, server and no-JS paths, and SEO endpoints.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", nav: null },
  { path: "/advisory", nav: "Advisory" },
  { path: "/industries", nav: "Industries" },
  { path: "/intelligence", nav: "Intelligence" },
  { path: "/insights", nav: "Insights" },
  { path: "/insights/the-meaning-of-peyman", nav: "Insights" },
  { path: "/about", nav: "About" },
  { path: "/recognition", nav: null },
  { path: "/contact", nav: "Contact" },
  { path: "/privacy", nav: null },
  { path: "/terms", nav: null },
] as const;

const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920];

test.describe("routes", () => {
  for (const r of ROUTES) {
    test(`${r.path}: 200, one h1, canonical, OG, nav state`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const res = await page.goto(r.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(r.path);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveCount(1);
      await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
      const current = page.locator('nav[aria-label="Primary"] [aria-current="page"]');
      if (r.nav) await expect(current).toHaveText(r.nav);
      else await expect(current).toHaveCount(0);
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("unknown routes and article slugs 404 with the site shell", async ({ page }) => {
    for (const p of ["/nope", "/insights/unknown-article"]) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(404);
      await expect(page.locator("h1")).toHaveText("This page could not be found.");
    }
  });
});

test.describe("responsive", () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow or tiny text at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      for (const r of ROUTES) {
        await page.goto(r.path);
        const res = await page.evaluate(() => {
          const doc = document.documentElement;
          const small: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("main p, main li, main a, main dd, main label, footer a")) {
            if (el.closest("[data-nojs-menu], .sr-only") || el.getClientRects().length === 0) continue;
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 12 && el.textContent!.trim()) small.push(`${el.textContent!.trim().slice(0, 24)} (${fs}px)`);
          }
          return { overflow: doc.scrollWidth - doc.clientWidth, small };
        });
        expect(res.overflow, `${r.path} horizontal overflow`).toBeLessThanOrEqual(0);
        expect(res.small, `${r.path} text under 12px`).toEqual([]);
      }
    });
  }
});

test.describe("accessibility", () => {
  for (const width of [375, 1440]) {
    test(`axe WCAG 2.2 AA on every route at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: 900 });
      const found: string[] = [];
      for (const r of ROUTES) {
        await page.goto(r.path, { waitUntil: "networkidle" });
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        for (const v of violations) found.push(`${r.path}: ${v.id} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
      }
      expect(found).toEqual([]);
    });
  }
});

test.describe("inquiry form", () => {
  test("client validation focuses the first invalid field; ?interest pre-selects", async ({ page }) => {
    await page.goto("/contact?interest=government-grants");
    await expect(page.locator("#inquiry-interest")).toHaveValue("government-grants");
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.locator(".field__error")).toHaveCount(4);
    await expect(page.locator("#inquiry-name")).toBeFocused();
    await expect(page.locator("#inquiry-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#inquiry-email")).toHaveAttribute("aria-describedby", "inquiry-email-error");
  });

  test("a valid inquiry reaches the server; without storage configured it fails gracefully and keeps values", async ({ page }) => {
    test.skip(Boolean(process.env.SUPABASE_URL), "storage is configured in this environment");
    await page.goto("/contact");
    await page.fill("#inquiry-name", "Asha Rao");
    await page.fill("#inquiry-company", "Example Labs");
    await page.fill("#inquiry-email", "asha@example.com");
    await page.selectOption("#inquiry-interest", "capital-structuring");
    await page.fill("#inquiry-message", "We are preparing for a seed round.");
    await page.waitForTimeout(2600); // past the minimum fill time (spam trap)
    await page.getByRole("button", { name: "Send inquiry" }).click();
    const status = page.locator('.form-status[data-kind="error"]');
    await expect(status).toBeFocused();
    await expect(status).toContainText("could not send");
    await expect(page.locator("#inquiry-name")).toHaveValue("Asha Rao");
    await expect(page.locator("#inquiry-interest")).toHaveValue("capital-structuring");
  });

  test("the honeypot returns a silent success", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#inquiry-name", "Bot");
    await page.fill("#inquiry-company", "Bot Co");
    await page.fill("#inquiry-email", "bot@example.com");
    await page.selectOption("#inquiry-interest", "general");
    await page.fill("#inquiry-message", "Automated message body.");
    await page.evaluate(() => ((document.querySelector("#inquiry-website") as HTMLInputElement).value = "x"));
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.locator('.form-status[data-kind="success"]')).toBeVisible();
  });

  test("without JavaScript the server validates and renders errors", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/contact");
    await page.fill("#inquiry-name", "A");
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await page.waitForLoadState("load");
    await expect(page.locator(".field__error")).toHaveCount(5);
    await ctx.close();
  });
});

test.describe("SEO endpoints", () => {
  test("robots, sitemap, OG image and icon", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const r of ROUTES) expect(sitemap, r.path).toMatch(new RegExp(`<loc>[^<]*${r.path === "/" ? "" : r.path}</loc>`));
    const og = await request.get("/opengraph-image");
    expect(og.headers()["content-type"]).toContain("image/png");
    expect((await request.get("/icon")).ok()).toBe(true);
  });

  test("Organization / ProfessionalService and Article JSON-LD", async ({ page }) => {
    await page.goto("/insights/the-meaning-of-peyman");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((b) => {
      const d = JSON.parse(b);
      return (d["@graph"] ?? [d]).map((n: { "@type": string | string[] }) => [n["@type"]].flat().join("+"));
    });
    expect(types).toEqual(expect.arrayContaining(["Organization+ProfessionalService", "Person", "Article", "BreadcrumbList"]));
  });
});

test.describe("Scroll_Exit (homepage)", () => {
  test("silent at rest, drives the emblem while scrolling, restores at the top", async ({ page }) => {
    // A capable device, so HeroMotion is not in Low_Power_Mode (lib/capability.ts).
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { configurable: true, get: () => 8 });
      Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => 8 });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const scrollWrap = page.locator(".emblem-scroll");
    await page.waitForTimeout(2000);
    expect(await scrollWrap.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
    await page.evaluate(() => window.scrollTo(0, 450));
    await expect.poll(() => scrollWrap.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe("");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => scrollWrap.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
  });
});
