import Link from "next/link";
import { categoryLabel, type Article } from "@/data/insights";
import { formatDate } from "@/lib/site";

export interface ArticleFeatureProps {
  article: Article;
  level?: 2 | 3;
}

/** Lead story: desk, large title, standfirst, byline. The title link covers the block. */
export function ArticleFeature({ article, level = 3 }: ArticleFeatureProps) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className="article-feature" data-reveal="">
      <p className="byline" style={{ margin: 0 }}>
        <span className="byline__topic">{categoryLabel(article.category)}</span>
        <span>Featured</span>
      </p>
      <H className="article-feature__title">
        <Link className="cover-link" href={`/insights/${article.slug}`}>
          {article.title}
        </Link>
      </H>
      <p className="t-lede">{article.dek}</p>
      <p className="byline" style={{ margin: 0 }}>
        <span>{article.author}</span>
        <time dateTime={article.published}>{formatDate(article.published)}</time>
        <span>{article.readingMinutes} min read</span>
      </p>
    </article>
  );
}
