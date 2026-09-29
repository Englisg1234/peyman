// Release gate (task 5.2, DEC-03). Run by `npm run release:check`.
// Expected to FAIL until the Contact and Advisory features resolve
// cta.primary.destination and cta.secondary.destination (DEC-02).
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/data/site-config";
import { buildMode, runSiteConfigGate } from "@/lib/site-config-gate";

describe("Site_Config release gate (PEYMAN_RELEASE=1)", () => {
  it("runs in release mode", () => {
    expect(buildMode()).toBe("production");
  });

  it("has no pending integrations or placeholder values", () => {
    // The thrown message names every offending Site_Config key.
    expect(() => runSiteConfigGate(siteConfig)).not.toThrow();
  });
});
