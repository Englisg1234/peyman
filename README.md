# Peyman Consulting website

The Peyman Consulting public website: Next.js 16 (App Router, static rendering), React 19, TypeScript (strict), Tailwind CSS v4, GSAP (Hero only) and a Supabase-backed inquiry form.

All company facts come from `reference/peyman-brief.pdf`. Unknown values (email domain, LinkedIn URL, photographs) are `null` in `data/company.ts` and are omitted from the UI until supplied.

## Routes

`/`, `/advisory`, `/industries` (who we support), `/intelligence`, `/insights`, `/insights/[slug]`, `/about`, `/recognition`, `/contact`, `/privacy`, `/terms`, plus `/sitemap.xml`, `/robots.txt`, `/opengraph-image`, `/icon` and a 404 page.

## Structure

| Path | Contents |
|---|---|
| `data/` | Content: `company.ts` (facts, founder, recognition, engagement), `services.ts`, `industries.ts`, `intelligence.ts`, `insights.ts` (article registry), `site-config.ts` (hero, header, nav) |
| `components/hero`, `components/motion` | The cinematic Hero and its GSAP motion (post-hydration chunk) |
| `components/layout` | Header, mobile menu, footer |
| `components/sections` | Page header, section, section header, contact band, jump list, legal shell |
| `components/home`, `advisory`, `insights`, `recognition`, `about`, `contact` | Page-specific components |
| `components/ui` | Button and arrow-link primitives |
| `app/site.css` | Site design system (tokens, type, layout, components). `app/globals.css` holds the palette, Hero and header |
| `supabase/migrations` | Inquiry table and row-level security |

To publish an article, append it to `articles` in `data/insights.ts`; the index, article page, sitemap and Article JSON-LD pick it up. To add a recognition photograph, import it and add it to that item's `images` in `data/company.ts`.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Before launch | Origin for canonical URLs, OG tags, sitemap, JSON-LD |
| `SUPABASE_URL` | For the form | Supabase project URL (server-only) |
| `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` | For the form | Public key; RLS allows INSERT only. Never a service-role key |
| `INQUIRY_WEBHOOK_URL`, `INQUIRY_WEBHOOK_SECRET` | Optional | Notification hook: each stored inquiry is POSTed as JSON |

Supabase setup: run `supabase/migrations/0001_inquiries.sql` (CLI `supabase db push` or the SQL editor). Read inquiries in the Supabase dashboard. `SUPABASE_URL` must be https, except loopback (`http://127.0.0.1:54321`, the local `supabase start` stack).

Inquiry smoke test: `npm run build && npm run smoke:inquiry` starts the production server against a local PostgREST stand-in and checks, through the real form, the success state, the stored row, the webhook, that no key reaches the browser, and the server-error state.

## Requirements

- Node.js ≥ 20.9.0 (`.nvmrc` pins major 24, which CI should use)
- npm (the committed `package-lock.json` is the source of truth; install with `npm ci`)

All dependencies are pinned to exact versions. Do not add range operators (`^`, `~`) or dist-tags.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (`next build`, includes type checking). Site_Config is validated in non-production mode (warnings only) |
| `npm run release:check` | Strict Site_Config release gate (Vitest, `PEYMAN_RELEASE=1`). Fails while any integration is pending |
| `npm run build:release` | `release:check`, then `next build` with `PEYMAN_RELEASE=1`. The only build the release pipeline may deploy |
| `npm run build:fixture` | Test-only build with the live-nav fixture (`PEYMAN_CONFIG_FIXTURE=nav-live`) into `.next-fixture` (DEC-05). Never deployable |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` in strict mode |
| `npm run lint` | `eslint .` (flat config with `eslint-config-next` and import-boundary rules) |
| `npm test` | Vitest unit and fast-check property tests (`tests/unit`, `tests/property`) |
| `npm run test:e2e` | Playwright against `next start` (run `npm run build` and `npm run build:fixture` first; `@nav-live` tests use the fixture build) |
| `npm run warm:images` | Warm every emblem derivative on a running server under both Accept variants and check the Req 13.6 budgets (see "Image optimizer warm-up") |

## Fonts and licenses

Both families are self-hosted at build time through `next/font/google` (no runtime request to Google).

| Family | Use | License |
|---|---|---|
| [Inter](https://github.com/rsms/inter) (variable, `wght` + `opsz`) | Display, heading, body, CTA/nav, wordmark | SIL Open Font License 1.1 (OFL-1.1) |
| [Source Code Pro](https://github.com/adobe-fonts/source-code-pro) (400) | Meta / eyebrow, including the IPA note | SIL Open Font License 1.1 (OFL-1.1) |

Only the Inter latin file is preloaded. Source Code Pro is not preloaded and downloads only when meta text renders. The type roles are the `type-*` utilities in `app/globals.css`.

## Release gate

`data/site-config.ts` is validated on every build (DEC-03). Both CTA destinations are resolved (`/contact`, `/advisory`), so `npm run release:check` passes. The gate still rejects pending integrations, placeholder emails (for example `[domain]`) and test fixtures, so keep using `npm run build:release` for deployable builds.

## E2E and ports

Playwright serves the production builds on `PORT` (default 3000) and `PORT + 1`, and reuses a server already listening there. If `next dev` is running on 3000, run the suite on other ports, for example `$env:PORT=3100; npm run test:e2e`.

## Image optimizer warm-up

`next/image` encodes each emblem derivative on its first request, and AVIF encoding of the large candidates takes seconds (risk R1). A cold optimizer would skew LCP, Lighthouse scores and screenshots, so every environment warms it before anything is measured or served:

```powershell
npx next start -p 3000        # or the deployed server
npm run warm:images           # default http://127.0.0.1:3000
npm run warm:images -- http://127.0.0.1:3001      # another base URL (or set WARM_IMAGES_BASE_URL)
```

The script (`scripts/warm-images.mjs`, Node built-ins only) fetches `/`, collects every `/_next/image` URL from `img` `src`/`srcset` and the preload `imagesrcset`, and requests each twice: with an AVIF-first `Accept` header and with a WebP-only one (Next caches each format separately). It prints width, content type, bytes, budget and cache status per derivative, and exits non-zero on any non-2xx response, a candidate wider than 1240 px, or a derivative over its Req 13.6 budget (AVIF ≤ 90 KB up to 440 px wide, ≤ 180 KB above; WebP ≤ 130 / 260 KB).

- **CI.** Run it after `next start` and before Lighthouse CI, screenshot capture or any timed test. Playwright does this itself: its `globalSetup` (`tests/e2e/support/warm-images.ts`) warms every project's server once per run, after the webServers are up.
- **Deploy.** Run it against each new deployment before it receives traffic. Every instance with its own image cache (`<distDir>/cache/images`) needs its own warm-up. Warmed entries live for `minimumCacheTTL` (4 h) and are then revalidated in the background.
