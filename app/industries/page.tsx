import Link from "next/link";
import { ContactBand } from "@/components/sections/contact-band";
import { JumpList } from "@/components/sections/jump-list";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { audiences, ecosystem, situationGroups } from "@/data/industries";
import { getService } from "@/data/services";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Who we support",
  description:
    "Peyman supports founders, high-growth startups and innovative enterprises navigating institutional capital, complex transactions and government funding.",
  path: "/industries",
});

export default function IndustriesPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Who we support", href: "/industries" }]}
        title="For ventures navigating capital, transactions and government funding."
        intro="Peyman is organised around situations rather than sectors: the moments when a growing venture needs financial, legal or government expertise it does not yet have in-house."
        aside={<JumpList label="Situations" items={situationGroups.map((g) => ({ id: g.id, label: g.title }))} />}
      />
      <Section id="who" labelledBy="who-title">
        <SectionHeader id="who-title" title="Three kinds of venture, one standard of rigor." />
        <div className="audience-row">
          {audiences.map((a) => (
            <article key={a.id} className="audience" data-reveal="">
              <h3 className="t-h3">{a.title}</h3>
              <p className="t-body">{a.body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section id="situations" labelledBy="situations-title" tone="panel">
        <SectionHeader
          id="situations-title"
          title="What typically brings a venture to Peyman."
          intro="Each situation maps to the advisory discipline that handles it."
        />
        <div className="stack" data-gap="lg">
          {situationGroups.map((g) => (
            <article key={g.id} id={g.id} className="cols-2 anchor-target" data-reveal="" aria-labelledby={`${g.id}-title`}>
              <div className="stack" data-gap="sm">
                <h3 id={`${g.id}-title`} className="t-h3">
                  {g.title}
                </h3>
                <p className="t-body">{g.body}</p>
                <p className="t-small">
                  Handled by{" "}
                  {g.services.map((id, i) => (
                    <span key={id}>
                      {i > 0 && " and "}
                      <Link className="inline-link" href={`/advisory#${id}`}>
                        {getService(id).title}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <ul className="rows">
                {g.services.flatMap((id) => getService(id).situations).map((s) => (
                  <li key={s} className="t-body" style={{ paddingBlock: "var(--s-3)", color: "var(--text)" }}>
                    {s}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
      <Section id="ecosystem" labelledBy="ecosystem-title" tone="paper">
        <SectionHeader id="ecosystem-title" title="Fluent with the institutions founders work with." intro={ecosystem.intro} />
        <ul className="ecosystem" style={{ marginBlockStart: 0 }}>
          {ecosystem.parties.map((p) => (
            <li key={p.title} data-reveal="">
              <span className="t-h4">{p.title}</span>
              <span className="t-small">{p.body}</span>
            </li>
          ))}
        </ul>
      </Section>
      <ContactBand title="Tell us where your venture is today." />
    </>
  );
}
