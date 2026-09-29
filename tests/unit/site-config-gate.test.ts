// Site_Config gate (task 5.2, DEC-03): mode selection, release throw and the
// inline warning script. Shipped-config and generated-config coverage lives in
// tasks 5.4 and 5.3.
import { describe, expect, it } from "vitest";
import {
  buildMode,
  runSiteConfigGate,
  SiteConfigReleaseError,
  warningScript,
} from "@/lib/site-config-gate";
import type { ValidationIssue } from "@/lib/site-config-schema";

const RELEASE = { PEYMAN_RELEASE: "1" };
const PREVIEW = {};

const cfg = (primary: unknown, secondary: unknown, extra: Record<string, unknown> = {}) => ({
  cta: { primary: { label: "P", destination: primary }, secondary: { label: "S", destination: secondary } },
  nav: { items: [] },
  emblem: { kind: "raster" },
  ...extra,
});

const pending = { kind: "pending", integration: "contact-feature", note: "n" };
const resolved = (href: string) => ({ kind: "resolved", href });

/** Runs the generated script with a captured console. */
function runScript(src: string): string[] {
  const logged: string[] = [];
  new Function("console", src)({ warn: (m: string) => logged.push(m) });
  return logged;
}

describe("buildMode", () => {
  it("is production only for PEYMAN_RELEASE=1", () => {
    expect(buildMode(RELEASE)).toBe("production");
    expect(buildMode(PREVIEW)).toBe("non-production");
    expect(buildMode({ PEYMAN_RELEASE: "true" })).toBe("non-production");
    expect(buildMode({ NODE_ENV: "production" })).toBe("non-production");
  });
});

describe("runSiteConfigGate", () => {
  it("returns one warning per offending CTA key outside release mode", () => {
    const warnings = runSiteConfigGate(cfg(pending, resolved("#")), PREVIEW);
    expect(warnings.map((w) => [w.key, w.reason])).toEqual([
      ["cta.primary.destination", "pending-integration"],
      ["cta.secondary.destination", "unresolved-cta"],
    ]);
  });

  it("does not warn about non-CTA issues outside release mode", () => {
    expect(runSiteConfigGate(cfg(resolved("/contact"), resolved("/advisory"), { emblem: { kind: "model" } }), PREVIEW)).toEqual([]);
  });

  it("throws in release mode naming every offending key", () => {
    const bad = cfg(resolved("mailto:inquiries@example.[domain]"), resolved("[tbd]"), {
      nav: { items: [{ id: "about", label: "About", status: "draft" }] },
      emblem: { kind: "model" },
    });
    let error: unknown;
    try {
      runSiteConfigGate(bad, RELEASE);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SiteConfigReleaseError);
    const message = (error as Error).message;
    for (const key of ["cta.primary.destination", "cta.secondary.destination", "nav.items[0].status", "emblem.kind"]) {
      expect(message).toContain(key);
    }
    expect((error as SiteConfigReleaseError).issues.map((i) => i.reason)).toEqual([
      "placeholder-email",
      "unresolved-cta",
      "invalid-nav-status",
      "model-without-renderer",
    ]);
  });

  it("passes in release mode when every destination is resolved", () => {
    expect(runSiteConfigGate(cfg(resolved("/contact"), resolved("https://example.test/advisory")), RELEASE)).toEqual([]);
  });

  it("rejects the javascript: scheme and missing destinations", () => {
    const warnings = runSiteConfigGate(cfg(resolved("javascript:alert(1)"), undefined), PREVIEW);
    expect(warnings.map((w) => w.reason)).toEqual(["unresolved-cta", "unresolved-cta"]);
  });
});

describe("warningScript", () => {
  it("emits nothing when there are no warnings", () => {
    expect(warningScript([])).toBeNull();
  });

  it("logs exactly one message per warning, naming the key", () => {
    const warnings = runSiteConfigGate(cfg(pending, { ...pending, integration: "advisory-feature" }), PREVIEW);
    const src = warningScript(warnings);
    expect(src).not.toBeNull();
    const logged = runScript(src!);
    expect(logged).toHaveLength(2);
    expect(logged[0]).toContain("cta.primary.destination");
    expect(logged[1]).toContain("cta.secondary.destination");
    expect(src!.length).toBeLessThan(300);
  });

  it("escapes values so they cannot close the script element", () => {
    const hostile: ValidationIssue = {
      key: "cta.primary.destination",
      reason: "unresolved-cta",
      value: "</script><script>alert(1)</script>&\u2028",
    };
    const src = warningScript([hostile])!;
    expect(src).not.toMatch(/[<>&\u2028\u2029]/);
    expect(runScript(src)[0]).toContain("</script><script>alert(1)</script>&\u2028");
  });
});
