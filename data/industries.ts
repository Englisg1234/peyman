// Who Peyman supports. Derived only from reference/peyman-brief.pdf:
// high-growth startups and founders (p.1–2), innovative enterprises (p.1),
// and the institutions the founder's work spans: premier educational
// institutions, venture investors and government bodies (p.1).
// The brief names no sector specialisms, so none is claimed.
import type { ServiceId } from "./services";

export interface Audience {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export const audiences: readonly Audience[] = [
  {
    id: "founders",
    title: "Founders and high-growth startups",
    body: "Teams navigating complex transactions, from the first founders’ agreement through institutional investment and on to exit.",
  },
  {
    id: "enterprises",
    title: "Innovative enterprises scaling up",
    body: "Ventures preparing for sustainable scaling that need to stay audit-ready and investor-friendly as capital and obligations grow.",
  },
  {
    id: "public-funding",
    title: "Ventures working with public funding",
    body: "Applicants to State and Central Government grant-in-aid schemes, and beneficiaries managing utilization, compliance and milestones.",
  },
];

export interface SituationGroup {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly services: readonly ServiceId[];
}

/** The three kinds of situation the brief's services address. */
export const situationGroups: readonly SituationGroup[] = [
  {
    id: "institutional-capital",
    title: "Navigating institutional capital",
    body: "Preparing the financials, valuation, narrative and investor approach that institutional investment requires.",
    services: ["capital-structuring", "fundraising-readiness"],
  },
  {
    id: "complex-transactions",
    title: "Entering complex transactions",
    body: "Negotiating fundraising instruments, putting corporate and commercial agreements in place and supporting due diligence.",
    services: ["legal-transactional"],
  },
  {
    id: "government-funding",
    title: "Navigating government funding",
    body: "Selecting grant-in-aid schemes, structuring applications and meeting utilization, compliance and reporting obligations.",
    services: ["government-grants"],
  },
];

/** Institutions the founder's documented stakeholder work spans (PDF p.1). */
export const ecosystem = {
  intro:
    "Peyman’s perspective comes from multi-institutional stakeholder relations across the innovation ecosystem, the same institutions founders need to work with.",
  parties: [
    { title: "Government bodies", body: "State-level innovation initiatives, large-scale grant programmes and executive oversight councils." },
    { title: "Premier educational institutions", body: "Strategic innovation centers and the founders emerging from them." },
    { title: "Venture investors", body: "The institutional capital founders are preparing to meet." },
  ],
} as const;
