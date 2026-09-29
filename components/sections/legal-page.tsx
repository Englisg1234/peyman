import type { ReactNode } from "react";
import { PageHeader } from "./page-header";
import { Section } from "./section";

export interface LegalPageProps {
  title: string;
  intro: string;
  path: string;
  updated: string;
  children: ReactNode;
}

/** Shared shell for legal documents: page header + one readable column. */
export function LegalPage({ title, intro, path, updated, children }: LegalPageProps) {
  return (
    <>
      <PageHeader
        crumbs={[{ name: title, href: path }]}
        title={title}
        intro={intro}
        aside={
          <dl className="facts">
            <div>
              <dt>Last updated</dt>
              <dd>{updated}</dd>
            </div>
          </dl>
        }
      />
      <Section>
        <div className="legal">{children}</div>
      </Section>
    </>
  );
}
