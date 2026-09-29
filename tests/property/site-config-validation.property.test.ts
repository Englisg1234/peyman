// Feature: cinematic-hero, Property 9: Site_Config validation reports exactly the offending keys
// **Validates: Requirements 14.5, 14.6, 17.12, 19.7**
//
// For any generated Site_Config (valid values mixed with pending destinations,
// empty, `#`, bracket-token and disallowed-scheme CTA hrefs, bracket-domain
// emails, invalid nav statuses and `emblem.kind` variants):
//   - production: `ok` is false iff at least one offending key exists, and
//     `issues` lists exactly the offending keys, one issue per key;
//   - non-production: `ok` is always true, `issues` is the same set, and
//     `warnings` holds exactly one entry per offending CTA key.
//
// Every generated value carries the reason it is expected to produce (or
// `null`), so the oracle never re-implements the validator's checks.
//
// Fixture configs (task 8.3, DEC-05) are out of scope: no fixture marker is
// generated, the fixture env var is cleared, and any fixture marker key the
// schema module exports is stripped from the base config.
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteConfig } from "@/data/site-config";
import * as schema from "@/lib/site-config-schema";
import { validateSiteConfig, type ValidationReason } from "@/lib/site-config-schema";

type Expected = ValidationReason | null;
interface Gen<T> {
  readonly value: T;
  readonly expected: Expected;
}

const FIXTURE_ENV = "PEYMAN_CONFIG_FIXTURE";
let savedFixtureEnv: string | undefined;
beforeAll(() => {
  savedFixtureEnv = process.env[FIXTURE_ENV];
  delete process.env[FIXTURE_ENV];
});
afterAll(() => {
  if (savedFixtureEnv !== undefined) process.env[FIXTURE_ENV] = savedFixtureEnv;
});

/** Keys that could mark a config as a fixture: any `*fixture*` key, plus marker names the schema exports. */
function fixtureMarkerKeys(): Set<string> {
  const keys = new Set<string>(Object.keys(siteConfig).filter((k) => /fixture/i.test(k)));
  for (const [name, value] of Object.entries(schema)) {
    if (/fixture/i.test(name) && typeof value === "string") keys.add(value);
  }
  return keys;
}

/** The shipped config minus any fixture marker, as a plain record. */
function baseConfig(): Record<string, unknown> {
  const base: Record<string, unknown> = { ...siteConfig };
  for (const key of fixtureMarkerKeys()) delete base[key];
  return base;
}

// ---------------------------------------------------------------------------
// Href building blocks (no brackets, no whitespace)
// ---------------------------------------------------------------------------

const word = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/);
const path = fc.array(word, { maxLength: 3 }).map((parts) => parts.join("/"));
const bracketToken = fc.stringMatching(/^\[[a-z]{1,8}\]$/);

const validHref = fc.oneof(
  path.map((p) => `/${p}`),
  word.map((w) => `#${w}`),
  fc.tuple(word, word, word).map(([l, d, t]) => `mailto:${l}@${d}.${t}`),
  fc.tuple(word, word, path).map(([h, t, p]) => `https://${h}.${t}/${p}`),
);

// ---------------------------------------------------------------------------
// CTA destinations, each tagged with the reason it must produce
// ---------------------------------------------------------------------------

const pendingDest: fc.Arbitrary<Gen<unknown>> = fc
  .record({
    kind: fc.constant("pending"),
    integration: fc.constantFrom("contact-feature", "advisory-feature"),
    note: fc.string({ maxLength: 20 }),
  })
  .map((value) => ({ value, expected: "pending-integration" as const }));

const resolved = (href: fc.Arbitrary<string>, expected: Expected): fc.Arbitrary<Gen<unknown>> =>
  href.map((h) => ({ value: { kind: "resolved", href: h }, expected }));

const emptyHref = fc.constantFrom("", " ", "   ", "\t");
const hashHref = fc.constantFrom("#", " #", "# ", " # ");
const bracketHref = fc.oneof(
  bracketToken,
  fc.tuple(path, bracketToken).map(([p, b]) => `/${p}${b}`),
  fc.tuple(bracketToken, word).map(([b, w]) => `https://${b}.${w}/`),
  fc.tuple(bracketToken, word, word).map(([b, d, t]) => `mailto:${b}@${d}.${t}`), // bracket in local part only
  fc.tuple(word, bracketToken).map(([w, b]) => `#${w}${b}`),
);
const placeholderEmail = fc
  .tuple(
    fc.constantFrom("mailto:", "MAILTO:", "Mailto:"),
    word,
    fc.oneof(
      bracketToken,
      fc.tuple(word, bracketToken).map(([d, b]) => `${d}.${b}`),
      fc.tuple(bracketToken, word).map(([b, t]) => `${b}.${t}`),
    ),
    fc.constantFrom("", "?subject=hello"),
  )
  .map(([scheme, local, domain, query]) => `${scheme}${local}@${domain}${query}`);
const disallowedScheme = fc.oneof(
  fc.constantFrom("javascript:alert(1)", "JavaScript:void(0)", "data:text/html,x", "tel:+10000000000", "ftp://example.test"),
  fc.tuple(word, path).map(([h, p]) => `http://${h}.test/${p}`),
  word.map((w) => `${w}.html`), // relative, no leading slash
);
const malformedDest: fc.Arbitrary<Gen<unknown>> = fc
  .constantFrom<unknown>(
    undefined,
    null,
    "/contact",
    42,
    {},
    { kind: "resolved" },
    { kind: "resolved", href: 42 },
    { kind: "resolved", href: null },
    { kind: "other", href: "/contact" },
    { href: "/contact" },
  )
  .map((value) => ({ value, expected: "unresolved-cta" as const }));

