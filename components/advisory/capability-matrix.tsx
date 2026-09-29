import Link from "next/link";
import type { ServiceGroup } from "@/data/services";

export interface CapabilityMatrixProps {
  items: readonly ServiceGroup[];
}

/**
 * The four disciplines as a ruled table: title and mandate | scope (the
 * brief's sub-services). The service title is the link to its full scope on
 * /advisory, and covers the row, so there is no repeated "learn more" link.
 */
export function CapabilityMatrix({ items }: CapabilityMatrixProps) {
  return (
    <ul className="matrix">
      {items.map((s) => (
        <li key={s.id} className="matrix__row" data-reveal="">
          <div className="matrix__lead">
            <h3 className="t-h3">
              <Link className="cover-link matrix__link" href={`/advisory#${s.id}`}>
                {s.title}
                <svg className="matrix__arrow" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                  <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </Link>
            </h3>
            <p className="t-small">{s.summary}</p>
          </div>
          <ul className="matrix__scope" aria-label={`${s.title}: scope`}>
            {s.subServices.map((sub) => (
              <li key={sub.title}>{sub.title}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
