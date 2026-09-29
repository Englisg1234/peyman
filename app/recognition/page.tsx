import { Honour } from "@/components/recognition/honour";
import { ContactBand } from "@/components/sections/contact-band";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { recognitionIntro, recognitions } from "@/data/company";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Recognition",
  description:
    "The “Top Performer” award received on behalf of the State Government at the national startup ecosystem ranking, DPIIT recognition, and keynotes and panels at startup summits.",
  path: "/recognition",
});

export default function RecognitionPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Recognition", href: "/recognition" }]}
        title="A track record validated by premier institutions."
        intro={recognitionIntro}
        aside={
          <dl className="facts">
            <div>
              <dt>Award</dt>
              <dd>“Top Performer”, national startup ecosystem ranking</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>New Delhi, January 2026, on behalf of the State Government</dd>
            </div>
            <div>
              <dt>Certificate</dt>
              <dd>DPIIT recognition</dd>
            </div>
            <div>
              <dt>Speaking</dt>
              <dd>Startup summits and incubation events</dd>
            </div>
          </dl>
        }
      />
      <Section id="record" labelledBy="record-title">
        <h2 id="record-title" className="sr-only">
          Achievements and recognitions
        </h2>
        <ul className="honours" data-layout="feature">
          {recognitions.map((r, i) => (
            <Honour key={r.id} item={r} sizes={i === 0 ? "(min-width: 64rem) 42vw, 90vw" : undefined} />
          ))}
        </ul>
      </Section>
      <ContactBand title="Bring institutional experience to your next stage." />
    </>
  );
}
