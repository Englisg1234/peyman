import { Section } from "@/components/sections/section";
import { company, founder } from "@/data/company";
import { services } from "@/data/services";

/**
 * "What does Peyman do?" answered right under the Hero: the firm summary,
 * the four disciplines at a glance, and a fact panel (name meaning, office,
 * founder, experience) so a first-time visitor has the essentials in one view.
 */
export function Overview() {
  const { nameMeaning } = company;
  return (
    <Section id="overview" labelledBy="overview-title" tone="navy">
      <div className="overview">
        <div data-reveal="">
          <h2 id="overview-title" className="t-h2">
            Financial, legal and government advisory for founders building toward institutional capital.
          </h2>
          <p className="t-lede" style={{ marginBlockStart: "var(--s-5)" }}>
            {company.summary}
          </p>
          <ul className="overview__disciplines" aria-label="Advisory disciplines">
            {services.map((s) => (
              <li key={s.id}>{s.title}</li>
            ))}
          </ul>
        </div>
        <aside className="name-note" aria-label="About the firm" data-reveal="">
          <p className="name-note__word" style={{ margin: 0 }}>
            <span lang="fa-Latn">{nameMeaning.word}</span>
            <span className="name-note__ipa">
              <span lang="fa-fonipa">{nameMeaning.ipa}</span> · {nameMeaning.pronunciation}
            </span>
          </p>
          <p className="t-small">
            Rooted in the ancient concept of Peyman: {nameMeaning.meaning}.
          </p>
          <dl className="facts">
            <div>
              <dt>Office</dt>
              <dd>{company.location.label}, India</dd>
            </div>
            <div>
              <dt>Founder</dt>
              <dd>
                {founder.name}, {founder.credentials}
              </dd>
            </div>
            <div>
              <dt>Background</dt>
              <dd>Public finance and startup ecosystem governance</dd>
            </div>
            <div>
              <dt>Ecosystem experience</dt>
              <dd>Performance metrics, fund utilization and milestones for over 1,250 startups in state-backed initiatives</dd>
            </div>
          </dl>
        </aside>
      </div>
    </Section>
  );
}
