import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /about (DEC-01: one slot page per route).
export default function AboutHeader() {
  return <SiteHeader currentPath="/about" />;
}
