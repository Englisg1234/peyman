// Feature: cinematic-hero, Property 8: Nav rendering follows status and showPlanned
// **Validates: Requirements 7.8, 7.9, 7.10, 8.14**
//
// For any subset of Nav_Items in any order, any live/planned statuses, any
// `showPlanned` flag and each variant, the NavList markup contains exactly the
// live items plus (when `showPlanned`) the planned items, in input order. Live
// items carry exactly one href equal to their target; planned items carry none,
// are aria-disabled and their accessible name ends in the planned suffix.
// Markup is rendered with react-dom/server (Node env, no DOM) and parsed.
import fc from "fast-check";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NavList, type NavListVariant } from "@/components/layout/nav-list";
import { selectNavItems } from "@/lib/nav";
import type { Href, NavId, NavItem } from "@/lib/site-config-schema";

const NAV: ReadonlyArray<{ id: NavId; label: string }> = [
  { id: "advisory", label: "Advisory" },
  { id: "industries", label: "Industries" },
  { id: "intelligence", label: "Intelligence" },
  { id: "insights", label: "Insights" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];
const VARIANTS: readonly NavListVariant[] = ["inline", "menu", "disclosure"];
const SUFFIX = "(coming soon)";
// futureHref values carry a marker that live hrefs can never contain, so any
// leak of planned metadata into the markup is detectable.
const FUTURE_MARKER = "__future__";

/** A live href: `/…` or `#…` over a markup-safe alphabet (no escaping needed). */
const liveHrefArb: fc.Arbitrary<Href> = fc
  .tuple(fc.constantFrom("/", "#"), fc.stringMatching(/^[a-z0-9-]{0,16}$/))
  .map(([prefix, rest]) => `${prefix}${rest}` as Href);

const futureHrefArb: fc.Arbitrary<Href> = fc
  .stringMatching(/^[a-z0-9-]{0,12}$/)
  .map((rest) => `/${FUTURE_MARKER}/${rest}` as Href);

function itemArb({ id, label }: { id: NavId; label: string }): fc.Arbitrary<NavItem> {
  return fc.oneof(
    liveHrefArb.map((href): NavItem => ({ id, label, status: "live", href })),
    fc
      .option(futureHrefArb, { nil: undefined })
      .map((futureHref): NavItem =>
        futureHref === undefined ? { id, label, status: "planned" } : { id, label, status: "planned", futureHref },
      ),
  );
}

/** Subsets in Site_Config order (subarray) or any order (shuffledSubarray). */
const itemsArb: fc.Arbitrary<NavItem[]> = fc
  .oneof(fc.subarray([...NAV]), fc.shuffledSubarray([...NAV]))
  .chain((entries) => fc.tuple(...entries.map(itemArb)));

interface ParsedItem {
  anchor: string;
  text: string;
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function parseItems(html: string): ParsedItem[] {
  // Inline items may carry a `--nav-w` style (lib/nav-metrics.ts).
  return [...html.matchAll(/<li class="nav-list__item"[^>]*>([\s\S]*?)<\/li>/g)].map(([, inner]) => ({
    anchor: inner.match(/<a\b[^>]*>/)?.[0] ?? "",
    text: inner.replace(/<[^>]*>/g, ""),
  }));
}

describe("Property 8: Nav rendering follows status and showPlanned", () => {
  it("renders exactly the selected items, in order, with correct href semantics", () => {
    fc.assert(
      fc.property(itemsArb, fc.boolean(), fc.constantFrom(...VARIANTS), (items, showPlanned, variant) => {
        const html = renderToStaticMarkup(
          <NavList items={items} showPlanned={showPlanned} plannedSuffix={SUFFIX} variant={variant} />,
        );
        const expected = items.filter((i) => i.status === "live" || showPlanned);

        // The shared selection helper applies the same rule (Req 7.10).
        expect(selectNavItems(items, showPlanned)).toEqual(expected);

        // Planned metadata never reaches the markup.
        expect(html).not.toContain(FUTURE_MARKER);

        if (expected.length === 0) {
          // Nothing to render: no list at all (no empty landmark content).
          expect(html).toBe("");
          return;
        }

        expect(html.match(/<ul\b/g)).toHaveLength(1);
        expect(attr(html.match(/<ul\b[^>]*>/)![0], "data-variant")).toBe(variant);

        // One href per live item, none for planned items.
        const liveCount = expected.filter((i) => i.status === "live").length;
        expect(html.match(/\shref="/g)?.length ?? 0).toBe(liveCount);

        const parsed = parseItems(html);
        expect(parsed).toHaveLength(expected.length);

        expected.forEach((item, idx) => {
          const { anchor, text } = parsed[idx];
          expect(attr(anchor, "data-nav-status")).toBe(item.status);
          if (item.status === "live") {
            expect(anchor.match(/\shref="/g)).toHaveLength(1);
            expect(attr(anchor, "href")).toBe(item.href);
            expect(attr(anchor, "aria-disabled")).toBeUndefined();
            expect(text).toBe(item.label);
          } else {
            expect(attr(anchor, "href")).toBeUndefined();
            expect(attr(anchor, "aria-disabled")).toBe("true");
            expect(text.startsWith(item.label)).toBe(true);
            expect(text.trimEnd().endsWith(SUFFIX)).toBe(true);
          }
        });
      }),
    );
  });
});