const ctaDest: fc.Arbitrary<Gen<unknown>> = fc.oneof(
  resolved(validHref, null),
  pendingDest,
  resolved(emptyHref, "unresolved-cta"),
  resolved(hashHref, "unresolved-cta"),
  resolved(bracketHref, "unresolved-cta"),
  resolved(placeholderEmail, "placeholder-email"),
  resolved(disallowedScheme, "unresolved-cta"),
  malformedDest,
);

/** A CTA entry, or (rarely) a missing entry, which has no destination. */
const ctaEntry = (label: string): fc.Arbitrary<Gen<unknown>> =>
  fc.oneof(
    { weight: 9, arbitrary: ctaDest.map((d) => ({ value: { label, destination: d.value }, expected: d.expected })) },
    { weight: 1, arbitrary: fc.constant<Gen<unknown>>({ value: undefined, expected: "unresolved-cta" }) },
  );

// ---------------------------------------------------------------------------
// Nav items and emblem kind
// ---------------------------------------------------------------------------

interface NavGen {
  readonly value: unknown;
  /** Expected issue for this item: which sub-key and reason, or null. */
  readonly expected: null | { readonly sub: "status" | "href"; readonly reason: ValidationReason };
}

const navId = fc.constantFrom("advisory", "industries", "intelligence", "insights", "about", "contact");
const navLabel = fc.constantFrom("Advisory", "Industries", "Intelligence", "Insights", "About", "Contact");

const navItem: fc.Arbitrary<NavGen> = fc.oneof(
  fc
    .record({ id: navId, label: navLabel, status: fc.constant("live"), href: validHref })
    .map((value) => ({ value, expected: null })),
  fc
    .record({ id: navId, label: navLabel, status: fc.constant("planned") })
    .map((value) => ({ value, expected: null })),
  fc
    .record({ id: navId, label: navLabel, status: fc.constant("live"), href: placeholderEmail })
    .map((value) => ({ value, expected: { sub: "href", reason: "placeholder-email" } as const })),
  fc
    .record({
      id: navId,
      label: navLabel,
      status: fc.constantFrom<unknown>("draft", "", "LIVE", "Planned", "hidden", null, 1, undefined),
      href: fc.option(fc.oneof(validHref, placeholderEmail), { nil: undefined }),
    })
    .map((value) => ({ value, expected: { sub: "status", reason: "invalid-nav-status" } as const })),
);

const emblemKind: fc.Arbitrary<Gen<unknown>> = fc.oneof(
  fc.constant<Gen<unknown>>({ value: "raster", expected: null }),
  fc
    .constantFrom<unknown>("model", "", "Raster", "svg", "webgl", null, undefined, 0)
    .map((value) => ({ value, expected: "model-without-renderer" as const })),
);

// ---------------------------------------------------------------------------
// Whole config + independent oracle
// ---------------------------------------------------------------------------

interface Case {
  readonly cfg: Record<string, unknown>;
  /** Sorted `key|reason` strings for every offending key. */
  readonly expected: readonly string[];
}

const configCase: fc.Arbitrary<Case> = fc
  .record({
    primary: ctaEntry("Start a Conversation"),
    secondary: ctaEntry("Explore Advisory"),
    nav: fc.array(navItem, { maxLength: 8 }),
    emblem: emblemKind,
  })
  .map(({ primary, secondary, nav, emblem }) => {
    const base = baseConfig();
    const cfg: Record<string, unknown> = {
      ...base,
      cta: { primary: primary.value, secondary: secondary.value },
      nav: { ...(base.nav as object), items: nav.map((n) => n.value) },
      emblem: { ...(base.emblem as object), kind: emblem.value },
    };
    const expected: string[] = [];
    if (primary.expected) expected.push(`cta.primary.destination|${primary.expected}`);
    if (secondary.expected) expected.push(`cta.secondary.destination|${secondary.expected}`);
    nav.forEach((n, i) => {
      if (n.expected) expected.push(`nav.items[${i}].${n.expected.sub}|${n.expected.reason}`);
    });
    if (emblem.expected) expected.push(`emblem.kind|${emblem.expected}`);
    return { cfg, expected: expected.sort() };
  });

const keyed = (issues: readonly { key: string; reason: string }[]) => issues.map((i) => `${i.key}|${i.reason}`).sort();

describe("Property 9: Site_Config validation reports exactly the offending keys", () => {
  it("production mode: ok iff no issues, issues are exactly the offending keys", () => {
    fc.assert(
      fc.property(configCase, ({ cfg, expected }) => {
        const result = validateSiteConfig(cfg, "production");
        expect(keyed(result.issues)).toEqual(expected);
        const keys = result.issues.map((i) => i.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(result.ok).toBe(expected.length === 0);
        expect(result.warnings).toEqual([]);
      }),
    );
  });

  it("non-production mode: always ok, one warning per offending CTA key", () => {
    fc.assert(
      fc.property(configCase, ({ cfg, expected }) => {
        const result = validateSiteConfig(cfg, "non-production");
        expect(result.ok).toBe(true);
        expect(keyed(result.issues)).toEqual(expected);
        expect(keyed(result.warnings)).toEqual(expected.filter((e) => e.startsWith("cta.")));
        const warningKeys = result.warnings.map((w) => w.key);
        expect(new Set(warningKeys).size).toBe(warningKeys.length);
      }),
    );
  });
});
