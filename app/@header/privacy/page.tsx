import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /privacy (DEC-01: one slot page per route).
export default function PrivacyHeader() {
  return <SiteHeader currentPath="/privacy" />;
}
