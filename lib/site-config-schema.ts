// Site_Config types (design "Data Models", Req 14.5, 15.4) and release
// validation (`validateSiteConfig`, task 5.2, Req 14.6, 17.12, 19.7).
// data/site-config.ts is typed by this module, so a missing key or a wrong
// type fails `tsc`.
import type { StaticImageData } from "next/image";

/** Every destination the site may render. Only these schemes are allowed. */
export type Href = `/${string}` | `#${string}` | `mailto:${string}` | `https://${string}`;

export type NavId = "advisory" | "industries" | "intelligence" | "insights" | "about" | "contact";

/**
 * A Nav_Item is either live (has a real route) or planned (the route does not
 * exist yet). Planned items never render an `href`; `futureHref` is metadata only.
 */
export type NavItem =
  | { readonly id: NavId; readonly label: string; readonly status: "live"; readonly href: Href }
  | { readonly id: NavId; readonly label: string; readonly status: "planned"; readonly futureHref?: Href };

/** Features that will own a CTA destination once they exist (DEC-02). */
export type CtaIntegration = "contact-feature" | "advisory-feature";

/**
 * Where a CTA points (DEC-02). `pending` means the owning feature has not
 * landed; it renders a documented in-page placeholder fragment (see lib/cta.ts)
 * and blocks the release gate (task 5.2). `resolved` carries the real href.
 */
export type CtaDestination =
  | { readonly kind: "pending"; readonly integration: CtaIntegration; readonly note: string }
  | { readonly kind: "resolved"; readonly href: Href };

export interface Cta {
  readonly label: string;
  readonly destination: CtaDestination;
}

/** Swappable emblem renderer contract (Req 5.6, 15.9). */
export interface EmblemVisual {
  readonly kind: "raster" | "model";
  /** Master width / height; within ±1% of 972/1108. */
  readonly aspectRatio: number;
  /** Column-axis anchor in 0–1 fractions of the master (transform origin). */
  readonly anchor: { readonly x: number; readonly y: number };
  readonly poster: { readonly src: StaticImageData; readonly width: number; readonly height: number };
  /** Future Model_Emblem only; `kind: 'model'` fails the build in v1 (Req 19.7). */
  readonly model?: { readonly glb: string; readonly maxBytes: 1_572_864; readonly maxTriangles: 100_000 };
}

/**
 * Props every emblem renderer receives through the renderer-selection point
 * (components/hero/emblem-visual.tsx; design Interfaces, Req 5.6, 15.9).
 * The renderer fills the Emblem_Stage slot at 100% × 100%; it never sizes or
 * positions the slot, so swapping renderers cannot move it.
 */
export interface EmblemRendererProps {
  readonly visual: EmblemVisual;
  /** `hero`: the Emblem_Stage (with the specular copy). `brand`: reserved for a Brand_Mark renderer. */
  readonly slot: "hero" | "brand";
  /** Responsive `sizes` attribute for the poster (lib/emblem-sizes.ts). */
  readonly sizes: string;
  /** Preload the poster (`next/image` `preload`, Next 16). Hero only. */
  readonly preload: boolean;
}

export type Wordmark =
  | { readonly kind: "text"; readonly text: "PEYMAN CONSULTING"; readonly role: "wordmark" }
  | { readonly kind: "asset"; readonly src: StaticImageData; readonly width: number; readonly height: number };

/** Test-only Site_Config fixtures (DEC-05). Selected via `PEYMAN_CONFIG_FIXTURE`. */
export type ConfigFixture = "nav-live";

export interface SiteConfig {
  /**
   * Set only by a test fixture (data/fixtures/*), never by the shipped config.
   * Its presence makes validation report `fixture-config`, so the release gate
   * rejects every fixture build (DEC-05).
   */
  readonly fixture?: ConfigFixture;
  readonly meta: {
    readonly title: "Peyman Consulting";
    readonly description: string;
    readonly themeColor: "#05070C";
    readonly lang: "en";
  };
  readonly brand: {
    readonly name: string;
    /** Accessible name of the Brand_Mark link. */
    readonly homeLabel: string;
    readonly wordmark: Wordmark;
  };
  readonly skipLink: string;
  readonly hero: {
    readonly headline: string;
    readonly supportingCopy: string;
    /** Contiguous substring of the headline rendered in gold; v1: null. */
    readonly emphasis: null | { readonly text: string };
    readonly etymology: {
      readonly enabled: boolean;
      /** Full visible text; `ipa` is a substring of it. */
      readonly text: string;
      readonly ipa: string;
      readonly ipaLang: "fa-fonipa";
    };
    readonly serviceIndex: {
      readonly enabled: boolean;
      readonly label: "Advisory services";
      readonly items: readonly [string, string, string, string];
    };
  };
  readonly cta: { readonly primary: Cta; readonly secondary: Cta };
  readonly nav: {
    readonly label: "Primary";
    readonly menuLabel: string;
    readonly showPlanned: boolean;
    readonly plannedSuffix: "(coming soon)";
    readonly items: readonly NavItem[];
  };
  readonly menu: {
    readonly openLabel: "Menu";
    readonly closeLabel: "Close menu";
    readonly dialogLabel: "Site navigation";
    readonly location: "Bengaluru, Karnataka";
  };
  readonly emblem: EmblemVisual;
  readonly typography: {
    readonly display: "Inter";
    readonly sans: "Inter";
    readonly mono: "Source Code Pro";
    readonly licenses: { readonly Inter: "OFL-1.1"; readonly "Source Code Pro": "OFL-1.1" };
    readonly wordmarkRole: "wordmark";
  };
}

