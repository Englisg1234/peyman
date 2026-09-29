import { Suspense } from "react";
import { Hero } from "@/components/hero/hero";
import { Capabilities } from "@/components/home/capabilities";
import { Engagement } from "@/components/home/engagement";
import { FounderIntro } from "@/components/home/founder-intro";
import { LatestInsights } from "@/components/home/latest-insights";
import { Overview } from "@/components/home/overview";
import { RecognitionSummary } from "@/components/home/recognition-summary";
import { WhoWeSupport } from "@/components/home/who-we-support";
import { WhyPeyman } from "@/components/home/why-peyman";
import { ContactBand } from "@/components/sections/contact-band";
import { siteConfig } from "@/data/site-config";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ description: siteConfig.meta.description, path: "/" });

// Homepage (RSC). Each section answers one visitor question, in order:
//   What does Peyman do?          Overview
//   What can it help with?        Capabilities (the four disciplines)
//   Why trust it?                 Why Peyman (advantage, provenance, ecosystem)
//   How do I engage?              Engagement
//   Can it help my situation?     Who we support (audiences + situations)
//   Who is behind it?             Founder
//   Who has validated it?         Recognition
//   What does it think?           Insights
//   What next?                    Contact band
//
// Sections after the Hero are separate Suspense boundaries (nothing
// suspends) so React hydrates them in yielding chunks and the Hero intro
// keeps its frame cadence after first paint.
const SECTIONS = [Overview, Capabilities, WhyPeyman, Engagement, WhoWeSupport, FounderIntro, RecognitionSummary, LatestInsights];

export default function HomePage() {
  return (
    <>
      <Hero />
      {SECTIONS.map((S, i) => (
        <Suspense key={i}>
          <S />
        </Suspense>
      ))}
      <Suspense>
        <ContactBand />
      </Suspense>
    </>
  );
}
