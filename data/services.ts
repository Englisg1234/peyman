// Advisory service groups (reference/peyman-brief.pdf p.2).
//
// `title`, `summary` and `subServices` (with their named instruments) are
// verbatim from the brief. `situations` rephrase those same sub-services as
// the moments a founder would bring Peyman in; they add no new scope.

export type ServiceId = "capital-structuring" | "legal-transactional" | "government-grants" | "fundraising-readiness";

export interface SubService {
  readonly title: string;
  /** Items the brief lists under the sub-service (named instruments). */
  readonly items?: readonly string[];
}

export interface ServiceGroup {
  readonly id: ServiceId;
  readonly title: string;
  /** Short label for navigation and tags. */
  readonly short: string;
  /** Brief summary sentence (verbatim). */
  readonly summary: string;
  /** One-line answer to "what does this do for me?". */
  readonly outcome: string;
  readonly subServices: readonly SubService[];
  /** When founders typically engage this discipline (derived from the scope above). */
  readonly situations: readonly string[];
}

export const services: readonly ServiceGroup[] = [
  {
    id: "capital-structuring",
    title: "Capital Structuring & Financial Advisory",
    short: "Capital Structuring",
    summary: "Strategic financial oversight to prepare startups for institutional investment and sustainable scaling.",
    outcome: "Financials, ownership and valuation that stand up to institutional investors.",
    subServices: [
      { title: "Financial Modeling & Projections" },
      { title: "Cap Table Management & Scenario Analysis" },
      { title: "In-depth Financial Analysis & Health Checks" },
      { title: "Valuation Strategy & Support" },
    ],
    situations: [
      "Preparing the financial model and projections for institutional investment",
      "Modelling ownership and dilution across rounds before terms are agreed",
      "Reviewing financial health before investors or auditors do",
      "Setting a valuation strategy ahead of a raise",
    ],
  },
  {
    id: "legal-transactional",
    title: "Legal & Transactional Advisory",
    short: "Legal & Transactional",
    summary: "Comprehensive legal safeguarding and negotiation support from inception to exit.",
    outcome: "The agreements that protect founders, partners and capital, negotiated and in place.",
    subServices: [
      {
        title: "Fundraising Instruments",
        items: ["Term Sheets", "Shareholders’ Agreements (SHA)", "Share Subscription Agreements (SSA)"],
      },
      {
        title: "Core Corporate Agreements",
        items: ["Founders’ Agreements", "Execution of Deeds", "Non-Disclosure Agreements (NDAs)"],
      },
      { title: "Commercial Contracts", items: ["Client Contracts", "Vendor Agreements"] },
      { title: "Transactional Advisory & Due Diligence Support" },
    ],
    situations: [
      "Negotiating a term sheet, SHA or SSA for a funding round",
      "Formalising a founders’ agreement, deeds or NDAs",
      "Putting client and vendor contracts in place",
      "Preparing for, or supporting, due diligence on a transaction",
    ],
  },
  {
    id: "government-grants",
    title: "Government Grant & Policy Advisory",
    short: "Government Grants & Policy",
    summary: "Navigating the complexities of public sector funding to unlock non-dilutive capital.",
    outcome: "Access to public sector funding without giving up equity, managed to compliance.",
    subServices: [
      { title: "Strategic advisory on State and Central Government grant-in-aid schemes" },
      { title: "Application drafting and proposal structuring" },
      { title: "Fund utilization planning, compliance, and milestone reporting" },
    ],
    situations: [
      "Identifying State and Central Government grant-in-aid schemes that fit",
      "Drafting and structuring a grant application or proposal",
      "Planning fund utilization and reporting milestones after an award",
    ],
  },
  {
    id: "fundraising-readiness",
    title: "Fundraising Readiness & Deal Syndication",
    short: "Fundraising & Syndication",
    summary: "Equipping founders with the narratives and materials required to secure venture backing.",
    outcome: "A narrative, materials and investor list ready for venture conversations.",
    subServices: [
      { title: "Pitch Deck Development & Narrative Refining" },
      { title: "Investor Targeting & Deal Facilitation" },
    ],
    situations: [
      "Building or refining the pitch deck and investment narrative",
      "Identifying the right investors and facilitating the deal",
    ],
  },
];

export function getService(id: ServiceId): ServiceGroup {
  const s = services.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown service ${id}`);
  return s;
}

/** Options for the inquiry form's "Service / Area of Interest" field. */
export const interestOptions = [
  ...services.map((s) => ({ value: s.id, label: s.title })),
  { value: "partnership", label: "Partnership" },
  { value: "general", label: "General inquiry" },
] as const;

export type InterestValue = (typeof interestOptions)[number]["value"];
