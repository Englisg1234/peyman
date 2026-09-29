"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Header scroll state (design: Header system; Req 7.3, 7.4, 17.10).
 *
 * Renders a 25 px sentinel at the top of the document and toggles
 * `data-scrolled="true"` on the Site_Header when the page scrolls past 24 px.
 * One IntersectionObserver, no scroll listener, no layout reads per frame.
 * The CSS in app/globals.css fades the header surface layer on that attribute.
 *
 * The sentinel must be a sibling of the fixed header, not a child: a fixed
 * ancestor would become its containing block and pin it to the viewport.
 * `body` is unpositioned, so `top: 0` resolves against the document.
 *
 * Threshold geometry: the root is inset 1 px from the top, so the sentinel
 * (0–25 px) intersects the root, edge-adjacent included, while its bottom is
 * at viewport y ≥ 1, that is scrollY ≤ 24. At scrollY > 24 (fractional values
 * included) it stops intersecting and the header switches to the scrolled
 * state. The observer's initial callback sets the right state when the page
 * loads mid-scroll (reload, anchor, bfcache). SSR renders the top state.
 */
const sentinelStyle: CSSProperties = {
  position: "absolute",
  insetBlockStart: 0,
  insetInlineStart: 0,
  inlineSize: 1,
  blockSize: 25,
  pointerEvents: "none",
};

export interface HeaderScrollStateProps {
  /** `id` of the header element that receives `data-scrolled`. */
  headerId: string;
}

export function HeaderScrollState({ headerId }: HeaderScrollStateProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const header = document.getElementById(headerId);
    if (!sentinel || !header || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry.isIntersecting) header.removeAttribute("data-scrolled");
        else header.setAttribute("data-scrolled", "true");
      },
      { rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      header.removeAttribute("data-scrolled");
    };
  }, [headerId]);

  return <div ref={sentinelRef} aria-hidden="true" data-header-sentinel="" style={sentinelStyle} />;
}
