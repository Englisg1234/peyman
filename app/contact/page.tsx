import Link from "next/link";
import { InquiryForm } from "@/components/contact/inquiry-form";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { company, engagement } from "@/data/company";
import { services } from "@/data/services";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, contactPageJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Start a conversation with Peyman Consulting, Bengaluru. Send an inquiry about capital structuring, legal and transactional, government grant or fundraising advisory.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Contact", href: "/contact" }]}
        title="Start a conversation."
        intro="Tell us about your venture and the support you are looking for. Every engagement begins with an inquiry and a consultation."
      />
      <Section id="inquiry">
        <div className="contact-layout">
          <div className="stack" data-gap="lg">
            <div className="stack" data-gap="sm">
              <h2 className="t-h3">What happens next</h2>
              <ol className="steps" data-layout="vertical" style={{ marginBlockStart: "var(--s-4)" }}>
                {engagement.map((e) => (
                  <li key={e.id} className="step">
                    <h3 className="t-h4">{e.title}</h3>
                    <p className="t-small">{e.body}</p>
                  </li>
                ))}
              </ol>
            </div>
            <dl className="facts">
              <div>
                <dt>Office</dt>
                <dd>{company.location.label}, India</dd>
              </div>
              {company.email && (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a className="inline-link" href={`mailto:${company.email}`}>
                      {company.email}
                    </a>
                  </dd>
                </div>
              )}
              {company.linkedin && (
                <div>
                  <dt>LinkedIn</dt>
                  <dd>
                    <a className="inline-link" href={company.linkedin} rel="noopener noreferrer" target="_blank">
                      Peyman Consulting<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt>Advisory</dt>
                <dd>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                    {services.map((s) => (
                      <li key={s.id}>
                        <Link className="inline-link" href={`/advisory#${s.id}`}>
                          {s.short}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
          <div className="intake">
            <h2 className="t-h3" id="intake-title" style={{ marginBlockEnd: "var(--s-2)" }}>
              Inquiry
            </h2>
            <p className="t-small" style={{ marginBlockEnd: "var(--s-6)" }}>
              A few details so the first conversation is useful.
            </p>
            <InquiryForm />
          </div>
        </div>
      </Section>
      <JsonLd data={contactPageJsonLd({ description: "Send an inquiry to Peyman Consulting, Bengaluru, about capital, legal, government grant or fundraising advisory." })} />
    </>
  );
}
