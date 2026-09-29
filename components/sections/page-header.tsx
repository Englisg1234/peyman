import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/data/site-config";
import { breadcrumbJsonLd } from "@/lib/seo";

export interface Crumb {
  name: string;
  href: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  intro?: ReactNode;
  /** Trail after Home; the last crumb is the current page (not linked). */
  crumbs: readonly Crumb[];
  /** Right column (from 1024 px): key facts or an in-page index. */
  aside?: ReactNode;
  headingId?: string;
  /** Emit BreadcrumbList JSON-LD for the trail (off for the 404 page). */
  structuredData?: boolean;
}

/**
 * Interior page header: breadcrumb, h1, intro and an optional aside, on the
 * navy stage the Hero established, with a faint emblem watermark on
 * desktop only. The h1 is never animated, so it paints final (LCP).
 */
export function PageHeader({ title, intro, crumbs, aside, headingId = "page-title", structuredData = true }: PageHeaderProps) {
  const { poster } = siteConfig.emblem;
  const trail = [{ name: "Home", href: "/" }, ...crumbs];
  return (
    <section className="page-head" aria-labelledby={headingId}>
      <Image src={poster.src} width={poster.width} height={poster.height} alt="" sizes="420px" quality={70} loading="lazy" className="page-head__emblem" />
      <div className="wrap">
        <div className="page-head__grid">
          <div className="page-head__main">
            <nav aria-label="Breadcrumb">
              <ol className="crumbs">
                {trail.map((c, i) => (
                  <li key={c.href}>
                    {i < trail.length - 1 ? <Link href={c.href}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            <h1 id={headingId} className="t-display">
              {title}
            </h1>
            {intro && <p className="t-lede">{intro}</p>}
          </div>
          {aside && <div className="page-head__aside">{aside}</div>}
        </div>
      </div>
      {structuredData && <JsonLd data={breadcrumbJsonLd(trail.map((c) => ({ name: c.name, path: c.href })))} />}
    </section>
  );
}
