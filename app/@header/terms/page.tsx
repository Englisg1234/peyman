import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /terms (DEC-01: one slot page per route).
export default function TermsHeader() {
  return <SiteHeader currentPath="/terms" />;
}
