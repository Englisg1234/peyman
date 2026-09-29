import { siteConfig } from "@/data/site-config";
import { resolveCtaHref } from "@/lib/cta";
import type { NavItem } from "@/lib/site-config-schema";
import { ButtonLink } from "@/components/ui/button-link";
import { NavList } from "./nav-list";

/**
 * No-JavaScript menu fallback (design: Header system, "No-JS"; Req 17.4–17.6).
 * Server Component, zero JS: a native `details`/`summary` disclosure, so
 * click, tap, Enter and Space all toggle it with no script (Req 17.5).
 *
 * Rendered by SiteHeader only when Nav_Items exist (DEC-01), inside the
 * `.site-header__menu` slot, which is `display: none` from 1280 px, where the
 * inline nav takes over (Req 7.13, 17.4). The summary is the visible text
 * "Menu" in a ≥ 44 × 44 hit area in the trigger position.
 *
 * Expanded, a panel fixed below the header reveals, in order:
 * - `nav` "Menu navigation" (distinct from the inline "Primary" nav) with
 *   every rendered Nav_Item in Site_Config order (`NavList` disclosure);
 * - the Primary_CTA.
 * It scrolls vertically within the viewport and never overflows horizontally.
 *
 * Hydration contract for task 8.5 (Req 17.6):
 * - SiteHeader passes this element as server-rendered `children` to the
 *   client `MobileMenu`, which renders its trigger in the SAME slot
 *   (`.site-header__menu`, a one-cell grid: every child sits in cell 1/1).
 * - After hydration `MobileMenu` sets `data-menu-ready="true"` on the slot.
 *   CSS then makes `[data-nojs-menu]` `visibility: hidden` (out of focus
 *   order, the accessibility tree and paint) while its box still sizes the
 *   cell, so the slot width, header height and CTA position do not change
 *   (CLS 0). It also closes the panel visually if it was open.
 * - If `document.activeElement` is the summary (`[data-nojs-menu-summary]`)
 *   at that moment, `MobileMenu` moves focus to its trigger.
 * - `MobileMenu` may unmount the disclosure instead, provided its trigger
 *   keeps the slot's inline size.
 */
export interface NojsMenuProps {
  /** Rendered Nav_Items in Site_Config order (non-empty; see DEC-01). */
  items: readonly NavItem[];
}

export function NojsMenu({ items }: NojsMenuProps) {
  const { nav, menu, cta } = siteConfig;

  return (
    <details className="nojs-menu" data-nojs-menu="">
      <summary className="nojs-menu__summary type-cta" data-nojs-menu-summary="">
        {menu.openLabel}
      </summary>
      <div className="nojs-menu__panel">
        <nav aria-label={nav.menuLabel} className="nojs-menu__nav">
          <NavList items={items} showPlanned={nav.showPlanned} plannedSuffix={nav.plannedSuffix} variant="disclosure" />
        </nav>
        <ButtonLink href={resolveCtaHref(cta.primary.destination)} variant="primary" align="start" className="nojs-menu__cta">
          {cta.primary.label}
        </ButtonLink>
      </div>
    </details>
  );
}
