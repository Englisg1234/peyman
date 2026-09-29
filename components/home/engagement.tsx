import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { ArrowLink } from "@/components/ui/arrow-link";
import { engagement } from "@/data/company";

/** "How do I engage?" How an engagement begins: inquiry → consultation → advisory. */
export function Engagement() {
  return (
    <Section id="how-we-work" labelledBy="how-title" tone="panel">
      <SectionHeader
        id="how-title"
        title="How an engagement works"
        intro="One conversation first, then the disciplines your situation needs. Each engagement starts from the question in front of you and draws on financial, legal, government and fundraising advisory as required."
        action={<ArrowLink href="/contact">Send an inquiry</ArrowLink>}
      />
      <ol className="steps">
        {engagement.map((e) => (
          <li key={e.id} className="step" data-reveal="">
            <h3 className="t-h3">{e.title}</h3>
            <p className="t-body">{e.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
