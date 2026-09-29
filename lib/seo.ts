// Page metadata builder and JSON-LD objects. Pure; server-safe.
import type { Metadata } from "next";
import { siteUrl } from "./site";

const SITE_NAME = "Peyman Consulting";

export interface PageMetaInput {
  /** Page title; the template appends " · Peyman Consulting". Omit for home. */
  title?: string;
  description: string;
  path: `/${string}`;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

/**
 * The shared social card (app/opengraph-image.tsx). A page that sets its own
 * `openGraph` replaces the inherited file-based image, so every page built
 * here references the card explicitly (resolved against metadataBase).
 */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Peyman Consulting: Bridging the Gap Between Innovation and Institutional Capital.",
} as const;

export function buildMetadata({ title, description, path, type = "website", publishedTime, modifiedTime, noindex }: PageMetaInput): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return {
    title: title ?? { absolute: SITE_NAME },
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: path,
      locale: "en_IN",
      images: [SHARE_IMAGE],
      ...(type === "article" ? { publishedTime, modifiedTime: modifiedTime ?? publishedTime, authors: [SITE_NAME] } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SHARE_IMAGE.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export interface OrgInput {
  description: string;
  locality: string;
  region: string;
  country: string;
  founderName: string;
  founderRole: string;
  serviceNames: readonly string[];
  sameAs: readonly string[];
}

/** Organization + ProfessionalService graph for the root layout. */
export function organizationJsonLd(o: OrgInput) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${url}/#organization`,
        name: SITE_NAME,
        url,
        logo: `${url}/icon`,
        description: o.description,
        address: { "@type": "PostalAddress", addressLocality: o.locality, addressRegion: o.region, addressCountry: o.country },
        areaServed: { "@type": "Country", name: "India" },
        founder: { "@id": `${url}/about#founder` },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Advisory services",
          itemListElement: o.serviceNames.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
        },
        ...(o.sameAs.length ? { sameAs: o.sameAs } : {}),
      },
      {
        "@type": "Person",
        "@id": `${url}/about#founder`,
        name: o.founderName,
        jobTitle: o.founderRole,
        worksFor: { "@id": `${url}/#organization` },
      },
      { "@type": "WebSite", "@id": `${url}/#website`, url, name: SITE_NAME, publisher: { "@id": `${url}/#organization` } },
    ],
  };
}

export interface ArticleLdInput {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
  author: string;
}

export function articleJsonLd(a: ArticleLdInput) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.published,
    dateModified: a.updated ?? a.published,
    mainEntityOfPage: `${url}${a.path}`,
    author: { "@type": "Organization", name: a.author, url },
    publisher: { "@id": `${url}/#organization` },
  };
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${url}${it.path}` })),
  };
}

/** Service nodes offered by the firm (Advisory page). */
export function servicesJsonLd(items: ReadonlyArray<{ name: string; description: string; path: string }>) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": items.map((s) => ({
      "@type": "Service",
      name: s.name,
      description: s.description,
      url: `${url}${s.path}`,
      provider: { "@id": `${url}/#organization` },
      areaServed: { "@type": "Country", name: "India" },
    })),
  };
}

/** ContactPage for /contact: points at the organization and its office locality (no invented phone or email). */
export function contactPageJsonLd(p: { description: string }) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: `${url}/contact`,
    name: "Contact Peyman Consulting",
    description: p.description,
    about: { "@id": `${url}/#organization` },
    isPartOf: { "@id": `${url}/#website` },
  };
}

/** Person node for the founder profile (About page); facts from the brief only. */
export function personJsonLd(p: { name: string; jobTitle: string; description: string; knowsAbout: readonly string[] }) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}/about#founder`,
    name: p.name,
    jobTitle: p.jobTitle,
    description: p.description,
    knowsAbout: p.knowsAbout,
    worksFor: { "@id": `${url}/#organization` },
    url: `${url}/about`,
  };
}
