import { ButtonLink } from "@/components/ui/button-link";
import { siteConfig } from "@/data/site-config";
import { resolveCtaHref } from "@/lib/cta";

/**
 * Hero CTA group (design: CTA system; Req 1.5, 1.6, 1.7, 1.8, 3.4, 10.5,
 * 11.6, 11.8).
 *
 * Renders the Primary_CTA then the Secondary_CTA, in that DOM (and tab)
 * order. Labels come from `cta.*.label` and hrefs from `resolveCtaHref()`,
 * so connecting the Contact or Advisory feature is a Site_Config change only
 * (DEC-02). The component holds no copy literals.
 *
 * Layout lives in app/globals.css (`.cta-group`), mirroring `layoutCtas()`
 * in lib/layout-model.ts:
 *   - below 768: stacked, full text-block width, 12 px apart, labels
 *     start-aligned (`--btn-align: start`);
 *   - from 768: one row, 16 px apart, wrapping to a second row 12 px below
 *     when both do not fit (text-spacing overrides), labels centered.
 *
 * `data-intro="cta"` is the hook for the CSS intro (task 15.1;
 * `IntroTarget` in lib/motion-tokens.ts). The group is never made
 * non-interactive: no `inert`, `aria-hidden`, `visibility: hidden` or
 * `pointer-events: none` (Req 1.8). `:focus-within` cancels the intro so a
 * focused CTA is fully visible.
 */
export interface HeroActionsProps {
  /** Layout hooks from the Hero grid (placement only). */
  className?: string;
}

export function HeroActions({ className }: HeroActionsProps) {
  const { primary, secondary } = siteConfig.cta;
  const classes = ["cta-group", className].filter(Boolean).join(" ");
  return (
    <div className={classes} data-intro="cta">
      <ButtonLink href={resolveCtaHref(primary.destination)} variant="primary">
        {primary.label}
      </ButtonLink>
      <ButtonLink href={resolveCtaHref(secondary.destination)} variant="secondary">
        {secondary.label}
      </ButtonLink>
    </div>
  );
}
