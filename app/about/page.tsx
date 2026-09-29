import { Portrait } from "@/components/about/portrait";
import { ContactBand } from "@/components/sections/contact-band";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowLink } from "@/components/ui/arrow-link";
import { advantages, company, founder } from "@/data/company";
import { ecosystem } from "@/data/industries";
import { buildMetadata, personJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About",
  description: `${founder.name}, ${founder.credentials}, ${founder.role}. ${founder.intro}`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "About", href: "/about" }]}
        title="An advisory firm built on a binding agreement of trust."
        intro={`${company.nameMeaning.sentence} ${company.mission}`}
        aside={
          <dl className="facts">
            <div>
              <dt>Founded by</dt>
              <dd>{founder.name}</dd>
            </div>
            <div>
              <dt>Office</dt>
              <dd>{company.location.label}, India</dd>
            </div>
            <div>
              <dt>Disciplines</dt>
              <dd>Financial, legal, government, fundraising</dd>
            </div>
          </dl>
        }
      />
      <Section id="founder" labelledBy="founder-title">
        <div className="founder">
          <div className="sticky-col">
            <Portrait />
          </div>
          <div className="stack" data-gap="lg">
            <div className="stack" data-reveal="">
              <h2 id="founder-title" className="t-h2">
                {founder.name}
              </h2>
              <ul className="credentials" aria-label="Credentials and role">
                <li>{founder.credentials}</li>
                <li>{founder.role}</li>
              </ul>
            </div>
            <div className="prose" data-reveal="">
              <p style={{ fontSize: "1.1875rem", color: "var(--text)" }}>{founder.intro}</p>
              <p>{founder.record}</p>
              <p>{founder.leadership}</p>
              <p>{founder.stakeholders}</p>
            </div>
            <div data-reveal="">
              <h3 className="t-h4" id="record-title">
                Public-sector record, {founder.institution}
              </h3>
              <ul className="ticks" data-cols="2" aria-labelledby="record-title" style={{ marginBlockStart: "var(--s-4)" }}>
                {founder.ledger.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>
      <Section id="perspective" labelledBy="perspective-title" tone="paper">
        <SectionHeader
          id="perspective-title"
          title="What that experience brings to founders"
          intro={ecosystem.intro}
          action={<ArrowLink href="/recognition">Recognition</ArrowLink>}
        />
        <div className="principles">
          {advantages.map((a) => (
            <article key={a.id} className="principle" data-reveal="">
              <h3 className="t-h3">{a.title}</h3>
              <p className="t-body">{a.body}</p>
            </article>
          ))}
        </div>
      </Section>
      <ContactBand />
      <JsonLd
        data={personJsonLd({ name: founder.name, jobTitle: founder.role, description: founder.intro, knowsAbout: founder.disciplines })}
      />
    </>
  );
}
