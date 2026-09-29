import Link from "next/link";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { ArrowLink } from "@/components/ui/arrow-link";
import { audiences } from "@/data/industries";
import { services } from "@/data/services";

/**
 * "Can Peyman help my situation?" Who the firm supports, then concrete
 * situations (the brief's sub-services, phrased as moments) linked to the
 * discipline that handles them.
 */
export function WhoWeSupport() {
  const situations = services.flatMap((s) => s.situations.slice(0, 1).map((text) => ({ text, service: s })));
  return (
    <Section id="who-we-support" labelledBy="support-title">
      <SectionHeader
        id="support-title"
        title="Who Peyman supports"
        intro="Ventures at the point where capital, law and government meet."
        action={<ArrowLink href="/industries">Who we work with</ArrowLink>}
      />
      <div className="audience-row">
        {audiences.map((a) => (
          <article key={a.id} className="audience" data-reveal="">
            <h3 className="t-h3">{a.title}</h3>
            <p className="t-small">{a.body}</p>
          </article>
        ))}
      </div>
      <h3 className="t-h4" style={{ marginBlockStart: "var(--s-8)" }} id="situations-title">
        Situations we are brought in for
      </h3>
      <ul className="situations" aria-labelledby="situations-title" style={{ marginBlockStart: "var(--s-4)" }}>
        {situations.map(({ text, service }) => (
          <li key={text} className="situation" data-reveal="">
            <span className="situation__text">{text}</span>
            <Link className="situation__link" href={`/advisory#${service.id}`}>
              {service.short}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
