// Nav_Item selection (DEC-01, task 7.2; extended by task 8.1).
import type { NavItem, SiteConfig } from "./site-config-schema";

/**
 * The Nav_Items a navigation list renders, in the given (Site_Config) order:
 * every `live` item, plus `planned` items only when `showPlanned` is true
 * (Req 7.8, 7.9). Pure; shared by the header and by `NavList` so every
 * rendered list (inline, menu, disclosure) applies the same rule (Req 7.10).
 */
export function selectNavItems(items: readonly NavItem[], showPlanned: boolean): readonly NavItem[] {
  return items.filter((item) => item.status === "live" || (showPlanned && item.status === "planned"));
}

/**
 * The Nav_Items the Site_Header renders, in Site_Config order (Req 7.8, 7.9).
 *
 * An empty result is the zero-nav header state (DEC-01): Brand_Mark plus the
 * header CTA only, with no `nav` landmark, menu trigger or disclosure.
 */
export function renderedNavItems(cfg: Pick<SiteConfig, "nav">): readonly NavItem[] {
  return selectNavItems(cfg.nav.items, cfg.nav.showPlanned);
}
