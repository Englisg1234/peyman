import type { ReactNode } from "react";

export interface SectionHeaderProps {
  id: string;
  /** The heading names the topic itself; no eyebrow label above it. */
  title: ReactNode;
  intro?: ReactNode;
  /** Optional action (e.g. an ArrowLink) under the intro. */
  action?: ReactNode;
}

/** h2, intro and optional action in one readable column (never split across the page). */
export function SectionHeader({ id, title, intro, action }: SectionHeaderProps) {
  return (
    <header className="sec-head" data-reveal="">
      <h2 id={id} className="t-h2">
        {title}
      </h2>
      {intro && <p className="t-lede">{intro}</p>}
      {action}
    </header>
  );
}
