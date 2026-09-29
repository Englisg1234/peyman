import type { ReactNode } from "react";

/**
 * Text that is exposed to assistive technology but not painted (for example
 * the " (coming soon)" suffix on planned Nav_Items, Req 7.8). Uses Tailwind's
 * `sr-only`, which clips to a 1 px box without `display: none` or
 * `visibility: hidden`, so the text stays in the accessibility tree.
 */
export interface VisuallyHiddenProps {
  children: ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return <span className="sr-only">{children}</span>;
}
