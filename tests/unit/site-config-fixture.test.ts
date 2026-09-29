// Live-nav fixture (task 8.3, DEC-05): fixture contents, env selection in
// data/site-config.ts and rejection by the release gate.
// Requirements 7.10, 14.6, 20.2.
import { afterEach, describe, expect, it, vi } from "vitest";
import { withNavLiveFixture } from "@/data/fixtures/nav-live";
import { siteConfig } from "@/data/site-config";
import { runSiteConfigGate, SiteConfigReleaseError } from "@/lib/site-config-gate";
import { validateSiteConfig } from "@/lib/site-config-schema";

const RELEASE = { PEYMAN_RELEASE: "1" };
const fixture = withNavLiveFixture(siteConfig);

/** Re-evaluates data/site-config.ts under the given PEYMAN_CONFIG_FIXTURE value. */
async function loadSiteConfig(value: string) {
  vi.stubEnv("PEYMAN_CONFIG_FIXTURE", value);
  vi.resetModules();
  return (await import("@/data/site-config")).siteConfig;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("nav-live fixture contents", () => {
  it("has 3 live items with existing in-page or root targets, then 1 planned item", () => {
    expect(fixture.nav.showPlanned).toBe(true);
    expect(fixture.nav.items.map((i) => [i.id, i.status, i.status === "live" ? i.href : null])).toEqual([
      ["advisory", "live", "/"],
      ["industries", "live", "#main"],
      ["about", "live", "#top"],
      ["contact", "planned", null],
    ]);
    expect(fixture.nav.items[3]).not.toHaveProperty("href");
  });

  it("reuses the approved labels and leaves every other key unchanged", () => {
    const labels = new Map(siteConfig.nav.items.map((i) => [i.id, i.label]));
    for (const item of fixture.nav.items) expect(item.label).toBe(labels.get(item.id));
    const { fixture: marker, nav, ...rest } = fixture;
    const { nav: baseNav, ...baseRest } = siteConfig;
    expect(marker).toBe("nav-live");
    expect(rest).toEqual(baseRest);
    expect({ ...nav, items: [], showPlanned: false }).toEqual({ ...baseNav, items: [] });
  });
});

describe("fixture selection (PEYMAN_CONFIG_FIXTURE)", () => {
  it("uses the shipped config, with no fixture marker, when unset", async () => {
    const cfg = await loadSiteConfig("");
    expect(cfg).not.toHaveProperty("fixture");
    expect(cfg.nav.showPlanned).toBe(false);
  });

  it("selects the live-nav fixture for nav-live", async () => {
    expect(await loadSiteConfig("nav-live")).toEqual(fixture);
  });

  it("rejects an unknown fixture name", async () => {
    await expect(loadSiteConfig("nav-typo")).rejects.toThrow(/Unknown PEYMAN_CONFIG_FIXTURE "nav-typo"/);
  });
});

describe("release gate rejects any fixture (DEC-05)", () => {
  it("reports fixture-config in production mode", () => {
    const result = validateSiteConfig(fixture, "production");
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({ key: "fixture", reason: "fixture-config", value: "nav-live" });
  });

  it("rejects the fixture even when every CTA is resolved", () => {
    const resolved = {
      ...fixture,
      cta: {
        primary: { ...fixture.cta.primary, destination: { kind: "resolved" as const, href: "/" as const } },
        secondary: { ...fixture.cta.secondary, destination: { kind: "resolved" as const, href: "#main" as const } },
      },
    };
    expect(() => runSiteConfigGate(resolved, RELEASE)).toThrow(SiteConfigReleaseError);
    expect(() => runSiteConfigGate(resolved, RELEASE)).toThrow(/fixture: fixture-config \("nav-live"\)/);
    expect(runSiteConfigGate({ ...resolved, fixture: undefined }, RELEASE)).toEqual([]);
  });

  it("keeps non-production warnings to the CTA keys only (none once CTAs resolve)", () => {
    const result = validateSiteConfig(fixture, "non-production");
    expect(result.ok).toBe(true);
    expect(result.warnings.every((w) => w.key.startsWith("cta."))).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
