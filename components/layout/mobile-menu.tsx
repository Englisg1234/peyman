"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMenuMotion } from "@/components/motion/use-menu-motion";
import { inertOutside, trapTab } from "@/lib/focus-trap";
import { lockScroll } from "@/lib/scroll-lock";

/**
 * Mobile_Menu (design: Header system; Req 7.13, 8.1–8.14, 12.12, 17.6).
 * Client leaf in `.site-header__menu`, rendered only when Nav_Items exist.
 *
 * - Hydration (nojs-menu.tsx contract): `fallback` and the trigger share the
 *   slot's grid cell; `data-menu-ready` swaps their visibility (CLS 0), an
 *   open disclosure closes and focus on it moves to the trigger.
 * - `children` is server-rendered content (nav, Primary_CTA, location).
 * - Open: backdrop + dialog portal to `body`; in the same layout phase focus
 *   moves to the close control, the rest of `body` turns `inert` and scroll
 *   locks with zero horizontal shift.
 * - Close (Escape, close control, backdrop, live item, CTA): containment is
 *   released and focus returns to the trigger synchronously, before a link's
 *   default navigation, then the CSS fade plays. Planned items keep it open.
 *   Crossing to ≥ 1280 closes instantly and focuses the Brand_Mark.
 */
export interface MobileMenuProps {
  /** Dialog `id`, referenced by the trigger's `aria-controls`. */
  id: string;
  openLabel: string;
  closeLabel: string;
  dialogLabel: string;
  /** Stagger slot of the footer (CTA + location): min(item count, 6). */
  staggerCount: number;
  /** The no-JS `details` disclosure. */
  fallback: ReactNode;
  /** Menu content after the close control. */
  children: ReactNode;
}

const DESKTOP_QUERY = "(min-width: 80rem)";

export function MobileMenu({ id, openLabel, closeLabel, dialogLabel, staggerCount, fallback, children }: MobileMenuProps) {
  const { phase, open, close, onAnimationEnd } = useMenuMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const expanded = phase === "opening" || phase === "open";
  const mounted = phase !== "closed";

  /** Releases containment, moves focus, then starts the close. */
  const closeMenu = useCallback(
    (instant = false, focusTarget: HTMLElement | null | undefined = triggerRef.current) => {
      releaseRef.current?.();
      releaseRef.current = null;
      focusTarget?.focus({ preventScroll: true });
      close(instant);
    },
    [close],
  );

  useEffect(() => {
    const trigger = triggerRef.current;
    const slot = trigger?.closest<HTMLElement>("[data-menu-slot]");
    if (!trigger || !slot) return;
    const details = slot.querySelector("details");
    const hadFocus = details?.contains(document.activeElement) ?? false;
    if (details) details.open = false;
    slot.dataset.menuReady = "true";
    if (hadFocus) trigger.focus();
    return () => void delete slot.dataset.menuReady;
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (phase !== "opening" || releaseRef.current || !panel || !backdrop) return;
    closeRef.current?.focus({ preventScroll: true });
    const restoreInert = inertOutside([panel, backdrop]);
    const unlockScroll = lockScroll();
    releaseRef.current = () => {
      restoreInert();
      unlockScroll();
    };
  }, [phase]);

  useEffect(() => () => releaseRef.current?.(), []);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      } else if (panelRef.current) {
        trapTab(event, panelRef.current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, closeMenu]);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (!mq.matches) return;
      const brand = triggerRef.current?.closest("header")?.querySelector<HTMLElement>(".brand-mark");
      closeMenu(true, releaseRef.current ? brand : null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mounted, closeMenu]);

  const onPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest("a");
    if (link?.dataset.navStatus === "planned") event.preventDefault();
    else if (link?.hasAttribute("href")) closeMenu();
  };

  const layers = (
    <>
      <div ref={backdropRef} className="mobile-menu__backdrop" data-phase={phase} aria-hidden="true" onClick={() => closeMenu()} />
      <div ref={panelRef} id={id} role="dialog" aria-modal="true" aria-label={dialogLabel} className="mobile-menu__panel"
        data-phase={phase} inert={phase === "closing"} style={{ "--menu-count": staggerCount } as CSSProperties}
        onClick={onPanelClick} onAnimationEnd={onAnimationEnd}>
        <div className="mobile-menu__bar">
          <button ref={closeRef} type="button" className="mobile-menu__close" aria-label={closeLabel} onClick={() => closeMenu()}>
            <span className="menu-icon" data-icon="close" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </>
  );

  return (
    <>
      {fallback}
      <button ref={triggerRef} type="button" className="menu-trigger" aria-expanded={expanded} aria-controls={id}
        aria-label={expanded ? closeLabel : openLabel} onClick={() => open()}>
        <span className="menu-icon" aria-hidden="true" />
      </button>
      {mounted && createPortal(layers, document.body)}
    </>
  );
}
