import { SiteHeader } from "@/components/layout/site-header";
import { articles } from "@/data/insights";

// `@header` slot for /insights/[slug]: the Insights nav item stays current.
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default function ArticleHeader() {
  return <SiteHeader currentPath="/insights" />;
}
