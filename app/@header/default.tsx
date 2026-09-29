import { SiteHeader } from '@/components/layout/site-header';

// `@header` fallback for every URL without its own slot page (hard loads of
// future routes). No `aria-current` (Req 7.11). A route that ships later must
// add `app/@header/<segment>/page.tsx`, because on soft navigation Next keeps
// the previously matched slot page (see docs/decisions.md, DEC-01).
export default function DefaultHeader() {
  return <SiteHeader />;
}
