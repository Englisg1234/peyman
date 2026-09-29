// Live-nav test fixture (task 8.3, DEC-05). Selected only when the build runs
// with PEYMAN_CONFIG_FIXTURE=nav-live (see data/site-config.ts); never shipped.
//
// The shipped config has zero live Nav_Items (DEC-01, DEC-04), so the inline
// nav, Mobile_Menu, focus trap and no-JS disclosure paths would be untestable.
// This fixture makes 3 items live and shows 1 planned item. Live hrefs point
// only at targets that already exist or are harmless, so no page is invented:
//   "/"     - the homepage itself
//   "#main" - main#main (app/layout.tsx)
//   "#top"  - the HTML-defined top-of-document fragment
//
// The `fixture` marker makes validateSiteConfig report `fixture-config`, so
// the release gate rejects any build that selects this fixture.
//
// The base config is passed in rather than imported, which keeps the import
// graph acyclic (data/site-config.ts imports this module).
import type { Href, NavId, NavItem, SiteConfig } from "@/lib/site-config-schema";

/** Live targets by Nav_Item id. Order here is the rendered order. */
const LIVE: ReadonlyArray<readonly [NavId, Href]> = [
  ["advisory", "/"],
  ["industries", "#main"],
  ["about", "#top"],
];

/** The one planned item kept visible via `showPlanned: true`. */
const PLANNED: NavId = "contact";

function labelOf(base: SiteConfig, id: NavId): string {
  const item = base.nav.items.find((i) => i.id === id);
  if (!item) throw new Error(`nav-live fixture: base config has no Nav_Item "${id}"`);
  return item.label;
}

/** Returns `base` with the live-nav fixture applied. Every other key is unchanged. */
export function withNavLiveFixture(base: SiteConfig): SiteConfig {
  const items: NavItem[] = [
    ...LIVE.map(([id, href]): NavItem => ({ id, label: labelOf(base, id), status: "live", href })),
    { id: PLANNED, label: labelOf(base, PLANNED), status: "planned" },
  ];
  return {
    ...base,
    fixture: "nav-live",
    nav: { ...base.nav, showPlanned: true, items },
  };
}
