import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /insights (DEC-01: one slot page per route).
export default function InsightsHeader() {
  return <SiteHeader currentPath="/insights" />;
}
