import { siteConfig } from "@/data/site-config";
import { resolveCtaHref } from "@/lib/cta";
import { renderedNavItems } from "@/lib/nav";
import { ButtonLink } from "@/components/ui/button-link";
import { BrandMark } from "./brand-mark";
import { HeaderScrollState } from "./header-scroll-state";
import { MobileMenu } from "./mobile-menu";
import { NavList } from "./nav-list";
import { NojsMenu } from "./nojs-menu";

const HEADER_ID = "site-header";
const MENU_ID = "mobile-menu";
/** Stagger slots (40 ms apart) before the footer joins: the open sequence stays ≤ 560 ms (Req 8.9). */
const MAX_STAGGER = 6;

/**
 * Site_Header shell (design: Header system; Req 7.1–7.3, 7.6, 7.7, 7.12,
 * 7.14, 7.15, 10.11, 12.4, 12.5, 19.5). Server Component, no client code.
 *
 * DOM and focus order (Req 7.1, 12.5): skip link, Brand_Mark, [inline nav],
 * header CTA, [menu trigger]. The bracketed zones exist only when Nav_Items
 * render (tasks 8.1, 8.4, 8.5). The Mobile_Menu dialog itself is portaled to
 * `body`, after `main`, while open.
 *
 * - Fixed at z 50, height `--header-h` (64 / 72 / 56 px) plus
 *   `env(safe-area-inset-top)`, constant across scroll (Req 7.2).
 * - The skip link is the first focusable element in the document. It stays in
 *   the accessibility tree, is visually hidden until focused, then shows at
 *   z 100 (Req 7.14). It targets `main#main` (tabIndex -1), so activation
 *   moves focus there with no script (Req 7.15).
 * - The header CTA reuses the Primary_CTA label and destination, in the quiet
 *   (outline) style so the Hero Primary_CTA stays the one gold focal point.
 *   `display: none` below 768 removes it from display, focus order and the
 *   accessibility tree (Req 7.6, 7.7).
 * - The scrolled state is a separate `aria-hidden` surface layer whose opacity
 *   is driven by `data-scrolled="true"` on the header, set by the
 *   HeaderScrollState IO sentinel rendered right after the header (task 7.3).
 *   Default: transparent, no blur, no hairline (Req 7.3).
 *
 * DEC-01: when no Nav_Item renders (the v1 default, `showPlanned: false`
 * with every item planned), the header is Brand_Mark plus header CTA only.
 * There is no `nav` landmark, no menu trigger and no `details` disclosure.
 * Below 768 px the Hero Primary_CTA is the mobile action.
 */
export interface SiteHeaderProps {
  /** True when rendered for `/`; passed to Brand_Mark as `aria-current` (Req 7.11). */
  current?: boolean;
  /** Pathname of the current route, for nav `aria-current` (e.g. "/advisory"). */
  currentPath?: string;
}

export function SiteHeader({ current = false, currentPath }: SiteHeaderProps) {
  const { skipLink, cta, nav, menu } = siteConfig;
  const navItems = renderedNavItems(siteConfig);
  const ctaHref = resolveCtaHref(cta.primary.destination);

  return (
    <>
      <header id={HEADER_ID} className="site-header" data-nav={navItems.length > 0 ? "items" : "none"}>
        <a className="skip-link type-cta" href="#main">
          {skipLink}
        </a>
        <div className="site-header__surface" aria-hidden="true" />
        <div className="site-header__inner">
          {/* `data-intro="brand"`: CSS intro fade hook (task 15.1). On this
              wrapper, never on the header, which must keep opacity 1 for the
              scrolled surface's backdrop blur. */}
          <div className="site-header__brand" data-intro="brand">
            <BrandMark current={current} />
          </div>
          {/* Inline nav (Req 7.5, 7.13): `display: none` below 1280, so it is
              out of display, focus order and the accessibility tree there. */}
          {navItems.length > 0 && (
            <nav aria-label={nav.label} className="site-header__nav">
              <NavList items={navItems} showPlanned={nav.showPlanned} plannedSuffix={nav.plannedSuffix} variant="inline" currentPath={currentPath} />
            </nav>
          )}
          <div className="site-header__actions">
            <ButtonLink href={ctaHref} variant="quiet" className="site-header__cta">
              {cta.primary.label}
            </ButtonLink>
            {/* Menu slot (< 1280, only with Nav_Items). The no-JS disclosure
                (Req 17.4) is the MobileMenu fallback; after hydration the
                trigger takes its place in the same cell (contract in
                nojs-menu.tsx). The menu content is rendered here, on the
                server, and passed as children, so the client leaf stays tiny. */}
            {navItems.length > 0 && (
              <div className="site-header__menu" data-menu-slot="">
                <MobileMenu
                  id={MENU_ID}
                  openLabel={menu.openLabel}
                  closeLabel={menu.closeLabel}
                  dialogLabel={menu.dialogLabel}
                  staggerCount={Math.min(navItems.length, MAX_STAGGER)}
                  fallback={<NojsMenu items={navItems} />}
                >
                  <nav aria-label={nav.menuLabel} className="mobile-menu__nav">
                    <NavList items={navItems} showPlanned={nav.showPlanned} plannedSuffix={nav.plannedSuffix} variant="menu" currentPath={currentPath} />
                  </nav>
                  <div className="mobile-menu__footer">
                    <ButtonLink href={ctaHref} variant="primary" align="start" className="mobile-menu__cta">
                      {cta.primary.label}
                    </ButtonLink>
                    <p className="mobile-menu__location type-meta">{menu.location}</p>
                  </div>
                </MobileMenu>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Sibling, not child: inside the fixed header the sentinel would be
          viewport-anchored. Not focusable, so the skip link stays first. */}
      <HeaderScrollState headerId={HEADER_ID} />
    </>
  );
}
