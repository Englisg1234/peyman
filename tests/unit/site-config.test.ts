// Shipped Site_Config (task 5.4): approved strings, v1 flags, the emblem
// renderer, the two pending CTA integrations (DEC-02, DEC-03) and the absence
// of invented contact details.
// Requirements 1.2, 3.7, 14.6, 17.12.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/data/site-config";
import { validateSiteConfig } from "@/lib/site-config-schema";

const CTA_KEYS = ["cta.primary.destination", "cta.secondary.destination"];
const SUPPORTING_COPY =
  "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation.";

describe("approved strings (Req 1.2)", () => {
  it("matches the approved hero copy character-for-character", () => {
    expect(siteConfig.hero.headline).toBe("Bridging the Gap Between Innovation and Institutional Capital.");
    expect(siteConfig.hero.supportingCopy).toBe(SUPPORTING_COPY);
    expect(siteConfig.cta.primary.label).toBe("Start a Conversation");
    expect(siteConfig.cta.secondary.label).toBe("Explore Advisory");
  });

  it("matches the approved meta, brand and menu strings", () => {
    expect(siteConfig.meta.title).toBe("Peyman Consulting");
    expect(siteConfig.meta.description).toBe(SUPPORTING_COPY);
    expect(siteConfig.brand.homeLabel).toBe("Peyman Consulting, home");
    expect(siteConfig.brand.wordmark).toMatchObject({ kind: "text", text: "PEYMAN CONSULTING" });
    expect(siteConfig.skipLink).toBe("Skip to content");
    expect(siteConfig.menu).toEqual({
      openLabel: "Menu",
      closeLabel: "Close menu",
      dialogLabel: "Site navigation",
      location: "Bengaluru, Karnataka",
    });
  });

  it("lists the six Nav_Items in order, all live with their routes", () => {
    expect(siteConfig.nav.items.map((i) => i.label)).toEqual([
      "Advisory",
      "Industries",
      "Intelligence",
      "Insights",
      "About",
      "Contact",
    ]);
    expect(siteConfig.nav.items.map((i) => (i.status === "live" ? i.href : null))).toEqual([
      "/advisory",
      "/industries",
      "/intelligence",
      "/insights",
      "/about",
      "/contact",
    ]);
  });
});

describe("v1 flags (Req 3.7, DEC-04)", () => {
  it("hides planned nav items", () => {
    expect(siteConfig.nav.showPlanned).toBe(false);
  });

  it("disables the Etymology_Note and Service_Index", () => {
    expect(siteConfig.hero.etymology.enabled).toBe(false);
    expect(siteConfig.hero.serviceIndex.enabled).toBe(false);
    expect(siteConfig.hero.emphasis).toBeNull();
  });

  it("uses the raster emblem renderer", () => {
    expect(siteConfig.emblem.kind).toBe("raster");
    expect(siteConfig.emblem.model).toBeUndefined();
  });
});

describe("validation of the shipped config (Req 14.6, 17.12)", () => {
  it("resolves both CTAs to the shipped routes", () => {
    expect(siteConfig.cta.primary.destination).toEqual({ kind: "resolved", href: "/contact" });
    expect(siteConfig.cta.secondary.destination).toEqual({ kind: "resolved", href: "/advisory" });
  });

  it("passes outside release mode with no warnings", () => {
    const result = validateSiteConfig(siteConfig, "non-production");
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("passes in release mode with no issue on either CTA key", () => {
    const result = validateSiteConfig(siteConfig, "production");
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => CTA_KEYS.includes(i.key))).toEqual([]);
  });
});

describe("no invented contact details (DEC-02)", () => {
  const source = readFileSync(fileURLToPath(new URL("../../data/site-config.ts", import.meta.url)), "utf8");

  it("contains no placeholder domain or bracket token in a string", () => {
    expect(source).not.toContain("[domain]");
    expect(source).not.toMatch(/["'`][^"'`\n]*\[[a-z-]+\][^"'`\n]*["'`]/i);
  });

  it("contains no email address, mailto: address or LinkedIn URL", () => {
    // `@/` is the path alias in imports, not an email.
    expect(source).not.toMatch(/[\w.+-]+@[\w-]+(\.[\w-]+)+/);
    expect(source).not.toMatch(/mailto:[^\s"'`]+@/i);
    // The file's comments may mention LinkedIn; only an actual URL is forbidden.
    expect(source).not.toMatch(/linkedin\.[a-z]+|lnkd\.in/i);
  });

  it("has no contact.email key in v1", () => {
    expect(siteConfig).not.toHaveProperty("contact");
  });
});
