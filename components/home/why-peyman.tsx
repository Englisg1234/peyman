import { Section } from "@/components/sections/section";
import { advantages, founder } from "@/data/company";
import { ecosystem } from "@/data/industries";

/**
 * "Why should I trust Peyman?" The Peyman Advantage (PDF p.3) with its
 * institutional provenance (PDF p.1) and the ecosystem it spans. Paper tone:
 * the page's one light band, so the argument reads like a document.
 */
export function WhyPeyman() {
  return (
    <Section id="why-peyman" labelledBy="why-title" tone="paper">
      <div className="why">
        <div data-reveal="">
          <h2 id="why-title" className="t-h2">
            Why founders work with Peyman
          </h2>
          <p className="t-lede" style={{ marginBlockStart: "var(--s-5)" }}>
            Government-grade rigor, applied to early-stage ventures. Peyman brings the discipline of public finance to founders: the controls, reporting and oversight that institutions
            expect, in place before they ask.
          </p>
          <div className="provenance">
            <h3 className="t-h4">Where it comes from</h3>
            <p className="t-small" style={{ color: "var(--text)" }}>
              Experience from the {founder.institution}: state-level innovation initiatives, large-scale government grants and
              financial control procedures for beneficiaries.
            </p>
          </div>
        </div>
        <div className="stack" data-gap="lg">
          <div className="principles" data-reveal="">
            {advantages.map((a) => (
              <article key={a.id} className="principle">
                <h3 className="t-h3">{a.title}</h3>
                <p className="t-body">{a.body}</p>
              </article>
            ))}
          </div>
          <div data-reveal="">
            <h3 className="t-h4">Fluent with every side of the table</h3>
            <p className="t-small" style={{ marginBlockStart: "var(--s-2)" }}>
              {ecosystem.intro}
            </p>
            <ul className="ecosystem" style={{ marginBlockStart: "var(--s-5)" }}>
              {ecosystem.parties.map((p) => (
                <li key={p.title}>
                  <span className="t-h4">{p.title}</span>
                  <span className="t-small">{p.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
