import type { ArticleBlock } from "@/data/insights";

export interface ArticleBodyProps {
  blocks: readonly ArticleBlock[];
}

/** Renders typed article blocks as semantic prose (h2 / p / ul / blockquote). */
export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="article-body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return <h2 key={i}>{b.text}</h2>;
          case "list":
            return (
              <ul key={i}>
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i}>
                <p style={{ margin: 0 }}>{b.text}</p>
              </blockquote>
            );
          default:
            return <p key={i}>{b.text}</p>;
        }
      })}
    </div>
  );
}
