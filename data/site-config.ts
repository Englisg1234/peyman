// Site_Config: the single source for every Hero and Site_Header string, href,
// flag and label (Req 14.5, 15.4). Approved strings are verbatim (Req 1.2, 3.5, 3.6).
import emblemPoster from "@/assets/emblem/peyman-emblem.png";
import { withNavLiveFixture } from "@/data/fixtures/nav-live";
import type { SiteConfig } from "@/lib/site-config-schema";

const SUPPORTING_COPY =
  "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation.";

/** The shipped config. `siteConfig` (below) equals this unless a test fixture is selected. */
const defaultSiteConfig: SiteConfig = {
  meta: {
    title: "Peyman Consulting",
    // Req 16.6: the meta description equals the Supporting_Copy.
    description: SUPPORTING_COPY,
    themeColor: "#05070C",
    lang: "en",
  },
  brand: {
    name: "Peyman Consulting",
    homeLabel: "Peyman Consulting, home",
    wordmark: { kind: "text", text: "PEYMAN CONSULTING", role: "wordmark" },
  },
  skipLink: "Skip to content",
  hero: {
    headline: "Bridging the Gap Between Innovation and Institutional Capital.",
    supportingCopy: SUPPORTING_COPY,
    emphasis: null,
    // Disabled until owner approval (Req 3.7, Open Question 5).
    etymology: {
      enabled: false,
      text: "Peyman /pejmɒːn/ (pay-mahn): a binding agreement of trust and loyalty",
      ipa: "/pejmɒːn/",
      ipaLang: "fa-fonipa",
    },
    serviceIndex: {
      enabled: false,
      label: "Advisory services",
      items: [
        "Capital Structuring & Financial Advisory",
        "Legal & Transactional Advisory",
        "Government Grant & Policy Advisory",
        "Fundraising Readiness & Deal Syndication",
      ],
    },
  },
  /*
   * CTA integration points (DEC-02).
   *
   * Both CTAs are pending: no contact route, email domain, LinkedIn URL or
   * Advisory page exists yet, and none is invented here. A pending destination
   * renders an in-page placeholder fragment (lib/cta.ts `resolveCtaHref`) and
   * blocks the release gate (task 5.2).
   *
   * To connect a feature, replace its `{ kind: "pending", ... }` with
   * `{ kind: "resolved", href }`:
   *   - Contact feature  -> cta.primary.destination,
   *     e.g. { kind: "resolved", href: "/contact" } or a real `mailto:` once
   *     the owner supplies the email domain.
   *   - Advisory feature -> cta.secondary.destination,
   *     e.g. { kind: "resolved", href: "/advisory" } once that page ships.
   * No component changes are needed; every CTA reads its href through
   * `resolveCtaHref()`.
   */
  // Both CTA features have shipped: /contact (inquiry form) and /advisory.
  cta: {
    primary: {
      label: "Start a Conversation",
      destination: { kind: "resolved", href: "/contact" },
    },
    secondary: {
      label: "Explore Advisory",
      destination: { kind: "resolved", href: "/advisory" },
    },
  },
  nav: {
    label: "Primary",
    menuLabel: "Menu navigation",
    // DEC-04: owner override of Req 7.16 (default true). Planned items stay hidden.
    showPlanned: false,
    plannedSuffix: "(coming soon)",
    items: [
      { id: "advisory", label: "Advisory", status: "live", href: "/advisory" },
      { id: "industries", label: "Industries", status: "live", href: "/industries" },
      { id: "intelligence", label: "Intelligence", status: "live", href: "/intelligence" },
      { id: "insights", label: "Insights", status: "live", href: "/insights" },
      { id: "about", label: "About", status: "live", href: "/about" },
      { id: "contact", label: "Contact", status: "live", href: "/contact" },
    ],
  },
  menu: {
    openLabel: "Menu",
    closeLabel: "Close menu",
    dialogLabel: "Site navigation",
    location: "Bengaluru, Karnataka",
  },
  emblem: {
    kind: "raster",
    // Measured master (task 4.1, assets/emblem/README.md): 1003×1144.
    aspectRatio: 1003 / 1144,
    anchor: { x: 0.278, y: 0.499 },
    poster: { src: emblemPoster, width: 1003, height: 1144 },
  },
  typography: {
    display: "Inter",
    sans: "Inter",
    mono: "Source Code Pro",
    licenses: { Inter: "OFL-1.1", "Source Code Pro": "OFL-1.1" },
    wordmarkRole: "wordmark",
  },
};

/*
 * Test fixture selection (task 8.3, DEC-05).
 *
 * PEYMAN_CONFIG_FIXTURE=nav-live selects the live-nav fixture used by the
 * Mobile_Menu and navigation e2e tests (`npm run build:fixture`). next.config.ts
 * inlines the variable at build time (`env`), so in the default build this
 * condition is the constant `"" === "nav-live"` and the fixture is dropped.
 * Under Vitest it is read from the real environment. Any fixture carries a
 * `fixture` marker that the release gate rejects (`fixture-config`).
 */
const FIXTURE = process.env.PEYMAN_CONFIG_FIXTURE ?? "";
if (FIXTURE !== "" && FIXTURE !== "nav-live") {
  throw new Error(`Unknown PEYMAN_CONFIG_FIXTURE "${FIXTURE}". Supported: "nav-live".`);
}

export const siteConfig: SiteConfig = FIXTURE === "nav-live" ? withNavLiveFixture(defaultSiteConfig) : defaultSiteConfig;
