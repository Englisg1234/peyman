import { SiteHeader } from "@/components/layout/site-header";

// `@header` slot for /recognition (DEC-01: one slot page per route).
export default function RecognitionHeader() {
  return <SiteHeader currentPath="/recognition" />;
}
