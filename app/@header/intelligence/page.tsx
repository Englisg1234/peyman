import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /intelligence (DEC-01: one slot page per route).
export default function IntelligenceHeader() {
  return <SiteHeader currentPath="/intelligence" />;
}
