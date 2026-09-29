// Company facts. Every string here is taken from, or strictly paraphrases,
// reference/peyman-brief.pdf (page noted per block). Nothing is invented:
// unknown values (email domain, LinkedIn URL, photographs) are `null` and the
// UI omits them until the owner supplies real data.
import type { StaticImageData } from "next/image";
import type { Href } from "@/lib/site-config-schema";

export const company = {
  name: "Peyman Consulting",
  // PDF p.1
  positioning: "Bridging the Gap Between Innovation and Institutional Capital.",
  nameMeaning: {
    word: "Peyman",
    ipa: "/pejmɒːn/",
    pronunciation: "pay-mahn",
    meaning: "a binding agreement of trust and loyalty",
    sentence: "Rooted in the ancient concept of Peyman, a binding agreement of trust and loyalty.",
  },
  // PDF p.1 (sub-headline, second sentence)
  summary: "Premier financial, legal, and government advisory for high-growth startups navigating complex transactions.",
  // PDF p.1 (closing paragraph of About Us)
  mission:
    "Peyman Consulting is dedicated to partnering with innovative enterprises, empowering the next generation of founders to scale securely, drive impactful ecosystem growth, and democratize innovation.",
  // PDF p.3
  location: { locality: "Bengaluru", region: "Karnataka", country: "IN", label: "Bengaluru, Karnataka" },
  /** PDF p.3 lists `inquiries@peymanconsulting.[domain]`; the domain is unresolved. */
  email: null as string | null,
  /** PDF p.3 asks for a LinkedIn link; no URL was supplied. */
  linkedin: null as Href | null,
  // PDF p.1 CTA labels
  ctas: { consult: "Schedule a Consultation", partner: "Partner With Us" },
} as const;

// PDF p.3: The Peyman Advantage (Why Choose Us). Verbatim.
export const advantages = [
  {
    id: "ecosystem-insight",
    title: "Ecosystem-Level Insight",
    body: "Experience overseeing performance metrics, fund utilization, and operational milestones for over 1,250 startups within state-backed initiatives.",
  },
  {
    id: "institutional-rigor",
    title: "Institutional Rigor",
    body: "Applying government-grade compliance and financial control procedures to early-stage ventures to ensure they are perpetually audit-ready and investor-friendly.",
  },
] as const;

/**
 * How an engagement begins. Built only on what the brief states: an inquiry
 * form (p.3), a consultation (p.1 CTA) and advisory across the four
 * disciplines (p.2). No timelines, fees or guarantees are implied.
 */
export const engagement = [
  {
    id: "inquiry",
    title: "Send an inquiry",
    body: "Tell us about your venture, its stage and the area you need support with, through the inquiry form.",
  },
  {
    id: "consultation",
    title: "Schedule a consultation",
    body: "A first conversation to understand the situation: the capital, legal, government or fundraising questions in front of you.",
  },
  {
    id: "mandate",
    title: "Advisory across disciplines",
    body: "Support drawn from the disciplines your situation needs, financial, legal, government or fundraising, with one standard of rigor.",
  },
] as const;

// PDF p.1: About Us
export const founder = {
  name: "Omar Saud",
  credentials: "MBA, MS, LL.B",
  role: "Founder & Startup Consultant",
  intro:
    "A visionary leader, finance professional, and a lawyer with extensive experience in public finance and startup ecosystem governance.",
  record:
    "Omar Saud brings a proven track record from the Department of Electronics, IT, and Bt, Government of Karnataka, where he successfully operationalized state-level innovation initiatives, managed large-scale government grants, and established robust financial control procedures for beneficiaries.",
  leadership:
    "Adept at cross-functional leadership, he has orchestrated funding disbursements, established strategic innovation centers, and constituted executive oversight councils.",
  stakeholders:
    "His demonstrated expertise extends to driving multi-institutional stakeholder relations involving premier educational institutions, venture investors, and government bodies.",
  institution: "Department of Electronics, IT, and Bt, Government of Karnataka",
  disciplines: ["Finance", "Law", "Public finance", "Startup ecosystem governance"],
  /** Ledger of documented public-sector work (PDF p.1), used as the credibility record. */
  ledger: [
    "Operationalized state-level innovation initiatives",
    "Managed large-scale government grants",
    "Established financial control procedures for beneficiaries",
    "Orchestrated funding disbursements",
    "Established strategic innovation centers",
    "Constituted executive oversight councils",
  ],
  /** No portrait was supplied. The UI renders a typographic plate instead. */
  portrait: null,
} as const;

// PDF p.3: Achievements & Recognitions. Photographs and the certificate scan
// are placeholders in the brief, so `images` is empty until supplied. `media`
// records what the brief asks for, so the UI reserves the right frame shape
// (a landscape photograph, a portrait certificate, a 2-3 photo set).

export interface RecognitionImage {
  readonly src: StaticImageData;
  readonly alt: string;
}

export interface Recognition {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly body: string;
  readonly meta: string | null;
  readonly media: { readonly kind: "photograph" | "certificate" | "gallery"; readonly description: string };
  readonly images: readonly RecognitionImage[];
}

export const recognitionIntro =
  "A visual showcase of our track record, validated by premier government and ecosystem institutions.";

export const recognitions: readonly Recognition[] = [
  {
    id: "top-performer",
    category: "National Recognition",
    title: "“Top Performer” award",
    body: "Receiving the “Top Performer” award on behalf of the State Government at the national startup ecosystem ranking in New Delhi.",
    meta: "New Delhi · January 2026",
    media: { kind: "photograph", description: "Photograph receiving the award" },
    images: [],
  },
  {
    id: "dpiit",
    category: "Institutional Validation",
    title: "DPIIT recognition",
    body: "Official DPIIT recognition certificate, acknowledging significant contributions to the national innovation framework.",
    meta: "Certificate",
    media: { kind: "certificate", description: "High-resolution scan of the certificate" },
    images: [],
  },
  {
    id: "ecosystem-leadership",
    category: "Ecosystem Leadership",
    title: "Keynotes, panels & stage appearances",
    body: "Keynote addresses, panel discussions, and stage appearances at premier startup summits and incubation events.",
    meta: "Summits · Incubation events",
    media: { kind: "gallery", description: "Photographs on stage" },
    images: [],
  },
];
