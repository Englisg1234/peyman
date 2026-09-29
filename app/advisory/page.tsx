import { ServiceDetail } from "@/components/advisory/service-detail";
import { ServiceNav } from "@/components/advisory/service-nav";
import { ContactBand } from "@/components/sections/contact-band";
import { JumpList } from "@/components/sections/jump-list";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { JsonLd } from "@/components/seo/json-ld";
import { services } from "@/data/services";
import { buildMetadata, servicesJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Advisory",
  description:
    "Capital structuring and financial advisory, legal and transactional advisory, government grant and policy advisory, and fundraising readiness and deal syndication for high-growth startups.",
  path: "/advisory",
});

const index = services.map((s) => ({ id: s.id, label: s.title }));

export default function AdvisoryPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Advisory", href: "/advisory" }]}
        title="Advisory across capital, law and public funding."
        intro="Premier financial, legal, and government advisory for high-growth startups navigating complex transactions. Four disciplines, engaged individually or together, from inception to exit."
        aside={<JumpList label="Services" items={index} />}
      />
      <Section tone="ink">
        <div className="service-layout">
          <ServiceNav items={services.map((s) => ({ id: s.id, label: s.short }))} />
          <div>
            {services.map((s) => (
              <ServiceDetail key={s.id} service={s} />
            ))}
          </div>
        </div>
      </Section>
      <ContactBand title="Discuss the right mix of advisory for your stage." />
      <JsonLd data={servicesJsonLd(services.map((s) => ({ name: s.title, description: s.summary, path: `/advisory#${s.id}` })))} />
    </>
  );
}
