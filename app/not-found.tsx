import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/page-header";
import { Section } from "@/components/sections/section";
import { ArrowLink } from "@/components/ui/arrow-link";
import { services } from "@/data/services";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: "Page not found", href: "/404" }]}
        structuredData={false}
        title="This page could not be found."
        intro="The link may be out of date, or the page may have moved. These are the most useful places to continue."
      />
      <Section>
        <div className="cols-2" data-ratio="even">
          <div className="stack" data-gap="sm">
            <h2 className="t-h4">Advisory</h2>
            <ul className="rows">
              {services.map((s) => (
                <li key={s.id}>
                  <ArrowLink href={`/advisory#${s.id}`}>{s.title}</ArrowLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="stack" data-gap="sm">
            <h2 className="t-h4">The firm</h2>
            <ul className="rows">
              <li>
                <ArrowLink href="/">Home</ArrowLink>
              </li>
              <li>
                <ArrowLink href="/about">About Peyman</ArrowLink>
              </li>
              <li>
                <ArrowLink href="/contact">Start a conversation</ArrowLink>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