// ---------------------------------------------------------------------------
// Validation (task 5.2, DEC-03)
// ---------------------------------------------------------------------------

/**
 * `production` is the release mode (`PEYMAN_RELEASE=1`, see lib/site-config-gate.ts).
 * Plain `next build` validates in `non-production` mode (DEC-03).
 */
export type BuildMode = "production" | "non-production";

export type ValidationReason =
  /** A CTA destination is `{ kind: 'pending' }`: its owning feature has not landed (DEC-02). */
  | "pending-integration"
  /** A CTA destination is missing, malformed, empty, `#`, a bracket token or a disallowed scheme. */
  | "unresolved-cta"
  /** A `mailto:` whose domain contains a square-bracketed placeholder, e.g. `[domain]`. */
  | "placeholder-email"
  /** A Nav_Item status other than `live` or `planned`. */
  | "invalid-nav-status"
  /** `emblem.kind` is not `raster`; v1 ships no Model_Emblem renderer (Req 19.7). */
  | "model-without-renderer"
  /** The config carries a `fixture` marker: a test fixture was selected (DEC-05). */
  | "fixture-config";

export interface ValidationIssue {
  /** Dotted Site_Config key, e.g. `cta.primary.destination` or `nav.items[2].status`. */
  readonly key: string;
  readonly reason: ValidationReason;
  readonly value: unknown;
}

export interface ValidationResult {
  /** `false` only in production mode when at least one issue exists. */
  readonly ok: boolean;
  /** Every offending key, one issue per key, in any mode. */
  readonly issues: readonly ValidationIssue[];
  /** Non-production only: one entry per offending CTA key (Req 17.12). Empty in production. */
  readonly warnings: readonly ValidationIssue[];
}

const CTA_KEYS = ["primary", "secondary"] as const;
const NAV_STATUSES: readonly unknown[] = ["live", "planned"];
/** Emblem kinds that have a renderer in this build. */
const RENDERABLE_EMBLEM_KINDS: readonly unknown[] = ["raster"];
const BRACKET_TOKEN = /\[[^\]]+\]/;
const ALLOWED_HREF = /^(\/|#|mailto:|https:\/\/)/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const field = (v: unknown, name: string): unknown => (isRecord(v) ? v[name] : undefined);

/** A `mailto:` href whose domain part contains a bracket token. */
function isPlaceholderEmail(href: string): boolean {
  if (!href.toLowerCase().startsWith("mailto:")) return false;
  const address = href.slice("mailto:".length).split("?")[0];
  const at = address.lastIndexOf("@");
  return at >= 0 && BRACKET_TOKEN.test(address.slice(at + 1));
}

function checkCtaDestination(key: string, dest: unknown): ValidationIssue | null {
  const kind = field(dest, "kind");
  if (kind === "pending") return { key, reason: "pending-integration", value: field(dest, "integration") };
  const href = field(dest, "href");
  if (kind !== "resolved" || typeof href !== "string") return { key, reason: "unresolved-cta", value: dest };
  if (isPlaceholderEmail(href)) return { key, reason: "placeholder-email", value: href };
  const trimmed = href.trim();
  if (trimmed === "" || trimmed === "#" || BRACKET_TOKEN.test(trimmed) || !ALLOWED_HREF.test(trimmed)) {
    return { key, reason: "unresolved-cta", value: href };
  }
  return null;
}

function checkNav(items: unknown): ValidationIssue[] {
  if (!Array.isArray(items)) return [];
  const out: ValidationIssue[] = [];
  items.forEach((item, i) => {
    const status = field(item, "status");
    if (!NAV_STATUSES.includes(status)) {
      out.push({ key: `nav.items[${i}].status`, reason: "invalid-nav-status", value: status });
      return;
    }
    const href = field(item, "href");
    if (status === "live" && typeof href === "string" && isPlaceholderEmail(href)) {
      out.push({ key: `nav.items[${i}].href`, reason: "placeholder-email", value: href });
    }
  });
  return out;
}

/**
 * Validates a Site_Config value (typed as `unknown` so casts and fixtures are
 * checked too). Reports at most one issue per key.
 *
 * - production: `ok` is false iff any issue exists; `warnings` is empty.
 * - non-production: `ok` is always true; `warnings` holds the CTA issues only,
 *   which the layout logs once each per page load (Req 17.12).
 */
export function validateSiteConfig(cfg: unknown, mode: BuildMode): ValidationResult {
  const issues: ValidationIssue[] = [];
  // Any `fixture` value, even a malformed one, marks a test build (DEC-05).
  const fixture = field(cfg, "fixture");
  if (fixture !== undefined) issues.push({ key: "fixture", reason: "fixture-config", value: fixture });
  const cta = field(cfg, "cta");
  for (const name of CTA_KEYS) {
    const issue = checkCtaDestination(`cta.${name}.destination`, field(field(cta, name), "destination"));
    if (issue) issues.push(issue);
  }
  issues.push(...checkNav(field(field(cfg, "nav"), "items")));
  const emblemKind = field(field(cfg, "emblem"), "kind");
  if (!RENDERABLE_EMBLEM_KINDS.includes(emblemKind)) {
    issues.push({ key: "emblem.kind", reason: "model-without-renderer", value: emblemKind });
  }

  if (mode === "production") return { ok: issues.length === 0, issues, warnings: [] };
  return { ok: true, issues, warnings: issues.filter((i) => i.key.startsWith("cta.")) };
}
