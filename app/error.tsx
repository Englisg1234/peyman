"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Route error state (inside the site shell: header and footer stay usable).
 * Focus moves to the heading so screen reader and keyboard users land on the
 * message. `reset` re-renders the segment; the home link is the fallback.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    // Surfaced in the server/browser logs only; never shown to the visitor.
    console.error(error);
  }, [error]);

  return (
    <section className="page-head" aria-labelledby="error-title" style={{ minBlockSize: "70vh" }}>
      <div className="wrap">
        <div className="page-head__main" style={{ maxInlineSize: "46rem" }}>
          <p className="kicker kicker--accent">Something went wrong</p>
          <h1 id="error-title" ref={headingRef} tabIndex={-1} className="t-display">
            This page could not be displayed.
          </h1>
          <p className="t-lede">
            A temporary problem stopped the page from loading. Try again, or continue from the homepage.
            {error.digest ? ` Reference: ${error.digest}.` : ""}
          </p>
          <div className="actions" style={{ marginBlockStart: "var(--s-3)" }}>
            <button type="button" className="btn btn-primary type-cta" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/" className="btn btn-secondary type-cta">
              Go to the homepage
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
