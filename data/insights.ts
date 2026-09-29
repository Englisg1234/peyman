// Insights registry. To publish an article, append an entry to `articles`:
// the index, the /insights/[slug] route, the sitemap and Article JSON-LD all
// read from here. Bodies are typed blocks, so no MDX tooling is needed.
//
// The launch notes below are composed only from facts in
// reference/peyman-brief.pdf (name meaning, service scope, the Peyman
// Advantage). They make no market, legal or regulatory claims. Replace or
// extend them with the owner's own articles.

export type ArticleBlock =
  | { readonly type: "p"; readonly text: string }
  | { readonly type: "h2"; readonly text: string }
  | { readonly type: "list"; readonly items: readonly string[] }
  | { readonly type: "quote"; readonly text: string };

/** Publication desks: advisory, capital and government/policy perspectives. */
export type InsightCategory = "Advisory" | "Capital" | "Policy";

export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly dek: string;
  readonly category: InsightCategory;
  /** ISO date (YYYY-MM-DD). */
  readonly published: string;
  readonly updated?: string;
  readonly author: string;
  readonly readingMinutes: number;
  /** Shown as the lead story on /insights and the homepage (newest featured wins). */
  readonly featured?: boolean;
  readonly body: readonly ArticleBlock[];
}

export const insightCategories: ReadonlyArray<{ id: InsightCategory; label: string; slug: string }> = [
  { id: "Advisory", label: "Advisory perspectives", slug: "advisory" },
  { id: "Capital", label: "Capital perspectives", slug: "capital" },
  { id: "Policy", label: "Government & policy", slug: "policy" },
];

export const articles: readonly Article[] = [
  {
    slug: "the-meaning-of-peyman",
    title: "Peyman: a binding agreement of trust",
    dek: "Why an advisory firm for founders and institutional capital takes its name from an ancient idea of loyalty.",
    category: "Advisory",
    published: "2026-09-28",
    author: "Peyman Consulting",
    readingMinutes: 3,
    featured: true,
    body: [
      { type: "p", text: "Peyman (pronounced pay-mahn) is rooted in an ancient concept: a binding agreement of trust and loyalty. It is the idea the firm is built on." },
      { type: "h2", text: "Agreements are where capital meets innovation" },
      { type: "p", text: "Every stage of a venture’s growth is recorded in agreements: between founders, with vendors and clients, with investors, and with the public bodies that fund innovation. Each one is a promise that has to hold." },
      { type: "p", text: "Our work sits exactly there. We bridge the gap between innovation and institutional capital by helping founders structure, document and honour those agreements." },
      { type: "quote", text: "A binding agreement of trust and loyalty." },
      { type: "h2", text: "What that means in practice" },
      { type: "list", items: [
        "Capital structured so investors can understand and trust it.",
        "Legal instruments that protect founders from inception to exit.",
        "Public funding used and reported with government-grade discipline.",
        "A fundraising narrative that is accurate as well as persuasive.",
      ] },
    ],
  },
  {
    slug: "audit-ready-from-the-start",
    title: "Audit-ready from the start",
    dek: "What institutional rigor looks like when it is applied to an early-stage venture.",
    category: "Capital",
    published: "2026-09-28",
    author: "Peyman Consulting",
    readingMinutes: 3,
    body: [
      { type: "p", text: "Institutional investors and public funders ask the same underlying question: can this venture account for every rupee and every obligation? Peyman’s answer is to build that capability early." },
      { type: "h2", text: "Government-grade controls, startup pace" },
      { type: "p", text: "Institutional rigor means applying government-grade compliance and financial control procedures to early-stage ventures, so they are perpetually audit-ready and investor-friendly." },
      { type: "list", items: [
        "Financial modeling and projections that hold up to scrutiny.",
        "Cap table management and scenario analysis before each round.",
        "In-depth financial analysis and periodic health checks.",
        "Fund utilization planning, compliance and milestone reporting for grants.",
      ] },
      { type: "h2", text: "Why it matters" },
      { type: "p", text: "A venture that is always ready for review can move when capital is available, rather than when the paperwork is finished." },
    ],
  },
  {
    slug: "non-dilutive-capital-and-grant-in-aid",
    title: "Non-dilutive capital: where grant-in-aid fits",
    dek: "How government grant advisory sits alongside equity fundraising in a founder’s capital plan.",
    category: "Policy",
    published: "2026-09-28",
    author: "Peyman Consulting",
    readingMinutes: 3,
    body: [
      { type: "p", text: "Public sector funding can unlock capital without giving up equity, but it comes with its own complexity: scheme selection, application standards and ongoing obligations." },
      { type: "h2", text: "Three parts of the work" },
      { type: "list", items: [
        "Strategic advisory on State and Central Government grant-in-aid schemes.",
        "Application drafting and proposal structuring.",
        "Fund utilization planning, compliance, and milestone reporting.",
      ] },
      { type: "h2", text: "Seen from the ecosystem level" },
      { type: "p", text: "Peyman’s perspective comes from experience overseeing performance metrics, fund utilization and operational milestones for over 1,250 startups within state-backed initiatives." },
      { type: "p", text: "That view shapes how we help founders plan grants as one part of a wider capital structure, alongside fundraising readiness and investor conversations." },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

/** Newest first (stable for equal dates: registry order). */
export function sortedArticles(): readonly Article[] {
  return articles.map((a, i) => ({ a, i })).sort((x, y) => y.a.published.localeCompare(x.a.published) || x.i - y.i).map((x) => x.a);
}

/** Lead story: the newest featured article, else the newest article. */
export function featuredArticle(): Article | undefined {
  const list = sortedArticles();
  return list.find((a) => a.featured) ?? list[0];
}

export function categoryLabel(id: InsightCategory): string {
  return insightCategories.find((c) => c.id === id)?.label ?? id;
}
