"use client";

/**
 * Last-resort error state, used only if the root layout itself fails. It
 * replaces the whole document, so it carries its own minimal inline styling
 * on the Peyman palette and uses a plain link (no client router needed).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#05070c", color: "#f4efe4", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "120px 24px", lineHeight: 1.6 }}>
          <p style={{ letterSpacing: "0.14em", fontSize: 13, color: "#d6ae72", textTransform: "uppercase" }}>Peyman Consulting</p>
          <h1 style={{ fontWeight: 400, fontSize: 36, lineHeight: 1.15, margin: "16px 0" }}>The site could not be displayed.</h1>
          <p style={{ color: "#b8b2a5" }}>A temporary problem stopped the page from loading. Please try again.</p>
          <p style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 32 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ minHeight: 48, padding: "0 24px", border: 0, background: "#c59655", color: "#05070c", font: "inherit", cursor: "pointer" }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ minHeight: 48, display: "inline-flex", alignItems: "center", color: "#f4efe4" }}>
              Go to the homepage
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
