import Link from "next/link";
import { ArticleFeature } from "@/components/insights/article-feature";
import { ArticleItem } from "@/components/insights/article-item";
import { ContactBand } from "@/components/sections/contact-band";
import { JumpList } from "@/components/sections/jump-list";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { featuredArticle, insightCategories, sortedArticles } from "@/data/insights";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Insights",
  description: "Advisory, capital and government policy perspectives from Peyman Consulting on structuring, agreements, public funding and fundraising readiness.",
  path: "/insights",
});

/**
 * Insights index. Every article appears once: the lead story at the top,
 * then every other article under its desk (Advisory, Capital, Government &
 * policy). Desks with no remaining articles are omitted, so the page grows
 * cleanly as articles are added to data/insights.ts.
 */
export default function InsightsPage() {
  const all = sortedArticles();
  const lead = featuredArticle();
  const desks = insightCategories
    .map((c) => ({ ...c, items: all.filter((a) => a.category === c.id && a.slug !== lead?.slug) }))
    .filter((d) => d.items.length > 0);

  return (
    <>
      <PageHeader
        crumbs={[{ name: "Insights", href: "/insights" }]}
        title="Perspectives on capital, agreements and public funding."
        intro="Notes from Peyman’s advisory work across financial, legal and government questions, organised by desk."
        aside={desks.length > 0 ? <JumpList label="Desks" items={desks.map((d) => ({ id: d.slug, label: d.label }))} /> : undefined}
      />
      {lead ? (
        <>
          <Section id="featured" labelledBy="featured-title">
            <h2 id="featured-title" className="sr-only">
              Featured perspective
            </h2>
            <div className="insights-grid">
              <ArticleFeature article={lead} />
              <aside className="engage-box" aria-label="About these perspectives" style={{ alignSelf: "start" }}>
                <h3 className="t-h4">About these perspectives</h3>
                <p className="t-small">
                  Each piece is written from the scope of Peyman’s four advisory disciplines. They are general information, not
                  financial, legal or investment advice for a particular venture.
                </p>
                <p className="t-small">
                  For your situation, <Link className="inline-link" href="/contact">start a conversation</Link>.
                </p>
              </aside>
            </div>
          </Section>
          {desks.length > 0 && (
            <Section id="desks" labelledBy="desks-title" tone="panel" rule>
              <h2 id="desks-title" className="kicker kicker--accent">
                By desk
              </h2>
              <div className="desks">
                {desks.map((d) => (
                  <section key={d.slug} id={d.slug} aria-labelledby={`${d.slug}-title`} className="desk">
                    <h3 id={`${d.slug}-title`} className="t-h3">
                      {d.label}
                    </h3>
                    <ul className="article-list">
                      {d.items.map((a) => (
                        <ArticleItem key={a.slug} article={a} level={4} withDek />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Section>
          )}
        </>
      ) : (
        <Section>
          <p className="t-lede">The first perspectives are being prepared for publication.</p>
        </Section>
      )}
      <ContactBand title="Have a question a perspective did not answer?" />
    </>
  );
}
