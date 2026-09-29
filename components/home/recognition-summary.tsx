import { Section } from "@/components/sections/section";
import { SectionHeader } from "@/components/sections/section-header";
import { ArrowLink } from "@/components/ui/arrow-link";
import { recognitions } from "@/data/company";

/**
 * Recognition (PDF p.3) as a plain record: category, what it is, where and
 * when. No placeholder imagery on the homepage; the reserved frames live on
 * /recognition until real photographs and the certificate scan are supplied.
 */
export function RecognitionSummary() {
  return (
    <Section id="recognition" labelledBy="recognition-title" tone="navy">
      <div className="cols-2">
        <SectionHeader
          id="recognition-title"
          title="Recognition"
          intro="A track record validated by premier government and ecosystem institutions."
          action={<ArrowLink href="/recognition">Recognition in detail</ArrowLink>}
        />
        <dl className="record-list" data-reveal="">
          {recognitions.map((r) => (
            <div key={r.id}>
              <dt className="t-small">{r.category}</dt>
              <dd>
                <span className="t-h4">{r.title}</span>
                <span className="t-small">{r.body}</span>
                {r.meta && <span className="meta">{r.meta}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
