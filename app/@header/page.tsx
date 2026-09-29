import { SiteHeader } from '@/components/layout/site-header';

// `@header` slot for `/` (DEC-01 notes, task 7.2). The root layout is shared
// with not-found and cannot read the pathname without a client hook, so each
// route states its Brand_Mark `aria-current` here (Req 7.11). `/` is the only
// route in v1 (Req 19.1).
export default function HomeHeader() {
  return <SiteHeader current />;
}
