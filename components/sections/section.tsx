import type { ReactNode } from "react";

export type SectionTone = "ink" | "navy" | "panel" | "paper";

export interface SectionProps {
  id?: string;
  /** `id` of the heading that names this region. */
  labelledBy?: string;
  tone?: SectionTone;
  /** Hairline on the top edge (between two sections of the same tone). */
  rule?: boolean;
  /** Reduced vertical padding. */
  tight?: boolean;
  children: ReactNode;
}

/** Full-bleed tone band + the shared content wrap (Server Component). */
export function Section({ id, labelledBy, tone = "ink", rule, tight, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className="sec"
      data-tone={tone === "ink" ? undefined : tone}
      data-rule={rule ? "" : undefined}
      data-tight={tight ? "" : undefined}
    >
      <div className="wrap">{children}</div>
    </section>
  );
}
