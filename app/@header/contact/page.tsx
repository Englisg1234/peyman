import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /contact (DEC-01: one slot page per route).
export default function ContactHeader() {
  return <SiteHeader currentPath="/contact" />;
}
