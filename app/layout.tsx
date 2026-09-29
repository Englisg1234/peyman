import type { CSSProperties, ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { RevealLoader } from '@/components/motion/reveal-loader';
import { JsonLd } from '@/components/seo/json-ld';
import { company, founder } from '@/data/company';
import { services } from '@/data/services';
import { siteConfig } from '@/data/site-config';
import { toCssVars } from '@/lib/motion-tokens';
import { organizationJsonLd } from '@/lib/seo';
import { siteUrl } from '@/lib/site';
import { runSiteConfigGate, warningScript } from '@/lib/site-config-gate';
import './globals.css';

// Inter carries every role except meta (design D1). Variable weight plus the
// opsz axis, so the headline resolves to the Display cut (opsz 32) through
// font-optical-sizing: auto. The latin file is the only preloaded font (Req 13.7).
const inter = Inter({
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,
});

// Meta role only (includes ɒ and ː for the IPA note). Not preloaded: the file
// downloads only when meta text renders, which v1 does not do by default.
const sourceCodePro = Source_Code_Pro({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-source-code-pro',
});

// Display stack for the h1: the Inter face first, then the display-tuned
// Arial face from globals.css, then next/font's generic (opsz 14 tuned)
// fallback. next/font hashes the family names, so the stack is built from
// its resolved fontFamily at build time (Req 16.3).
const [interFace, ...interFallbacks] = inter.style.fontFamily.split(',').map((f) => f.trim());
const displayStack = [interFace, "'Inter Display Fallback'", ...interFallbacks].join(', ');

// Motion tokens as CSS custom properties on <html>, so CSS and GSAP read one
// source (Req 9.3). Serialized at build time; no runtime JS.
const rootStyle = { ...toCssVars(), '--font-display-stack': displayStack } as CSSProperties;

// Document title and description (Req 16.6): exactly "Peyman Consulting" and
// the Supporting_Copy, both from Site_Config (`meta.description` is the same
// constant as `hero.supportingCopy`).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: siteConfig.meta.title, template: '%s · Peyman Consulting' },
  description: siteConfig.meta.description,
  applicationName: siteConfig.meta.title,
  formatDetection: { telephone: false, email: false, address: false },
};

// Organization + ProfessionalService + founder Person (brief facts only).
const orgLd = organizationJsonLd({
  description: company.summary,
  locality: company.location.locality,
  region: company.location.region,
  country: company.location.country,
  founderName: founder.name,
  founderRole: founder.role,
  serviceNames: services.map((s) => s.title),
  sameAs: company.linkedin ? [company.linkedin] : [],
});

// Viewport meta (Req 16.5). `viewport-fit=cover` lets the stage run under the
// notch and home indicator; every edge that holds content adds its
// env(safe-area-inset-*) (header top, Hero gutters and bottom padding, menu).
// Zoom stays enabled: no maximumScale or userScalable (WCAG 1.4.4, Req 12.6).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: siteConfig.meta.themeColor,
};

// Root layout (RSC).
//
// The Site_Header comes from the `@header` parallel-route slot (task 7.2):
// app/@header/page.tsx renders it for `/` with Brand_Mark `aria-current`,
// app/@header/default.tsx renders it without. This layout also wraps
// not-found and has no pathname, so the route decides `current` (Req 7.11)
// without a client hook (Req 13.8). Next renders no slot for the not-found
// route (`header` is undefined there), so the layout falls back to the header
// without `aria-current`. See docs/decisions.md (DEC-01).
export default function RootLayout({
  children,
  header,
}: Readonly<{ children: ReactNode; header: ReactNode }>) {
  // Site_Config gate (DEC-03). Release builds (PEYMAN_RELEASE=1) throw here
  // during prerender, failing `next build` with every offending key. Other
  // builds get one console.warn per offending CTA key per page load (Req 17.12)
  // from a tiny inline script; nothing is emitted when there are no warnings.
  const configWarnings = warningScript(runSiteConfigGate(siteConfig));

  return (
    <html lang="en" className={`${inter.variable} ${sourceCodePro.variable}`} style={rootStyle}>
      <body>
        {header ?? <SiteHeader />}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <RevealLoader />
        <JsonLd data={orgLd} />
        {configWarnings && <script dangerouslySetInnerHTML={{ __html: configWarnings }} />}
      </body>
    </html>
  );
}
