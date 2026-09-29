"use client";

import { useEffect, useState } from "react";

export interface ServiceNavProps {
  items: ReadonlyArray<{ id: string; label: string }>;
}

/**
 * Sticky service index (≥ 1024 px). Plain anchors that work without JS;
 * after hydration an IntersectionObserver marks the section in view with
 * `aria-current="true"` (a gold bar, not color alone).
 */
export function ServiceNav({ items }: ServiceNavProps) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => e !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav className="service-nav" aria-label="Advisory services">
      <p className="kicker">On this page</p>
      <ul className="service-nav__list">
        {items.map((i) => (
          <li key={i.id}>
            <a className="service-nav__link" href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
