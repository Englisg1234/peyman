import { ButtonLink } from "@/components/ui/button-link";
import type { ServiceGroup } from "@/data/services";

export interface ServiceDetailProps {
  service: ServiceGroup;
}

/**
 * One discipline: overview (brief summary + outcome), scope (verbatim
 * sub-services with their named instruments as deliverables), and the
 * engagement context (when founders bring this in) with a direct CTA.
 */
export function ServiceDetail({ service }: ServiceDetailProps) {
  const headingId = `${service.id}-title`;
  return (
    <section id={service.id} className="service" aria-labelledby={headingId}>
      <header className="service__head" data-reveal="">
        <h2 id={headingId} className="t-h2">
          {service.title}
        </h2>
        <p className="t-lede">{service.summary}</p>
        <p className="service__outcome">{service.outcome}</p>
      </header>
      <div className="service__body">
        <div data-reveal="">
          <h3 className="t-h4" style={{ marginBlockEnd: "var(--s-3)" }}>
            Scope of advisory
          </h3>
          <ul className="scope">
            {service.subServices.map((sub) => (
              <li key={sub.title}>
                <span className="t-h4" style={{ fontWeight: 500 }}>
                  {sub.title}
                </span>
                {sub.items && (
                  <ul className="scope__items" aria-label={`${sub.title}: deliverables`}>
                    {sub.items.map((item) => (
                      <li key={item} className="tag">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <aside className="engage-box" aria-label={`When to engage: ${service.short}`} data-reveal="">
          <h3 className="t-h4">When founders bring this in</h3>
          <ul className="ticks">
            {service.situations.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div style={{ marginBlockStart: "var(--s-2)" }}>
            <ButtonLink href={`/contact?interest=${service.id}`} variant="secondary">
              {`Discuss ${service.short}`}
            </ButtonLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
