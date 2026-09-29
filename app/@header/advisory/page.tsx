import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /advisory (DEC-01: one slot page per route).
export default function AdvisoryHeader() {
  return <SiteHeader currentPath="/advisory" />;
}
