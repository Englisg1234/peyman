// Intelligence: for each analytical area, what Peyman delivers TODAY (every
// item is an existing sub-service from reference/peyman-brief.pdf p.2–3) and
// what Peyman is EXPLORING (direction only: not a product, not offered, no
// launch implied). The UI labels the two states on every row.
import type { ServiceId } from "./services";

export interface IntelligenceArea {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  /** Delivered today, as part of the named advisory service. */
  readonly today: readonly string[];
  readonly service: ServiceId;
  /** Being explored. Not offered. */
  readonly exploring: string;
}

export const intelligenceAreas: readonly IntelligenceArea[] = [
  {
    id: "capital",
    title: "Capital intelligence",
    question: "What is the venture worth, and how will ownership change?",
    today: ["Financial modeling & projections", "Cap table scenario analysis", "Valuation strategy & support"],
    service: "capital-structuring",
    exploring: "Repeatable models that let founders compare capital scenarios consistently across rounds.",
  },
  {
    id: "legal",
    title: "Legal intelligence",
    question: "What do the instruments commit the company to?",
    today: ["Term sheets, SHA and SSA", "Founders’ agreements, deeds and NDAs", "Client and vendor contracts"],
    service: "legal-transactional",
    exploring: "Structured reference points for the terms founders most often negotiate.",
  },
  {
    id: "compliance",
    title: "Compliance intelligence",
    question: "Is the venture audit-ready and investor-friendly today?",
    today: ["In-depth financial analysis & health checks", "Government-grade financial control procedures"],
    service: "capital-structuring",
    exploring: "A readiness framework that turns health checks into a comparable, periodic view.",
  },
  {
    id: "policy",
    title: "Government & policy intelligence",
    question: "Which public funding fits, and what does it require?",
    today: ["Advisory on State and Central grant-in-aid schemes", "Fund utilization planning and milestone reporting"],
    service: "government-grants",
    exploring: "Organised scheme knowledge so eligibility and obligations are clear earlier.",
  },
  {
    id: "transaction",
    title: "Transaction intelligence",
    question: "Who should be at the table, and what will they examine?",
    today: ["Investor targeting & deal facilitation", "Transactional advisory & due diligence support"],
    service: "fundraising-readiness",
    exploring: "Applying ecosystem-level experience of performance metrics to how deals are prepared.",
  },
];

export const intelligenceDisclaimer =
  "Items marked “Exploring” describe direction only. They are not current services or products, and no launch is implied.";
