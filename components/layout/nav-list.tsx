import type { CSSProperties } from "react";
import { selectNavItems } from "@/lib/nav";
import { inlineNavWidth } from "@/lib/nav-metrics";
import type { NavItem } from "@/lib/site-config-schema";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

/**
 * Nav_Item list (design: Header system; Req 7.5, 7.8, 7.9, 7.10, 7.13, 8.14).
 * Server Component, no handlers, so it renders identically with or without
 * JavaScript and can be passed as server-rendered children to client leaves.
 *
 * Renders only the `<ul>`; the caller owns the `nav` landmark and its name
 * ("Primary" inline, "Menu navigation" in the Mobile_Menu), so an empty list
 * never produces an empty landmark. With no rendered items it returns `null`.
 *
 * - Live items: `<a href>` with the Site_Config target, exactly one href each.
 * - Planned items (only when `showPlanned`): `<a role="link"
 *   aria-disabled="true" tabIndex={0}>` with NO href. Chosen because it
 *   keeps link semantics beside the live links and needs no script: an
 *   anchor without href has no activation behavior, so click, tap and Enter
 *   do nothing natively. The URL is unchanged, focus stays on the item and,
 *   in the Mobile_Menu, nothing bubbles a navigation that would close it.
 *   Space never activates links; its only native effect is page scrolling,
 *   which the Mobile_Menu's scroll lock suppresses (task 8.5).
 *   The visible label is ivory-300; the visually hidden suffix completes the
 *   accessible name, e.g. "Advisory (coming soon)".
 * - `data-nav-status` lets client leaves (task 8.5) delegate clicks: a live
 *   item closes the menu, a planned item keeps it open.
 */
export type NavListVariant = "inline" | "menu" | "disclosure";

export interface NavListProps {
  /** Nav_Items in Site_Config order. */
  items: readonly NavItem[];
  /** Site_Config `nav.showPlanned`. */
  showPlanned: boolean;
  /** Site_Config `nav.plannedSuffix`, e.g. "(coming soon)". */
  plannedSuffix: string;
  variant: NavListVariant;
  className?: string;
  /** Pathname of the current route; the live item whose href matches (or prefixes it) gets `aria-current="page"`. */
  currentPath?: string;
}

const isCurrent = (href: string, path: string | undefined) =>
  path !== undefined && href.startsWith("/") && href !== "/" && (path === href || path.startsWith(`${href}/`));

const VARIANT_CLASS: Record<NavListVariant, string> = {
  inline: "nav-list--inline type-cta",
  menu: "nav-list--menu type-menu",
  disclosure: "nav-list--disclosure type-cta",
};

export function NavList({ items, showPlanned, plannedSuffix, variant, className, currentPath }: NavListProps) {
  const rendered = selectNavItems(items, showPlanned);
  if (rendered.length === 0) return null;

  const classes = ["nav-list", VARIANT_CLASS[variant], className].filter(Boolean).join(" ");

  return (
    <ul className={classes} data-variant={variant}>
      {rendered.map((item) => (
        <li key={item.id} className="nav-list__item"
          style={variant === "inline" ? ({ "--nav-w": inlineNavWidth(item.label) } as CSSProperties) : undefined}>
          {item.status === "live" ? (
            <a className="nav-link" href={item.href} data-nav-status="live"
              aria-current={isCurrent(item.href, currentPath) ? "page" : undefined}>
              {item.label}
            </a>
          ) : (
            <a className="nav-link" role="link" aria-disabled="true" tabIndex={0} data-nav-status="planned">
              {item.label}
              <VisuallyHidden>{` ${plannedSuffix}`}</VisuallyHidden>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
