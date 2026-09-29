import Link from "next/link";
import { ContactBand } from "@/components/sections/contact-band";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { intelligenceAreas, intelligenceDisclaimer } from "@/data/intelligence";
import { getService } from "@/data/services";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Intelligence",
  description:
    "The analytical work inside Peyman’s advisory today across capital, legal, compliance, policy and transactions, and the areas being explored for the future, clearly separated.",
  path: "/intelligence",
});

export default function IntelligencePage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Intelligence", href: "/intelligence" }]}
        title="Rigorous analysis today. Structured intelligence next."
        intro="Much of Peyman’s advisory is analytical: models, scenarios, health checks, compliance reporting and investor targeting. This page shows that work by area, and separates it clearly from what we are only exploring."
        aside={
          <div className="stack" data-gap="sm">
            <span className="status" data-state="current">
              Current advisory
            </span>
            <p className="t-small">Delivered today, inside an existing service.</p>
            <span className="status" data-state="exploring" style={{ marginBlockStart: "var(--s-3)" }}>
              Exploring · not offered
            </span>
            <p className="t-small">Direction only. Not a product or service.</p>
          </div>
        }
      />
      <Section id="areas" labelledBy="areas-title">
        <SectionHeader
          id="areas-title"
          title="Where analysis sits in our advisory."
          intro="Each area answers a question founders face. The left column is what Peyman does now; the right is where that work may go."
        />
        <div className="notice" role="note" style={{ marginBlockEnd: "var(--s-6)" }}>
          <p style={{ margin: 0 }}>{intelligenceDisclaimer}</p>
        </div>
        <ul className="intel">
          {intelligenceAreas.map((a) => (
            <li key={a.id} className="intel__row" data-reveal="">
              <div className="intel__cell">
                <h3 className="t-h3">{a.title}</h3>
                <p className="t-small">{a.question}</p>
              </div>
              <div className="intel__cell" data-state="current">
                <span className="status" data-state="current">
                  Current advisory
                </span>
                <ul className="ticks">
                  {a.today.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <Link className="situation__link" href={`/advisory#${a.service}`}>
                  Part of {getService(a.service).title}
                </Link>
              </div>
              <div className="intel__cell" data-state="exploring">
                <span className="status" data-state="exploring">
                  Exploring · not offered
                </span>
                <p className="t-small">{a.exploring}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <ContactBand title="Put today’s analysis to work on your venture." />
    </>
  );
}
