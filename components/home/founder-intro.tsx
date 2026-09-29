import { Portrait } from "@/components/about/portrait";
import { Section } from "@/components/sections/section";
import { ArrowLink } from "@/components/ui/arrow-link";
import { founder } from "@/data/company";

/** "Who is behind Peyman?" The founder and the documented public-sector record (PDF p.1). */
export function FounderIntro() {
  return (
    <Section id="founder" labelledBy="founder-title">
      <div className="founder">
        <Portrait />
        <div className="stack" data-gap="lg">
          <div className="stack" data-reveal="">
            <h2 id="founder-title" className="t-h2">
              {founder.name}
            </h2>
            <ul className="credentials" aria-label="Credentials and role">
              <li>{founder.credentials}</li>
              <li>{founder.role}</li>
            </ul>
            <div className="prose">
              <p>
                <strong>{founder.intro}</strong>
              </p>
              <p>{founder.record}</p>
            </div>
          </div>
          <div data-reveal="">
            <h3 className="t-h4" id="record-title">
              Public-sector record
            </h3>
            <ul className="ticks" data-cols="2" aria-labelledby="record-title" style={{ marginBlockStart: "var(--s-4)" }}>
              {founder.ledger.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div style={{ marginBlockStart: "var(--s-5)" }}>
              <ArrowLink href="/about">Full profile</ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
