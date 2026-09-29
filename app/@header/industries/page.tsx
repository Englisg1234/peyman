import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /industries (DEC-01: one slot page per route).
export default function IndustriesHeader() {
  return <SiteHeader currentPath="/industries" />;
}
