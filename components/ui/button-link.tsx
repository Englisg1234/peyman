import type { Href } from "@/lib/site-config-schema";

/**
 * CTA link primitive (design: CTA system; Req 1.7, 3.3, 4.2, 10.8, 12.3).
 *
 * A server-rendered `<a href>`: no `role`, no handlers, no client code, so it
 * works without JavaScript. All visual states live in app/globals.css
 * (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-quiet`):
 *   - hover (hover-capable pointers) and press (`hover: none` + `:active`)
 *     fade an overlay layer's opacity over `--dur-micro`; color itself is
 *     never animated (Req 9.1);
 *   - `min-block-size` 48 / 52 (≥ 1024) / 44 (quiet), never a fixed height,
 *     so WCAG 1.4.12 overrides grow the button (Req 12.7);
 *   - forced colors: 1 px `ButtonText` border, `Highlight` focus (Req 12.8).
 */
export type ButtonLinkVariant = "primary" | "secondary" | "quiet";

/**
 * Label alignment inside the button. Sets `--btn-align`, which drives both
 * `justify-content` and `text-align`. A parent can instead set `--btn-align`
 * responsively (e.g. `start` below 768 px, `center` from 768 px) and leave
 * this prop unset.
 */
export type ButtonLinkAlign = "center" | "start";

export interface ButtonLinkProps {
  href: Href;
  variant: ButtonLinkVariant;
  /** The label, rendered verbatim (never transformed). */
  children: string;
  align?: ButtonLinkAlign;
  /** Layout hooks from the parent (width, grid placement). */
  className?: string;
}

const VARIANT_CLASS: Record<ButtonLinkVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  quiet: "btn-quiet",
};

export function ButtonLink({ href, variant, children, align, className }: ButtonLinkProps) {
  const classes = ["btn", VARIANT_CLASS[variant], "type-cta", className].filter(Boolean).join(" ");
  return (
    <a href={href} className={classes} data-align={align}>
      {children}
    </a>
  );
}
