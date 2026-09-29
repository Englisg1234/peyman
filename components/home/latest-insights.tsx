import { ArticleFeature } from "@/components/insights/article-feature";
import { ArticleItem } from "@/components/insights/article-item";
import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { ArrowLink } from "@/components/ui/arrow-link";
import { featuredArticle, sortedArticles } from "@/data/insights";

/** Insights: the lead story beside the latest notes. Hidden if nothing is published. */
export function LatestInsights() {
  const lead = featuredArticle();
  if (!lead) return null;
  const rest = sortedArticles().filter((a) => a.slug !== lead.slug).slice(0, 3);
  return (
    <Section id="insights" labelledBy="insights-title">
      <SectionHeader
        id="insights-title"
        title="Insights"
        intro="Perspectives on capital, agreements and public funding."
        action={<ArrowLink href="/insights">All insights</ArrowLink>}
      />
      <div className="insights-grid">
        <ArticleFeature article={lead} />
        {rest.length > 0 && (
          <ul className="article-list" aria-label="Recent insights">
            {rest.map((a) => (
              <ArticleItem key={a.slug} article={a} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
