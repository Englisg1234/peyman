import Link from "next/link";
import { categoryLabel, type Article } from "@/data/insights";
import { formatDate } from "@/lib/site";

export interface ArticleItemProps {
  article: Article;
  level?: 2 | 3 | 4;
  /** Show the standfirst (index pages) or keep to title + byline (lists). */
  withDek?: boolean;
}

/** Article row in a ruled list. The title link covers the row: one tab stop. */
export function ArticleItem({ article, level = 3, withDek = false }: ArticleItemProps) {
  const H = (["h2", "h3", "h4"] as const)[level - 2];
  return (
    <li className="article-item" data-reveal="">
      <p className="byline" style={{ margin: 0 }}>
        <span className="byline__topic">{categoryLabel(article.category)}</span>
        <time dateTime={article.published}>{formatDate(article.published)}</time>
      </p>
      <H className="article-item__title">
        <Link className="cover-link" href={`/insights/${article.slug}`}>
          {article.title}
        </Link>
      </H>
      {withDek && <p className="t-small">{article.dek}</p>}
      <p className="byline" style={{ margin: 0 }}>
        <span>{article.readingMinutes} min read</span>
      </p>
    </li>
  );
}
