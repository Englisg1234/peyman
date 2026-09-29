import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/insights/article-body";
import { ArticleItem } from "@/components/insights/article-item";
import { ContactBand } from "@/components/sections/contact-band";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowLink } from "@/components/ui/arrow-link";
import { articles, categoryLabel, getArticle, sortedArticles } from "@/data/insights";
import { articleJsonLd, buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/site";

type Params = { slug: string };

// Every article is prerendered; an unknown slug resolves to notFound() (404).
export function generateStaticParams(): Params[] {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return buildMetadata({
    title: article.title,
    description: article.dek,
    path: `/insights/${article.slug}`,
    type: "article",
    publishedTime: article.published,
    modifiedTime: article.updated,
  });
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const path = `/insights/${article.slug}`;
  const more = sortedArticles().filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Insights", href: "/insights" },
          { name: article.title, href: path },
        ]}
        title={article.title}
        intro={article.dek}
      />
      <Section>
        <article className="article" aria-labelledby="page-title">
          <aside className="article__aside" aria-label="Article details">
            <dl className="facts">
              <div>
                <dt>Desk</dt>
                <dd>{categoryLabel(article.category)}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>
                  <time dateTime={article.published}>{formatDate(article.published)}</time>
                </dd>
              </div>
              <div>
                <dt>By</dt>
                <dd>{article.author}</dd>
              </div>
              <div>
                <dt>Reading</dt>
                <dd>{article.readingMinutes} min</dd>
              </div>
            </dl>
            <ArrowLink href="/insights">All insights</ArrowLink>
          </aside>
          <ArticleBody blocks={article.body} />
        </article>
      </Section>
      {more.length > 0 && (
        <Section tone="panel" labelledBy="more-title" rule tight>
          <div className="cols-2">
            <h2 id="more-title" className="t-h3">
              More perspectives
            </h2>
            <ul className="article-list">
              {more.map((a) => (
                <ArticleItem key={a.slug} article={a} />
              ))}
            </ul>
          </div>
        </Section>
      )}
      <ContactBand title="Discuss this with Peyman." />
      <JsonLd
        data={articleJsonLd({ title: article.title, description: article.dek, path, published: article.published, updated: article.updated, author: article.author })}
      />
    </>
  );
}
