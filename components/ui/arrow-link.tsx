import Link from "next/link";

export interface ArrowLinkProps {
  href: string;
  children: string;
  /** Visually hidden context completing the accessible name, e.g. the service. */
  context?: string;
  className?: string;
}

/** Text action with a gold underline and arrow. Internal routes via next/link. */
export function ArrowLink({ href, children, context, className }: ArrowLinkProps) {
  return (
    <Link href={href} className={["arrow-link", className].filter(Boolean).join(" ")}>
      <span className="arrow-link__label">
        {children}
        {context && <span className="sr-only">{`: ${context}`}</span>}
      </span>
      <svg className="arrow-link__icon" viewBox="0 0 16 10" fill="none" aria-hidden="true">
        <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </Link>
  );
}
