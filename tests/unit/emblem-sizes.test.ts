// Unit tests for the hero emblem `sizes` attribute (task 10.8; Req 5.2).
//
// HERO_EMBLEM_SIZES is resolved here the way a browser does: the first entry
// whose media condition matches wins, and the last entry has no condition.
// The small evaluator below supports exactly the query forms the string
// uses (`orientation`, `min-/max-width`, `min-/max-height` joined by `and`)
// and throws on anything else, so a new form cannot pass silently.
//
// At every Test_Viewport the resolved width must be 100–125% of the emblem
// width modelled by `computeHeroLayout()` (the layout oracle).
import { describe, expect, it } from "vitest";

import { HERO_EMBLEM_SIZES } from "@/lib/emblem-sizes";
import { computeHeroLayout } from "@/lib/layout-model";
import { TEST_VIEWPORTS } from "@/tests/e2e/support/viewports";

interface SizesEntry {
  /** Media feature tests; empty for the default (last) entry. */
  conditions: string[];
  /** Length: `NNpx` or `NNvw`. */
  length: string;
}

function parseSizes(sizes: string): SizesEntry[] {
  return sizes.split(",").map((raw) => {
    const entry = raw.trim();
    const cut = entry.lastIndexOf(" ");
    const length = cut < 0 ? entry : entry.slice(cut + 1);
    const condition = cut < 0 ? "" : entry.slice(0, cut).trim();
    const conditions = condition === "" ? [] : condition.split(/\s+and\s+/);
    return { conditions, length };
  });
}

/** One `(feature: value)` test against a CSS px viewport. */
function matchesFeature(feature: string, width: number, height: number): boolean {
  const m = feature.match(/^\(\s*([a-z-]+)\s*:\s*([a-z0-9.]+)\s*\)$/);
  if (!m) throw new Error(`Unsupported media feature syntax: ${feature}`);
  const [, name, value] = m;
  if (name === "orientation") {
    // CSS: portrait when height >= width, landscape otherwise.
    if (value === "landscape") return width > height;
    if (value === "portrait") return height >= width;
    throw new Error(`Unsupported orientation: ${value}`);
  }
  const px = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (!px) throw new Error(`Unsupported length in ${feature}`);
  const n = Number(px[1]);
  switch (name) {
    case "min-width":
      return width >= n;
    case "max-width":
      return width <= n;
    case "min-height":
      return height >= n;
    case "max-height":
      return height <= n;
    default:
      throw new Error(`Unsupported media feature: ${name}`);
  }
}

function lengthToPx(length: string, width: number): number {
  const m = length.match(/^(\d+(?:\.\d+)?)(px|vw)$/);
  if (!m) throw new Error(`Unsupported sizes length: ${length}`);
  const n = Number(m[1]);
  return m[2] === "px" ? n : (n * width) / 100;
}

/** The rendered-width hint a browser takes from `sizes` at this viewport. */
function resolveSizes(sizes: string, width: number, height: number): number {
  for (const { conditions, length } of parseSizes(sizes)) {
    if (conditions.every((c) => matchesFeature(c, width, height))) return lengthToPx(length, width);
  }
  throw new Error("No sizes entry matched (missing default entry)");
}

describe("sizes evaluator", () => {
  it("takes the first matching entry and falls back to the default", () => {
    const sizes = "(max-width: 500px) 100px, (orientation: landscape) and (max-height: 400px) 50vw, 300px";
    expect(resolveSizes(sizes, 400, 800)).toBe(100);
    expect(resolveSizes(sizes, 800, 400)).toBe(400);
    expect(resolveSizes(sizes, 800, 401)).toBe(300);
    expect(resolveSizes(sizes, 400, 400)).toBe(100);
  });

  it("treats a square viewport as portrait", () => {
    expect(matchesFeature("(orientation: landscape)", 500, 500)).toBe(false);
    expect(matchesFeature("(orientation: portrait)", 500, 500)).toBe(true);
  });

  it("rejects query forms it does not understand", () => {
    expect(() => resolveSizes("(min-resolution: 2dppx) 10px, 20px", 400, 800)).toThrow();
    expect(() => resolveSizes("(max-width: 40em) 10px, 20px", 400, 800)).toThrow();
    expect(() => resolveSizes("(max-width: 400px) 10rem, 20px", 400, 800)).toThrow();
  });
});

describe("HERO_EMBLEM_SIZES", () => {
  const entries = parseSizes(HERO_EMBLEM_SIZES);

  it("ends with an unconditional default entry and conditions everything else", () => {
    expect(entries.at(-1)!.conditions).toEqual([]);
    expect(entries.slice(0, -1).every((e) => e.conditions.length > 0)).toBe(true);
  });

  it.each(TEST_VIEWPORTS.map((v) => [v.name, v] as const))(
    "resolves to 100–125%% of the modelled emblem width at %s",
    (_name, v) => {
      const resolved = resolveSizes(HERO_EMBLEM_SIZES, v.width, v.height);
      const modelled = computeHeroLayout({ width: v.width, height: v.height }).emblem.w;
      const ratio = resolved / modelled;
      expect(modelled).toBeGreaterThan(0);
      expect(ratio).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(ratio).toBeLessThanOrEqual(1.25);
    },
  );
});
