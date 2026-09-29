// CTA destination resolution (DEC-02, task 5.1).
import type { CtaDestination, CtaIntegration, Href } from "./site-config-schema";

/** Documented placeholder fragments for pending integrations. In-page, never `#` alone. */
export const PENDING_CTA_HREF = {
  "contact-feature": "#pending-contact-feature",
  "advisory-feature": "#pending-advisory-feature",
} as const satisfies Record<CtaIntegration, Href>;

/**
 * Returns the href a CTA renders. Resolved destinations return their real href.
 * Pending destinations return an in-page placeholder fragment, so activation
 * never navigates away or 404s while the owning feature is missing.
 */
export function resolveCtaHref(dest: CtaDestination): Href {
  return dest.kind === "resolved" ? dest.href : PENDING_CTA_HREF[dest.integration];
}
