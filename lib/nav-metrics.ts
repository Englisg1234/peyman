// Inline nav label boxes (CLS 0 on font swap).
//
// The inline nav is right-anchored, so any width change moves every link.
// Inter and its size-adjusted fallback differ by up to ~0.13em per label,
// which shifted the nav ~5 px when the preloaded font arrived after first
// paint. Each label therefore gets a fixed box in `em` (independent of the
// face), sized to the wider of the two faces plus a small margin, with the
// text start-aligned: neither box nor text start can move on swap.
//
// Measured at the type-cta inline size (16 px, weight 500, 0.02em tracking)
// with qa tooling. A label without an entry falls back to its natural width;
// tests/unit/nav.test.ts requires an entry for every shipped Nav_Item.
export const INLINE_NAV_EM: Readonly<Record<string, number>> = {
  Advisory: 4.45,
  Industries: 4.95,
  Intelligence: 5.76,
  Insights: 3.93,
  About: 3,
  Contact: 3.94,
  Recognition: 5.7,
};

export function inlineNavWidth(label: string): string | undefined {
  const em = INLINE_NAV_EM[label];
  return em === undefined ? undefined : `${em}em`;
}
