# Implementation Plan: Cinematic Hero

## Overview

This plan builds the PEYMAN homepage hero and the Site_Header in TypeScript on Next.js 16 App Router, React 19, Tailwind CSS v4 and GSAP, following `design.md`. Order of work:

1. Foundation, tokens, typography, the emblem asset and Site_Config (with its release gate).
2. Components: CTA primitive, header, navigation and Mobile_Menu, then the Hero shell, copy, emblem stage and atmosphere.
3. Responsive and mobile layout, then the CSS-first intro.
4. GSAP enhancement after hydration, reduced motion, image optimization and fallbacks.
5. Accessibility hardening, CI budgets, mobile QA, visual QA and final acceptance.

The page is a static server-rendered composition that works without JavaScript. Only three client leaves plus the post-hydration motion chunk exist.

Approved scope for v1 (owner decisions that override or refine `requirements.md`, recorded in `docs/decisions.md` by the tasks named):

- Inter plus Source Code Pro (D1, D2, D5).
- `logo-alternative.png` as the emblem.
- Layered raster stage only; `three/` is reserved and not created.
- Text in columns 1–7 and emblem in 8–12 (D3).
- No Lenis.
- `nav.showPlanned = false` (overrides Req 7.16). The zero-live-nav header state is DEC-01 (task 7.2).
- CTA destinations are typed pending integrations (DEC-02, task 5.1). A release gate replaces an always-failing `next build` (DEC-03, task 5.2).
- No email address, domain, LinkedIn URL or fake page is invented anywhere.

Out of scope: backend, database, auth, CMS, payments, APIs, server endpoints, forms, analytics and any page other than `/`.

Every implementation sub-task lists these fields:

- Files
- Objective
- Depends on
- Acceptance
- Mobile
- A11y
- Perf
- A `_Requirements_` line

## Tasks

- [x] 1. Project foundation
  - [x] 1.1 Scaffold the Next.js 16 App Router project with the pinned stack
    - Files: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts` (empty config object), `postcss.config.mjs` (`@tailwindcss/postcss`), `app/layout.tsx` (`<html lang="en">`, `<body>`, `<main id="main" tabIndex={-1}>`), `app/page.tsx` (returns `null` until task 10.6), `app/globals.css` (`@import "tailwindcss";`), `.gitignore`, `.nvmrc`, `README.md` (overview and scripts), `docs/decisions.md`
    - Objective: install every package in the requirements Pinned versions table at exact versions (no `^`, `~` or dist-tags) and set `"engines": { "node": ">=20.9.0" }`. Enable TypeScript `strict`. Do not install Lenis, three, R3F, drei, Framer Motion, icon kits, UI kits or CSS-in-JS.
    - TypeScript: try 7.0.2 first. If `next build` type-checking fails because of a TS 7 incompatibility, pin 6.0.3. Record the error and the reason in `docs/decisions.md`. Req 14.9 names the design document, so also add a one-line note to the design's R10 row at that time.
    - Depends on: none
    - Acceptance: `npm ci`, `npx tsc --noEmit` and `npx next build` succeed on Windows PowerShell and in CI. `package.json` contains only exact versions from the table.
    - Mobile: none yet.
    - A11y: `html[lang="en"]`; a single `main#main` landmark.
    - Perf: no client components; no third-party scripts.
    - _Requirements: 12.9, 14.1, 14.3, 14.9, 19.2_

  - [x] 1.2 Configure lint, unit/property test and e2e tooling
    - Files: `eslint.config.mjs`, `vitest.config.ts`, `tests/setup.ts`, `playwright.config.ts`, `tests/e2e/support/viewports.ts`, `package.json` (scripts)
    - Objective, ESLint: flat config with `eslint-config-next`. Add `no-restricted-imports` rules:
      - `components/layout/*` must not import `components/hero/*` or `components/motion/hero-motion`.
      - `components/ui/*` and `lib/*` must not import `components/*`.
      - `gsap`, `gsap/*` and `@gsap/react` may be imported only in `lib/gsap.ts` and `components/motion/*`.
      - `lenis`, `three`, `@react-three/*` and `framer-motion` are banned.
    - Objective, Vitest: node environment, `tests/unit` + `tests/property`, and `fc.configureGlobal({ numRuns: 100 })` in the setup file. There is no DOM environment: jsdom is not in the pinned table (Req 14.1). DOM behavior is tested in Playwright.
    - Objective, Playwright: a Chromium project; `webServer: next start`; `retries: 2` in CI. Export the Test_Viewports (including 1920×1080 at DPR 2 and 3840×2160) as named constants.
    - Objective, scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:e2e`.
    - Depends on: 1.1
    - Acceptance: `npm run lint`, `npm run typecheck` and `npm test` pass (an empty suite is allowed). A deliberate forbidden import fails lint.
    - Mobile: the viewport list covers 320×568 through 414×896 plus landscape 667×375 and 844×390.
    - A11y: none directly (tooling only).
    - Perf: tooling stays in devDependencies only.
    - _Requirements: 14.1, 14.3, 14.4, 15.5, 15.8, 20.1, 20.7_

  - [x] 1.3 Write repository conformance tests
    - Files: `tests/unit/architecture.test.ts`
    - Objective: statically assert all of the following:
      - Every dependency is pinned exactly.
      - No banned package appears in `package.json` or `package-lock.json`.
      - There is no `three/` directory and no empty directory.
      - Every `components/**/*.tsx` file is ≤ 150 physical lines and exports exactly one component.
      - The import graph has no cycles.
      - GSAP imports appear only in `lib/gsap.ts` and `components/motion/*`.
    - Depends on: 1.2
    - Acceptance: the test passes now and keeps running on every later task.
    - Mobile: none.
    - A11y: none.
    - Perf: guards bundle hygiene (no stray heavy libraries).
    - _Requirements: 14.1, 14.3, 14.4, 15.2, 15.3, 15.5, 15.8, 19.2_

- [x] 2. Design tokens
  - [x] 2.1 Define palette, layout and layer tokens in Tailwind v4 `@theme`
    - Files: `app/globals.css`
    - Objective: `@theme` with the 9 Palette colors and cleared namespaces (`--color-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--breakpoint-*`). Add:
      - breakpoints md 48rem / lg 64rem / xl 80rem / 3xl 120rem;
      - containers `content-wide` 85rem and `content-ultra` 105rem;
      - custom variants `landscape-short`, `compact`, `fine` and `pressed`;
      - z-index custom properties (content 0–10, header 50, backdrop 60, panel 70, skip 100);
      - a base `:focus-visible` rule (2 px `ivory-50` outline, 3 px offset);
      - `html` background `ink-950`, text `ivory-50`, and `scroll-padding-top: calc(var(--header-h) + env(safe-area-inset-top) + 8px)`.
    - Depends on: 1.1
    - Acceptance: default Tailwind colors, radii and shadows are unavailable (using one fails to generate CSS). The tokens compile.
    - Mobile: breakpoints and variants match the design Layout table.
    - A11y: the focus indicator is never gold.
    - Perf: CSS only.
    - _Requirements: 2.1, 4.1, 4.9, 7.12, 12.3_

  - [x] 2.2 Implement the WCAG contrast module and pairing registry
    - Files: `lib/contrast.ts`
    - Objective: `contrastRatio(fg, bg, fgAlpha?)` using WCAG 2.x relative luminance with alpha compositing. `PAIRINGS` lists every allowed text/surface/UI pairing:
      - the Req 12.2 rows;
      - `ivory-50`/`ivory-300` on `navy-800`;
      - the Secondary_CTA border (`ivory-50` at 44%) over `navy-950`/`navy-900`/`ink-950`;
      - `ivory-300` on the scrolled header composite.
    - Depends on: 1.2
    - Acceptance: computed values match the design's contrast list to two decimals.
    - Mobile: none.
    - A11y: this is the source of truth for allowed pairings.
    - Perf: test-time only; never imported by components.
    - _Requirements: 4.8, 12.1, 12.2_

  - [x]* 2.3 Write property test for contrast pairings
    - **Property 5: Allowed pairings meet contrast; forbidden pairings are absent**
    - **Validates: Requirements 4.1, 4.8, 12.1, 12.2**
    - File: `tests/property/contrast.property.test.ts`. Tag: `// Feature: cinematic-hero, Property 5`. At least 100 runs.

  - [x] 2.4 Implement the motion token module and easing solver, and inject CSS variables
    - Files: `lib/motion-tokens.ts`, `lib/ease.ts`, `app/layout.tsx`
    - Objective: implement `duration`, `delay`, `curve`, `distance`, `toCssVars()` and `INTRO_TIMELINE` exactly as in the design Interfaces. `cubicBezier()` returns GSAP-compatible ease functions (no CustomEase). The layout applies `toCssVars()` as inline style on `<html>` so CSS and GSAP read one source.
    - Depends on: 1.1
    - Acceptance: `--dur-reveal: 720ms`, `--ease-entrance: cubic-bezier(0.16, 1, 0.3, 1)` and similar variables are present in the SSR HTML.
    - Mobile: none.
    - A11y: none.
    - Perf: no runtime JS; values serialized at build time.
    - _Requirements: 9.2, 9.3_

  - [x]* 2.5 Write property test for easing curves
    - **Property 11: Easing curves stay in range**
    - **Validates: Requirements 9.2**
    - File: `tests/property/ease.property.test.ts`.

  - [x]* 2.6 Write property test for the intro timeline bounds
    - **Property 12: Intro timeline honors its bounds**
    - **Validates: Requirements 9.3, 9.5**
    - File: `tests/property/intro-timeline.property.test.ts`.

  - [x]* 2.7 Write unit tests for token consistency
    - Files: `tests/unit/motion-tokens.test.ts`, `tests/unit/contrast.test.ts`
    - Test that every `var(--dur-*|--delay-*|--ease-*)` referenced in `app/globals.css` exists in `toCssVars()`, and that `PAIRINGS` includes every Req 12.2 row.
    - _Requirements: 9.3, 12.2_

- [x] 3. Typography
  - [x] 3.1 Load Inter and Source Code Pro and define the type roles
    - Files: `app/layout.tsx`, `app/globals.css`, `README.md` (font licenses)
    - Objective, fonts:
      - `Inter({ subsets:['latin'], axes:['opsz'], display:'swap', variable:'--font-inter', adjustFontFallback:true })` is the only preloaded font file.
      - `Source_Code_Pro({ subsets:['latin','latin-ext'], weight:'400', preload:false, variable:'--font-source-code-pro' })`.
      - `@theme inline` maps them to `--font-sans` and `--font-mono`.
      - Add a display-tuned `@font-face` fallback (`local('Arial')` with `size-adjust` and `ascent-override` measured against Inter at opsz 32) for the h1 only.
    - Objective, roles: define Display, menu display, Heading, Body, CTA/nav, Wordmark (D5) and Meta as utilities using the design's typography table values. The Display role uses `clamp(2.25rem, 0.29rem + 4.13vw, 4.25rem)`, `5.25rem` from 1920, line-height 1.06, −0.02em, `text-wrap: balance` and `hyphens: none`. Meta is uppercase, and IPA spans get `text-transform: none`.
    - Objective, licenses: record OFL-1.1 for both families in the README.
    - Depends on: 2.1, 2.4
    - Acceptance: exactly one font `<link rel="preload">` (≤ 110 KB) in the HTML. No role sets `text-transform` on the headline, copy or CTAs.
    - Mobile: body text is never below 16 px and no text is below 12 px at 320.
    - A11y: `display: swap` means no invisible text.
    - Perf: one preloaded file (about 71 KB). Source Code Pro downloads only when meta text renders, which never happens in v1 by default.
    - _Requirements: 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.10, 13.7, 16.3, 16.7_

  - [x] 3.2 Implement the headline size and measure model in the layout oracle
    - Files: `lib/layout-model.ts` (initial: `Band`, `bandFor()`, `headlineFontSize()`, `headlineMeasureEm()`, `predictLines(measureEm, ratio)`), `docs/decisions.md`
    - Objective: mirror the CSS headline ramp and the container measure caps (8.4em / 9.6em / `min(13em, 20ch)`) from the design's Headline line breaks section. Measure the Display-cut width ratio r of the shipped Inter file. Adjust only the caps if r < 0.95 (risk R3), and record r.
    - Depends on: 1.2
    - Acceptance: the model reproduces the design's line-break table (3/4/5 lines) at every Test_Viewport.
    - Mobile: 5 lines at 320–360 and 4 lines at 375–414 and at 667×375.
    - A11y: no clipping and no hyphenation by construction.
    - Perf: pure module, used only in tests.
    - _Requirements: 6.2, 6.8, 6.9, 16.3_

  - [x] 3.3 Write property test for the headline size ramp (required)
    - **Property 1: Headline size is bounded and non-decreasing**
    - **Validates: Requirements 6.8, 11.4**
    - File: `tests/property/headline-size.property.test.ts`. Widths are integers 320–3840. At least 100 runs.

  - [x]* 3.4 Write property test for line-count stability across font swap
    - **Property 2: Headline line count is stable across font swap**
    - **Validates: Requirements 6.9, 16.3**
    - File: `tests/property/headline-lines.property.test.ts`.

- [x] 4. Emblem asset pipeline
  - [x] 4.1 Produce the trimmed, padded emblem master from `logo-alternative.png`
    - Files: `scripts/prepare-emblem.py` (Python + Pillow, outside the npm graph), `assets/emblem/peyman-emblem.png`, `assets/emblem/README.md`
    - Objective: the script does four things and nothing else. It must not recolor, retouch, redraw or vectorize.
      1. Trim to the alpha bounding box. Assert the result is 972×1108.
      2. Pad 11 px transparent on all four sides, giving 994×1130.
      3. Assert that the content pixels equal the source crop byte-for-byte.
      4. Print the SHA-256.
    - The README records the command, the operations, the SHA-256 and the measured column-axis anchor (estimated `{ x: 0.30, y: 0.52 }`). `reference/` files stay untouched, and the two unused logos are not shipped.
    - Depends on: none
    - Acceptance: the committed master is 994×1130 RGBA, its aspect ratio is within ±1% of 972/1108, and its SHA matches the README.
    - Mobile: the same master feeds every mobile size.
    - A11y: none.
    - Perf: the master is only an optimizer input and is never linked directly.
    - _Requirements: 4.4, 5.1, 19.3_

  - [x] 4.2 Configure the next/image optimizer for emblem derivatives
    - Files: `next.config.ts`
    - Objective: set `images` to:
      - `formats: ['image/avif','image/webp']`
      - `qualities: [70]`
      - `imageSizes: [32,48,64,96,128,192,256,384]`
      - `deviceSizes: [512,640,750,828,1080,1240]`
      - `minimumCacheTTL` at or above the default
    - No remote patterns.
    - Depends on: 1.1
    - Acceptance: the largest generated candidate is ≤ 1240 px and AVIF is served for `Accept: image/avif`.
    - Mobile: small widths (96–256) exist for mobile emblem sizes.
    - A11y: none.
    - Perf: AVIF first, bounded candidate set.
    - _Requirements: 5.2, 5.5, 13.6_

  - [x]* 4.3 Write unit test for emblem asset integrity
    - File: `tests/unit/emblem-asset.test.ts`. Parse the PNG IHDR with no extra dependency: dimensions 994×1130, ratio ±1%, SHA-256 equal to `assets/emblem/README.md`.
    - _Requirements: 5.1, 19.3_

- [x] 5. Site_Config, CTA integration points and release gate
  - [x] 5.1 Implement typed Site_Config with pending CTA destinations (DEC-02)
    - Files: `lib/site-config-schema.ts`, `data/site-config.ts`, `lib/cta.ts`
    - Objective, types: all types from the design Data Models, with these changes:
      ```ts
      type CtaDestination =
        | { kind: 'pending'; integration: 'contact-feature' | 'advisory-feature'; note: string }
        | { kind: 'resolved'; href: Href };
      ```
    - Objective, CTA values:
      - `cta.primary` = "Start a Conversation" → pending `contact-feature`.
      - `cta.secondary` = "Explore Advisory" → pending `advisory-feature`.
      - There is no `contact.email` in v1. No domain, email or LinkedIn URL is invented.
      - `resolveCtaHref(dest)` returns `href` for resolved destinations. For pending ones it returns the documented placeholder fragment `#pending-contact-feature` or `#pending-advisory-feature` (in-page, no navigation away, never `#` alone).
    - Objective, other defaults:
      - `nav.showPlanned: false` (owner override of Req 7.16).
      - The six Nav_Items (Advisory, Industries, Intelligence, Insights, About, Contact) as `planned`, with no rendered href.
      - Etymology_Note and Service_Index disabled.
      - `emblem.kind: 'raster'`, `aspectRatio: 994/1130`, the anchor from 4.1 and a poster static import.
      - The typography record (Inter / Source Code Pro, OFL-1.1).
      - All approved strings verbatim.
    - Objective, comments: at the `cta` site, a comment block states where each future feature connects: replace `{ kind: 'pending' }` with `{ kind: 'resolved', href }` in the Contact and Advisory features.
    - Depends on: 4.1, 1.2
    - Acceptance: a missing key or a wrong type fails `tsc`. No hero or header string lives outside this file.
    - Mobile: none.
    - A11y: accessible names (`homeLabel`, menu labels, skip link) come from config.
    - Perf: a build-time constant.
    - _Requirements: 1.2, 1.5, 1.6, 3.7, 5.6, 14.5, 15.4, 19.2, 19.4_

  - [x] 5.2 Implement validation, the non-production warnings and the explicit release gate (DEC-03)
    - Files: `lib/site-config-schema.ts` (`validateSiteConfig`), `lib/site-config-gate.ts`, `app/layout.tsx`, `vitest.release.config.ts`, `tests/release/site-config.release.test.ts`, `package.json` (scripts `release:check`, `build:release`), `README.md` ("Integration points and release gate" section), `docs/decisions.md`
    - Objective, `validateSiteConfig(cfg, mode)` reports these reasons:
      - `pending-integration`
      - `unresolved-cta` (empty, `#`, bracket token)
      - `placeholder-email` (any `mailto:` with a bracketed domain)
      - `invalid-nav-status`
      - `model-without-renderer`
      - `fixture-config` (added in 8.3)
    - Objective, non-production: `lib/site-config-gate.ts` returns warnings. `app/layout.tsx` renders a tiny inline `<script>` that runs `console.warn` exactly once per offending CTA key per page load. It emits nothing when there are no warnings, and it adds no client component.
    - Objective, release: when `PEYMAN_RELEASE=1`, the gate throws during prerender and names every offending key, so the build exits non-zero with no deployable output. `npm run release:check` runs `vitest run --config vitest.release.config.ts` (which sets `PEYMAN_RELEASE=1`). `build:release` = `npm run release:check && next build`.
    - Record in `docs/decisions.md`:
      - Plain `next build` (local and preview) succeeds while integrations are pending.
      - The release pipeline must use `build:release` or set `PEYMAN_RELEASE=1`. This refines "production Build" in Req 14.6 to mean "release build".
      - Validation runs from the layout instead of `next.config.ts` (a design deviation). The config loader cannot import the static image module referenced by Site_Config.
    - Depends on: 5.1
    - Acceptance:
      - `npm run build` passes and logs 2 warnings.
      - `npm run release:check` fails and names `cta.primary.destination` and `cta.secondary.destination`. This is expected until the Contact and Advisory features land.
      - The README explains how to resolve each integration.
    - Mobile: none.
    - A11y: none.
    - Perf: the inline script is under 300 bytes and exists only in non-release builds.
    - _Requirements: 1.7, 14.6, 17.12, 18.7, 19.7_

  - [x] 5.3 Write property test for Site_Config validation (required)
    - **Property 9: Site_Config validation reports exactly the offending keys**
    - **Validates: Requirements 14.5, 14.6, 17.12, 19.7**
    - File: `tests/property/site-config-validation.property.test.ts`. Generators mix pending/resolved destinations, empty, `#` and bracket hrefs, bracket-domain mailto values, invalid nav statuses and `emblem.kind`. At least 100 runs.

  - [x]* 5.4 Write unit tests for the shipped Site_Config
    - File: `tests/unit/site-config.test.ts`. Test:
      - Exact approved strings.
      - `showPlanned === false`.
      - Flags disabled.
      - `kind === 'raster'`.
      - Non-production mode passes with exactly 2 warnings.
      - Production mode fails naming both CTA keys.
      - No `[domain]` or invented email anywhere.
    - _Requirements: 1.2, 3.7, 14.6, 17.12_

- [x] 6. CTA components
  - [x] 6.1 Build the UI primitives `ButtonLink` and `VisuallyHidden`
    - Files: `components/ui/button-link.tsx`, `components/ui/visually-hidden.tsx`, `app/globals.css` (CTA variant styles)
    - Objective, `ButtonLink` renders a server-side `<a href>` with variants `primary`, `secondary` and `quiet`:
      - It has no `role`, no handlers and 0 radius.
      - Hover and press use an overlay layer that fades opacity over `--dur-micro`. Color is never animated.
      - The Secondary border is `ivory-50` at 44% with a `gold-500` hover overlay.
      - The `pressed` variant mirrors hover on touch.
      - It uses `min-block-size` 48/52/44, never a fixed height.
      - In forced colors it gets a 1 px `ButtonText` border.
    - Depends on: 2.1, 3.1
    - Acceptance: the markup is `<a>` with a non-empty href. No `cursor` or `pointer-events` tricks.
    - Mobile: targets ≥ 48 px tall below 1024 and 44 px for `quiet`. `:active` feedback on `hover: none`.
    - A11y: `:focus-visible` ring is 2 px `ivory-50` with a 3 px offset. Labels are never transformed. Buttons grow under WCAG 1.4.12 text spacing.
    - Perf: pure CSS states; zero JS.
    - _Requirements: 1.7, 3.3, 4.2, 9.1, 10.8, 10.9, 12.3, 12.7, 12.8, 14.3_

  - [x] 6.2 Build `HeroActions` with config-driven destinations
    - Files: `components/hero/hero-actions.tsx`, `app/globals.css` (`.cta-group` layout)
    - Objective: render Primary then Secondary `ButtonLink`, with labels from `cta.*.label` and hrefs from `resolveCtaHref()`. Layout:
      - Below 768: stacked full width, 12 px gap, labels start-aligned.
      - At 768 and above: one row with a 16 px gap, wrapping with a 12 px row gap.
      - `.cta-group:focus-within { animation: none }`.
      - No ancestor ever gets `pointer-events: none`, `inert`, `visibility: hidden` or `aria-hidden`.
    - Depends on: 6.1, 5.1
    - Acceptance: DOM order is Primary then Secondary, and the component contains no string literals.
    - Mobile: full-width 48 px CTAs, thumb-reachable, Primary first.
    - A11y: the tab order follows DOM order, and CTAs are operable during the intro.
    - Perf: RSC.
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 3.4, 10.5, 11.6, 11.8_

  - [x]* 6.3 Write unit tests for CTA markup
    - File: `tests/unit/cta.test.tsx` (uses `renderToStaticMarkup`). Test:
      - The `<a>` element, its href and the absence of `role`/`onclick`.
      - Variant classes.
      - Primary before Secondary.
      - Exact labels.
      - The pending placeholder fragment.
    - _Requirements: 1.2, 1.7, 3.4_

- [x] 7. Global header shell
  - [x] 7.1 Build `BrandMark`
    - Files: `components/layout/brand-mark.tsx`
    - Objective: a link to `/` with `aria-label` from `brand.homeLabel` ("Peyman Consulting, home") and `aria-current="page"` on `/`.
      - Emblem thumbnail: `next/image` with `sizes="28px"` (32 px at 1024 and above), `loading="eager"` and `alt=""`, inside a fixed box that is kept if the image fails.
      - Typeset wordmark "PEYMAN CONSULTING" in the wordmark role, authored uppercase, on one line.
    - Depends on: 5.1, 4.2, 3.1
    - Acceptance: the image is unfiltered and unmasked with a uniform scale. Brand plus trigger fit within 280 px at 320.
    - Mobile: 12 px wordmark below 360 and 13 px up to 1023.
    - A11y: one accessible name and no redundant alt text.
    - Perf: thumbnail about 2–5 KB, not preloaded.
    - _Requirements: 4.4, 4.5, 4.6, 7.11, 17.2_

  - [x] 7.2 Build the `SiteHeader` shell, skip link and zero-live-nav state (DEC-01)
    - Files: `components/layout/site-header.tsx`, `app/layout.tsx` (render `SiteHeader` before `main#main`), `app/globals.css` (header styles), `docs/decisions.md`
    - Objective, structure:
      - A fixed header at z 50 with 3 zones.
      - Heights: 64 px below 1024, 72 px at 1024 and above, 56 px under `landscape-short`, each plus `env(safe-area-inset-top)`. Constant across scroll.
      - The skip link is the first focusable element: visually hidden until focused, then shown at z 100.
      - The header CTA is `ButtonLink` `quiet` with the primary label and destination. It is shown at 768 and above and `display: none` below 768.
      - The scrolled-state background is a separate opacity layer.
    - Objective, DEC-01: when `renderedNavItems` is empty, the header renders Brand_Mark plus the header CTA only. There is no menu trigger, no Mobile_Menu, no no-JS disclosure and no empty `nav` landmark. The Hero Primary_CTA is the mobile action. Record in `docs/decisions.md` that this refines Req 7.5, 7.13, 8, 12.4 (no `nav` landmark when there are no items), 12.5 (focus order without nav or trigger) and 17.4 for the zero-item case.
    - Depends on: 7.1, 6.1, 5.2
    - Acceptance: the default build renders no `nav`, no trigger and no `details`. The skip link moves focus to `main#main`.
    - Mobile: the 64 px header at 320 shows the Brand_Mark only; landscape uses 56 px; safe-area top padding applies.
    - A11y: one `header` landmark. Focus order: skip, brand, header CTA (≥ 768), Primary, Secondary.
    - Perf: RSC; fixed height, so CLS is 0.
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7, 7.12, 7.14, 7.15, 10.11, 12.4, 12.5, 15.5, 19.5_

  - [x] 7.3 Build `HeaderScrollState` (IntersectionObserver sentinel)
    - Files: `components/layout/header-scroll-state.tsx` (`'use client'`), `components/layout/site-header.tsx` (mount)
    - Objective: a 25 px absolutely positioned sentinel at the document top. The IO toggles `header[data-scrolled]`. No scroll listener. The scrolled state is `ink-950` at 88% with `backdrop-filter: blur(12px)` (96% without support) and a `gold-500` 24% hairline, fading in and out over `--dur-ui`.
    - Depends on: 7.2
    - Acceptance: scrolling to 24 px shows the top state; 25 px shows the scrolled state. The transition finishes within 240 ms.
    - Mobile: works with iOS toolbar resizing because the sentinel is document-anchored.
    - A11y: `ivory-300` on the scrolled composite is ≥ 9.43:1.
    - Perf: under 1 KB gzip, with no layout reads per frame.
    - _Requirements: 7.3, 7.4, 9.1, 17.10_

  - [x]* 7.4 Write e2e tests for the header
    - File: `tests/e2e/header.spec.ts`. Test:
      - Height per band (including 667×375 and 844×390).
      - The scroll state at 24 and 25 px.
      - Skip link visibility on focus and focus moving to `main`.
      - The Brand_Mark name and `aria-current`.
      - The zero-nav state: no `nav`, trigger or `details`, and no header overflow.
    - _Requirements: 7.2, 7.3, 7.4, 7.11, 7.14, 7.15, 12.11_

- [x] 8. Navigation and Mobile_Menu (live-item path, tested with fixture data)
  - [x] 8.1 Build `NavList` and the nav selection helper
    - Files: `lib/nav.ts` (`renderedNavItems(cfg)`, a pure function), `components/layout/nav-list.tsx`, `components/layout/site-header.tsx` (inline `nav aria-label="Primary"` at 1280 and above, rendered only when items exist)
    - Objective: variants `inline`, `menu` and `disclosure`:
      - Live items render as `<a href>`.
      - Planned items render only when `showPlanned` is true (off by default): as a focusable element with `aria-disabled="true"`, no href and a visually hidden suffix, and activation is prevented.
      - Order follows Site_Config.
    - Depends on: 7.2, 6.1
    - Acceptance: with the shipped config the list is empty and nothing renders.
    - Mobile: inline nav is hidden below 1280.
    - A11y: the nav is named "Primary"; no empty landmark.
    - Perf: RSC.
    - _Requirements: 7.5, 7.8, 7.9, 7.10, 7.13, 8.14_

  - [x] 8.2 Write property test for nav rendering (required)
    - **Property 8: Nav rendering follows status and showPlanned**
    - **Validates: Requirements 7.8, 7.9, 7.10, 8.14**
    - File: `tests/property/nav-list.property.test.tsx`. Generate `fc.subarray` + `fc.shuffledSubarray` Nav_Items with random statuses, the `showPlanned` flag and all variants. Check `renderToStaticMarkup` output: exactly one href per live item and zero for planned items. At least 100 runs.

  - [x] 8.3 Add a live-nav fixture configuration for tests
    - Files: `data/fixtures/nav-live.ts`, `data/site-config.ts` (select the fixture when `PEYMAN_CONFIG_FIXTURE=nav-live`), `lib/site-config-schema.ts` (the `fixture-config` issue), `next.config.ts` (`distDir` from `NEXT_DIST_DIR`), `playwright.config.ts` (a second webServer and project for the fixture build)
    - Objective: the fixture has 3 live items targeting `/` or in-page anchors, plus 1 planned item with `showPlanned: true`, so the menu, focus trap and disclosure paths can be tested. The release gate rejects any fixture selection. Record in `docs/decisions.md` as DEC-05 (edit it in a later wave if there is a file conflict).
    - Depends on: 5.2, 1.2
    - Acceptance: the fixture build renders the inline nav at 1280 and the trigger below 1280. The default build is unchanged.
    - Mobile: enables the Mobile_Menu e2e at 320–1279.
    - A11y: enables testing of the menu's accessibility.
    - Perf: fixture code is tree-shaken from the default build (env resolved at build time).
    - _Requirements: 7.10, 14.6, 20.2_

  - [x] 8.4 Build the no-JS `details`/`summary` menu fallback
    - Files: `components/layout/nojs-menu.tsx`
    - Objective: rendered only when items exist and below 1280, in the trigger box: 44×44, summary text "Menu". It reveals nav items (disclosure variant) and the Primary_CTA, with no horizontal overflow. It is passed as server-rendered children to `MobileMenu`, which swaps it for the trigger after hydration.
    - Depends on: 8.1
    - Acceptance: with JS disabled in the fixture build, the disclosure opens with click, Enter and Space.
    - Mobile: the panel scrolls vertically at 320.
    - A11y: native disclosure semantics.
    - Perf: zero JS.
    - _Requirements: 17.4, 17.5, 17.6_

  - [x] 8.5 Build `MobileMenu` with CSS-driven motion
    - Files: `components/layout/mobile-menu.tsx` (`'use client'`), `components/motion/use-menu-motion.ts` (phase state machine closed → opening → open → closing), `lib/focus-trap.ts`, `lib/scroll-lock.ts`, `components/layout/site-header.tsx` (mount when items exist), `app/globals.css` (menu surface and transitions)
    - Objective, trigger and dialog:
      - The trigger is a `button` with `aria-expanded`, `aria-controls` and the name "Menu" or "Close menu".
      - The dialog is portaled to body with `role="dialog"`, `aria-modal="true"` and `aria-label` from config.
      - Contents in order: close button → `nav` "Menu navigation" items (28–32 px, 56 px rows) → Primary_CTA → location "Bengaluru, Karnataka" (meta role).
    - Objective, open behavior: `inert` on `header` and `main`; focus moves to the close control in `useLayoutEffect`; a manual Tab/Shift+Tab trap.
    - Objective, closing: Escape, the close control, the backdrop (768–1279), a live item or the CTA close the menu and return focus to the trigger. A planned item keeps the menu open. Crossing to 1280 closes instantly and focuses the Brand_Mark.
    - Objective, scroll lock: an iOS-safe `position: fixed; top: -scrollY` lock with scrollbar compensation, restored exactly on close.
    - Objective, motion (CSS only): panel over `--dur-panel` (360 ms), items staggered by 40 ms, open sequence ≤ 520 ms, close ≤ 240 ms. Reduced motion uses a fade of at most 150 ms (finalized in 17.1).
    - If `mobile-menu.tsx` would exceed 150 lines, keep the trap and lock logic in `lib/`.
    - Depends on: 8.1, 8.4, 2.4
    - Acceptance: the full state diagram in the design works on the first tap before the motion chunk loads.
    - Mobile: full screen at 100dvh (100vh fallback) with safe-area padding on all edges below 768. A right panel `min(420px, 100vw)` over an `ink-950` 64% backdrop from 768 to 1279.
    - A11y: focus reaches the close control within 50 ms, the trap wraps, and content outside is unreachable by the virtual cursor.
    - Perf: combined client leaves stay ≤ 15 KB gzip; only transform and opacity are transitioned.
    - _Requirements: 7.13, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 9.1, 12.12_

  - [x]* 8.6 Write e2e tests for the Mobile_Menu and no-JS disclosure (fixture build)
    - File: `tests/e2e/mobile-menu.spec.ts`. At 320×568, 390×844, 768×1024 and 1024×768, test:
      - `aria-expanded` and names.
      - Focus on the close control.
      - Tab and Shift+Tab wrap.
      - Escape, close control, backdrop, live item and CTA each close the menu and return focus.
      - Planned item is a no-op.
      - Resize to 1280 moves focus to the Brand_Mark.
      - Scroll position restored and zero horizontal shift.
      - `inert` applied.
      - Item sizes 28–32 px and rows ≥ 44 px.
      - JS disabled: the disclosure works; after hydration it is swapped with focus carried over.
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.7, 8.8, 8.11, 8.12, 8.13, 12.12, 17.4, 17.5, 17.6, 20.2_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Hero layout
  - [x] 10.1 Complete the layout oracle
    - Files: `lib/layout-model.ts`
    - Objective: implement `computeHeroLayout(viewport)` with every band from the design Layout table: columns, gutters (including safe areas), content caps 1360/1680, text span 1–7 and emblem span 8–12 (D3), tablet 1–5/6–8, landscape 60/40, emblem sizing rules, vertical centering, CTA rects via `ctas(labelWidths)`, and gold-painted rects.
    - Depends on: 3.2
    - Acceptance: it reproduces every example size in the design (for example 390×844 → emblem 163×186; 1440 → 533×608).
    - Mobile: covers the tall and compact portrait bands and landscape.
    - A11y: models 44 px targets and 8 px spacing.
    - Perf: test-only module.
    - _Requirements: 2.3, 2.4, 2.8, 4.3, 5.5, 10.2, 10.3, 10.5, 10.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.9_

  - [x]* 10.2 Write property test for emblem sizing
    - **Property 3: Emblem size respects caps, bands, ratio and its column**
    - **Validates: Requirements 5.1, 5.5, 10.2, 10.3, 10.7, 11.1, 11.2, 11.3, 11.4**
    - File: `tests/property/emblem-size.property.test.ts`.

  - [x]* 10.3 Write property test for emblem/text non-intersection
    - **Property 4: Emblem and text never intersect, even at maximum parallax**
    - **Validates: Requirements 2.7, 2.8, 11.9**
    - File: `tests/property/emblem-text-separation.property.test.ts`.

  - [x]* 10.4 Write property test for CTA geometry
    - **Property 6: CTA geometry never overlaps and keeps order**
    - **Validates: Requirements 3.4, 10.5, 10.9, 11.6, 11.8, 18.3**
    - File: `tests/property/cta-geometry.property.test.ts`. Label widths range 0.5× to 2× nominal.

  - [x]* 10.5 Write property test for the gold area budget
    - **Property 7: Gold area stays under 8%**
    - **Validates: Requirements 4.3**
    - File: `tests/property/gold-area.property.test.ts`. Seed with 320×598 (the tightest case, 7.5%).

  - [x] 10.6 Build the Hero shell and `HeroCopy` and wire them into the page
    - Files: `components/hero/hero.tsx`, `components/hero/hero-copy.tsx`, `app/page.tsx` (renders `<Hero />`), `app/globals.css` (mobile-first base grid)
    - Objective, `Hero`: `section[data-hero]` with `isolation: isolate`, `overflow: clip`, `overflow-clip-margin: 8px` and `min-height: 100vh; min-height: 100svh`. Base grid: 4 columns with a 16 px gap.
    - Objective, `HeroCopy`, in DOM order:
      1. Optional Etymology_Note (meta role, IPA span with `lang="fa-fonipa"`).
      2. `h1` Headline.
      3. `p` Supporting_Copy (46ch, `text-wrap: pretty`).
      4. `HeroActions`.
      5. Optional `ul[aria-label]` Service_Index.
    - Disabled flags remove elements from the DOM entirely. No copy literals.
    - Depends on: 6.2, 5.1, 3.1
    - Acceptance: exactly one `h1`, strings are character-exact, and there are no other content elements.
    - Mobile: the text block spans columns 1–4.
    - A11y: heading structure starts at h1; the reading order equals DOM order.
    - Perf: RSC. The headline is SSR text at opacity 1 (the mobile LCP element).
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.10, 6.2, 6.4, 6.6, 15.3, 15.4, 16.1, 19.1, 19.4_

  - [x] 10.7 Build `EmblemStage`, renderer selection and `RasterEmblem`
    - Files: `components/hero/emblem-stage.tsx`, `components/hero/emblem-visual.tsx`, `components/hero/raster-emblem.tsx`, `lib/emblem-sizes.ts` (hero `sizes` string from the design Performance table), `components/hero/hero.tsx` (place the stage last in DOM)
    - Objective, `EmblemStage`: `div[aria-hidden="true"]`. It sizes the slot from `aspectRatio` and positions it by `anchor` only. Nested wrappers are `.emblem-scroll > .emblem-parallax > .emblem-intro`, with transform-origin at the anchor.
    - Objective, `emblem-visual.tsx`: the only importer of `RasterEmblem`.
    - Objective, `RasterEmblem`:
      - `next/image` with `preload`, `sizes`, intrinsic `width`/`height` and `alt=""`, on a `navy-950` placeholder box.
      - A second `<img>` with identical props as the specular copy, `display: none` at rest, `mix-blend-mode: screen` and a radial `mask-image` (armed in 16.5).
    - Depends on: 10.6, 4.2
    - Acceptance: the slot box is identical in size for `raster` and a stub `model` within 1 px. No canvas, no WebGL and no extra image assets.
    - Mobile: the emblem is visually first via grid `order`, while the DOM order is unchanged.
    - A11y: no accessible name, focusable element or live region.
    - Perf: `fetchpriority=high` plus preload. The reserved `aspect-ratio` box gives CLS 0. The specular copy reuses the cached response, so it costs no extra bytes.
    - _Requirements: 2.6, 5.1, 5.2, 5.3, 5.6, 5.10, 15.9, 16.2, 19.2_

  - [x]* 10.8 Write unit tests for hero content and emblem `sizes`
    - Files: `tests/unit/hero-copy.test.tsx`, `tests/unit/emblem-sizes.test.ts`. Test:
      - Exact strings and DOM order.
      - Flags on and off.
      - IPA `lang`.
      - Mutated config changes the output with no component edits.
      - At each Test_Viewport the `sizes` string resolves to 100–125% of `computeHeroLayout().emblem.w`.
    - _Requirements: 1.2, 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 5.2, 15.4_

- [x] 11. Atmospheric background
  - [x] 11.1 Build the stage gradient and framing hairlines
    - Files: `components/hero/hero.tsx`, `app/globals.css`
    - Objective:
      - Stage: one 2-stop gradient `navy-950` → `ink-950`.
      - Framing (`aria-hidden`, z 1): vertical spine in `ivory-50` at 8%, 3 measurement ticks at 10% with no text or numerals, and one plinth line in `gold-500` at 32%.
      - The plinth runs from the emblem's inline-start edge to the content end. From 1920 it runs to the viewport edge. On mobile it sits in the gap under the emblem.
      - The stage background is full-bleed to 3840.
    - Depends on: 10.7
    - Acceptance: no hairline box intersects any text or CTA box. The page has only one gradient outside the stage.
    - Mobile: the plinth spans the content width in the emblem–headline gap and never touches text.
    - A11y: decorative only and hidden in forced colors.
    - Perf: CSS only, drawn with `scaleX`/`scaleY` transforms.
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 11.4_

  - [x] 11.2 Build the Light_Layer (vignette and light pool)
    - Files: `components/hero/emblem-stage.tsx` (`.light-parallax` layer), `app/globals.css`
    - Objective: a radial vignette (`ink-950` 0% → 72%) and a light pool under the plinth (`gold-500` 12% → 0%), both 2-stop. With the sweep mask the stage uses 3 gradients. `pointer-events: none`; the layer stays inside the stage bounds; hidden in forced colors. The static resting frame is the composition without the sweep.
    - Depends on: 11.1
    - Acceptance: the stage gradient count is ≤ 3 and every stop is a Palette token.
    - Mobile: the same layer scales with the stage and never overlaps text.
    - A11y: `aria-hidden`.
    - Perf: composited opacity and transform only; no `backdrop-filter`.
    - _Requirements: 2.2, 4.7, 5.4, 12.8_

  - [x]* 11.3 Write e2e tests for visual composition rules
    - File: `tests/e2e/composition.spec.ts`. Test:
      - Every computed color in the Hero is a Palette token (with alpha).
      - Gradient stop counts and budgets.
      - No `backdrop-filter`, `text-shadow`, `canvas` or WebGL in the Hero.
      - Hairlines do not intersect text.
      - Horizontal overflow is 0.
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 4.9_

- [x] 12. Responsive behavior (tablet, desktop, wide, ultra, landscape)
  - [x] 12.1 Implement the band layouts in CSS
    - Files: `app/globals.css`, `components/hero/hero.tsx` (grid area hooks)
    - Objective, grids:
      - 768–1023 (h ≥ 480): 8 columns, text 1–5, emblem 6–8, height ≤ 46svh.
      - 1024 and above: 12 columns with a 32 px gap, text 1–7, emblem 8–12.
      - Emblem width `min(span, 460/580/620)`.
      - Content caps 1360 and 1680, centered.
      - Gutters `max(clamp(40px, 4vw, 80px), env(safe-area-inset-*))`.
    - Objective, landscape phone (`landscape-short`, w ≤ 1023): 60/40 split with the emblem ≤ 70svh.
    - Objective, other:
      - Vertical centering below the header with ≥ 48 px block padding.
      - Headline measure caps as container queries on the text block.
      - `max-inline-size: 20ch` at 1024 and above.
    - Depends on: 11.2, 10.1
    - Acceptance: DOM rects match `computeHeroLayout` within 1 px (verified in 12.2).
    - Mobile: the landscape phone layout applies at 667×375 and 844×390.
    - A11y: `text-align: start` everywhere; focus rings are never clipped.
    - Perf: pure CSS; no JS measurement.
    - _Requirements: 2.3, 2.4, 6.9, 10.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 16.3_

  - [x] 12.2 Write e2e layout conformance and headline line-count tests
    - File: `tests/e2e/layout-conformance.spec.ts`. At every Test_Viewport, after the intro and in reduced motion, test:
      - Rects equal `computeHeroLayout` within 1 px.
      - Headline font size.
      - Line counts from the design's breaks table (count line boxes via `Range.getClientRects`).
      - Headline `scrollWidth ≤ clientWidth`.
      - No horizontal overflow.
    - This is the enforcement for risk R3.
    - _Requirements: 2.3, 2.4, 6.9, 11.1, 11.2, 11.3, 11.4, 15.7, 18.2, 18.3, 20.2_

- [x] 13. Mobile-specific composition (320–767)
  - [x] 13.1 Implement mobile recomposition, safe areas and viewport metadata
    - Files: `app/globals.css`, `app/layout.tsx` (`export const viewport` with `viewportFit: 'cover'` and `themeColor: '#05070C'`; `metadata` title and description from Site_Config)
    - Objective:
      - The emblem stacks above the text via `order` and is end-aligned in columns 3–4.
      - Portrait with h ≥ 720: emblem height `clamp(120px, 22svh, 200px)`.
      - `compact` band: `clamp(96px, 16svh, 140px)` and all rhythm values × 0.75 (24 → 18, 32 → 24, 20 → 15, 28 → 21).
      - Gutters `max(20px, env(safe-area-inset-left|right))`; bottom padding plus `env(safe-area-inset-bottom)`.
      - The Hero grows with its content; no dvh heights.
    - Depends on: 12.1
    - Acceptance: at 360×640 and above, the Primary_CTA bottom is ≤ the svh bottom. At 320×568 the headline is fully in view.
    - Mobile: this is the primary canvas at 390×844; the toolbar case (svh ≈ 660) uses the compact band.
    - A11y: targets ≥ 44 px with 8 px spacing; nothing is hover-only.
    - Perf: no JS; CLS 0.
    - _Requirements: 1.3, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8, 10.9, 10.10, 10.11, 16.5, 16.6_

  - [x]* 13.2 Write e2e tests for mobile composition
    - File: `tests/e2e/mobile.spec.ts`. At 320–414 and landscape, test:
      - Fold rules (Req 1.3 and 1.4).
      - The emblem sits above the text visually while the DOM keeps it last.
      - Emblem heights per band.
      - The CTA stack with a 12 px gap and full width.
      - 44 px targets with 8 px spacing.
      - Gutters.
    - _Requirements: 1.3, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.9, 20.2_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. CSS-first opening state
  - [x] 15.1 Implement the intro keyframes from first paint
    - Files: `app/globals.css`
    - Objective: under `@media (prefers-reduced-motion: no-preference)`, use keyframes with `animation-fill-mode: both`, reading `var(--delay-*)`, `var(--dur-*)` and `var(--ease-entrance)` from 2.4:

      | Element | From | Delay / duration |
      |---|---|---|
      | Brand | opacity 0 | 0 / 240 |
      | Hairlines | scale 0 | 40 / 720 |
      | Atmosphere | opacity 0 | 80 / 720 |
      | `.emblem-intro` | opacity 0.24, scale 0.98 (D8) | 120 / 720 |
      | Headline | translateY 12 px only; opacity stays 1 | 160 / 720 |
      | Copy | opacity 0, 8 px | 400 / 240 |
      | CTA group | opacity 0, 8 px | 520 / 240 |

    - No opacity, `visibility`, `clip-path` or mask on the h1. No `pointer-events: none` anywhere.
    - Depends on: 13.1, 2.4
    - Acceptance: everything settles by 880 ms and hairlines by 760 ms. With no JS the final state matches the reduced-motion render.
    - Mobile: the same sequence; the headline (LCP) paints at first paint.
    - A11y: CTAs are operable and focus-visible throughout.
    - Perf: compositor-only properties; LCP is not gated on JS; runs before hydration.
    - _Requirements: 1.8, 9.1, 9.4, 9.5, 13.11, 16.1, 17.3_

  - [x]* 15.2 Write e2e tests for the opening state
    - File: `tests/e2e/intro.spec.ts`. Test:
      - The headline's computed opacity is 1 when sampled at 0, 100 and 300 ms.
      - The emblem's opacity is ≥ 0.24 at first sample.
      - CTAs are clickable at 100 ms.
      - Final state by 900 ms.
      - With JS disabled the final state is identical.
      - LCP is within 150 ms of FCP (PerformanceObserver).
    - _Requirements: 1.8, 9.4, 9.5, 17.3_

- [x] 16. GSAP enhancement after hydration
  - [x] 16.1 Implement the GSAP registration, capability and parallax modules
    - Files: `lib/gsap.ts` (`'use client'`; the single `gsap.registerPlugin(ScrollTrigger, useGSAP)`; re-exports), `lib/capability.ts` (`readSignals`, `isLowPower`), `lib/parallax.ts` (`computeParallax`, a pure function)
    - Objective:
      - `isLowPower` = Save-Data, or `deviceMemory ≤ 4`, or `hardwareConcurrency ≤ 4`, or hidden. An unavailable signal counts as false.
      - `computeParallax`: translate ≤ 12 px and rotate ≤ 2°, proportional to distance from the stage center, with the light offset opposite.
    - Depends on: 1.2
    - Acceptance: only `lib/gsap.ts` imports `gsap` (enforced by lint and 1.3).
    - Mobile: fine-pointer gating is handled by the caller; mobile never runs parallax.
    - A11y: none.
    - Perf: the pure modules have no GSAP dependency.
    - _Requirements: 9.7, 9.12, 13.5, 14.4_

  - [x]* 16.2 Write property test for parallax mapping
    - **Property 10: Parallax output is bounded, opposite and centered**
    - **Validates: Requirements 9.7, 9.14**
    - File: `tests/property/parallax.property.test.ts`.

  - [x]* 16.3 Write property test for Low_Power_Mode classification
    - **Property 13: Low_Power_Mode classification**
    - **Validates: Requirements 9.12**
    - File: `tests/property/capability.property.test.ts`.

  - [x] 16.4 Build `MotionLoader` (post-hydration dynamic import and 1600 ms deadline)
    - Files: `components/motion/motion-loader.tsx` (`'use client'`, renders `null` then `<HeroMotion>`), `components/hero/hero.tsx` (mount)
    - Objective:
      - In `useEffect`, start a 1600 ms deadline and call `import('@/components/motion/hero-motion')`.
      - Pass `{ lowPower, deadlineMissed }` to the component.
      - A rejected import is caught and never retried, and raises no uncaught error.
      - Uses no `next/dynamic` and emits no modulepreload.
    - Depends on: 16.1, 12.1, 15.1
    - Acceptance: the initial HTML has no reference to the GSAP chunk, and the chunk request starts after hydration.
    - Mobile: loads on mobile too, but only the sweep may run there.
    - A11y: inserts no DOM.
    - Perf: loader under 1 KB; the chunk is not render-blocking (verify Turbopack does not preload it, risk R9).
    - _Requirements: 13.5, 15.6, 16.4, 16.8, 17.7_

  - [ ] 16.5 Build `HeroMotion` (specular sweep, pointer parallax, pause and bfcache)
    - Files: `components/motion/hero-motion.tsx` (split into `components/motion/use-*.ts` hooks if it exceeds 150 lines)
    - Objective, setup: `useGSAP(setup, { scope: heroRef })` with one `gsap.matchMedia()` using the `motionOK`, `reduce` and `fine` conditions.
    - Objective, sweep: runs once, only when all of these hold:
      - `motionOK`;
      - not low power;
      - not `deadlineMissed`;
      - the emblem is decoded (`naturalWidth > 0`);
      - `CSS.supports('mask-image', …)`;
      - the module-scope `sweepPlayed` flag is false.

      It starts within 200 ms of the emblem intro's `animationend`, then animates the specular copy's `mask-position` from −60% to 160% over 1400 ms and returns to `display: none`.
    - Objective, parallax: fine pointer, `motionOK` and not low power. `contextSafe` pointer handlers with a cached rect, feeding `computeParallax` into 6 `quickTo`s on `.emblem-parallax` and `.light-parallax` (`ui` 240, entrance curve). `pointerleave` and window `blur` return to 0 over 600 ms on the state curve.
    - Objective, pause: an IO on the Hero plus `visibilitychange` detach handlers and disable ScrollTrigger while the Hero is off-screen or the document is hidden. On return, show the final state with no replay.
    - Objective, other:
      - `pageshow.persisted` keeps the final state.
      - The Scroll_Exit code path is gated by `hasFollowingContent` (false in v1): yPercent −8, scale 0.96, linear scrub.
      - Setup runs in `try/catch` and calls `mm.revert()` on error.
      - GSAP never tweens `.emblem-intro` or text.
    - Depends on: 16.4
    - Acceptance: idle means zero rAF callbacks, and the transform stays constant for 10 s after the intro. Unmount reverts all inline styles.
    - Mobile: sweep only (no fine pointer), skipped in low power.
    - A11y: nothing depends on motion; no focus changes.
    - Perf: the motion chunk is ≤ 50 KB gzip, `will-change` is set only while tweening, and ≥ 95% of frames are ≤ 16.7 ms.
    - _Requirements: 5.10, 9.6, 9.7, 9.8, 9.9, 9.11, 9.12, 9.13, 9.14, 9.15, 13.10, 13.11, 15.6, 17.7, 17.9_

  - [x]* 16.6 Write e2e tests for motion enhancement
    - File: `tests/e2e/motion.spec.ts`. Test:
      - No GSAP modulepreload in the initial HTML.
      - The chunk is requested after hydration.
      - The sweep runs once.
      - Parallax transforms stay within bounds and return to 0 on leave.
      - A rAF counter (via `addInitScript`) shows 0 while idle, off-screen or hidden.
      - bfcache restore does not replay.
      - Chunk abort leaves the static state with no page errors.
      - A 1700 ms delay means no sweep while parallax stays enabled.
    - _Requirements: 5.10, 9.6, 9.7, 9.13, 9.14, 9.15, 16.4, 16.8, 17.7_

- [ ] 17. Reduced-motion behavior
  - [x] 17.1 Complete the reduced-motion paths across CSS, the menu and GSAP
    - Files: `app/globals.css`, `components/motion/use-menu-motion.ts`, `components/motion/hero-motion.tsx`
    - Objective:
      - Under `reduce`, every element renders its final composition at first paint, and the Light_Layer shows its resting frame.
      - Menu transitions become an opacity-only fade of at most `--dur-rmFade` (150 ms) with no stagger.
      - A runtime toggle to `reduce` reverts all GSAP state before the next frame.
      - Toggling back re-enables parallax without replaying the intro or sweep.
    - Depends on: 16.5, 8.5, 15.1
    - Acceptance: no intermediate states in either direction.
    - Mobile: same behavior; iOS "Reduce Motion" is honored.
    - A11y: meets the user preference fully.
    - Perf: reduced mode runs zero animation work.
    - _Requirements: 8.9, 8.10, 9.10, 9.11_

  - [x]* 17.2 Write e2e tests for reduced motion
    - File: `tests/e2e/reduced-motion.spec.ts`. Test:
      - Screenshots at 100 ms and 2000 ms differ by 0 pixels.
      - Rects are within 1 px of the default-motion final state.
      - Toggling with `page.emulateMedia` mid-session.
      - Save side-by-side screenshot pairs at 1440×900, 390×844 and 844×390 to `qa/screenshots/reduced-motion/`.
    - _Requirements: 9.10, 9.11, 18.4, 20.2_

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Image optimization
  - [x] 19.1 Tune emblem derivative delivery and add optimizer warm-up
    - Files: `lib/emblem-sizes.ts`, `next.config.ts` (the quality allow-list only if the budget requires it), `tests/e2e/support/warm-images.ts` (Playwright `globalSetup`: request every `srcset` URL under both AVIF and WebP `Accept` headers), `playwright.config.ts`
    - Objective:
      - Confirm `currentSrc` is 100–125% of the rendered width at every Test_Viewport.
      - The brand thumbnail resolves to 32/64 px candidates.
      - Tighten `sizes` only if a band misses.
      - Document the warm-up for deployment in the README if needed (risk R1).
    - Depends on: 10.7, 8.3
    - Acceptance: every candidate is within Req 13.6 limits.
    - Mobile: 390×844 at DPR 3 selects a ≤ 640 px candidate.
    - A11y: none.
    - Perf: AVIF ≤ 90/180 KB and WebP ≤ 130/260 KB; a cold optimizer never skews LCP measurements.
    - _Requirements: 5.2, 5.5, 13.6, 16.2_

  - [x]* 19.2 Write e2e image budget tests
    - File: `tests/e2e/image-budgets.spec.ts`. Test each candidate's byte size under both `Accept` headers, and the selected candidate width at each viewport.
    - _Requirements: 5.2, 13.6_

- [ ] 20. Loading and fallback behavior
  - [x] 20.1 Implement the feature-query and failure fallbacks
    - Files: `app/globals.css`, `components/layout/brand-mark.tsx` (a fixed thumbnail box that survives failure)
    - Objective:
      - `@supports not (mask-image: …)` removes the specular copy.
      - `@supports not (backdrop-filter: …)` gives the scrolled header 96% `ink-950`.
      - The `100vh` → `100svh` cascade.
      - A failed emblem keeps its box, placeholder, vignette and pool, with no broken-image icon (`alt=""` plus a `color: transparent` guard).
      - The font-fail path uses the size-adjusted fallbacks from 3.1.
    - Depends on: 17.1
    - Acceptance: every row of the design's Loading and fallback table behaves as specified.
    - Mobile: older iOS gets the svh fallback and the fixed-body scroll lock.
    - A11y: no alt text leaks and no text is hidden.
    - Perf: CLS stays 0 in every failure path.
    - _Requirements: 6.10, 16.7, 17.1, 17.2, 17.8, 17.9, 17.10_

  - [x]* 20.2 Write e2e failure-injection tests
    - File: `tests/e2e/fallbacks.spec.ts`. Use `page.route` to inject:
      - Emblem 404: same box, CLS 0, no sweep.
      - Thumbnail 404: header height unchanged.
      - Font 404: the same line counts and visible text.
      - JS disabled.
      - Chunk abort and delay.

      Also assert statically that the `@supports` fallback rules exist in the compiled CSS. Behavioral checks on Firefox and WebKit run in 24.1.
    - _Requirements: 16.3, 16.7, 16.8, 17.1, 17.2, 17.3, 17.7, 17.9, 17.10_

- [ ] 21. Accessibility
  - [ ] 21.1 Harden accessibility across the header, Hero and menu
    - Files: `app/globals.css`, `README.md` (accessibility statement)
    - Objective:
      - Forced colors: hide decoration, keep the emblem, use system-color borders on CTAs and the trigger, and a `Highlight` focus outline.
      - Focus rings are never clipped (`overflow-clip-margin`) and never obscured (`scroll-padding-top`).
      - Robust under WCAG 1.4.12 spacing overrides (`min-block-size`, no fixed text heights).
      - 400% zoom at 1280 equals the 320 layout.
      - README statement: automated checks do not establish WCAG 2.2 AA conformance. Manual VoiceOver (iOS/macOS Safari), NVDA (Chrome/Firefox) and TalkBack (Android Chrome) testing plus expert review are required.
    - Depends on: 20.1
    - Acceptance: focus order per band matches DEC-01, and the skip link is the first tab stop.
    - Mobile: 44 px targets and 8 px spacing; no hover-only content.
    - A11y: this task is the accessibility hardening.
    - Perf: CSS only.
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.10_

  - [ ]* 21.2 Write the axe accessibility suite
    - File: `tests/e2e/a11y.spec.ts`. `@axe-core/playwright` with WCAG 2.2 A/AA tags, run after the intro:
      - Default state and forced-colors emulation at 320×568, 390×844, 1024×768 and 1440×900.
      - Open Mobile_Menu at 320×568, 390×844 and 1024×768, on the fixture build (the production state has no menu per DEC-01).

      Require zero violations and report `incomplete` results.
    - _Requirements: 12.1, 12.4, 20.3_

  - [ ]* 21.3 Write keyboard, zoom and text-spacing e2e tests
    - File: `tests/e2e/keyboard.spec.ts`. Test:
      - Tab order per band (default and fixture builds).
      - Skip link to `main`, with the next Tab reaching the Primary_CTA.
      - The focus ring is fully visible and below the header.
      - At 320 px (the 400% zoom equivalent): no two-dimensional scroll.
      - Injected 1.4.12 overrides cause no clipping and no text-box intersections.
    - _Requirements: 7.14, 7.15, 12.3, 12.5, 12.6, 12.7, 12.11_

- [ ] 22. Performance optimization and CI budgets
  - [ ] 22.1 Implement budget checks, Lighthouse CI and the CI workflow
    - Files: `scripts/check-budgets.ts` (pure comparator: measured vs limit → a message naming the budget, its limit and the measured value), `tests/e2e/budgets.spec.ts` (network capture), `lighthouserc.json` (mobile preset, 5 runs, median assertions), `package.json` (`perf:budgets`, `perf:lhci`), `.github/workflows/ci.yml`, `playwright.config.ts` (flaky reporting)
    - Objective, budgets captured by the spec (gzip):
      - First-load JS ≤ 180 KB.
      - Client leaves ≤ 15 KB, attributed by chunk module paths (document the method).
      - Motion chunk ≤ 50 KB.
      - Preloaded fonts ≤ 3 files and ≤ 110 KB.
      - No GSAP preload in the initial HTML.
    - Objective, CI: separate named steps for typecheck, lint, vitest, `next build`, `npm audit --audit-level=high`, Playwright (default and fixture builds, 2 retries, flaky flagged), axe, LHCI and budgets. Scripts run through Vitest or Playwright runners, so no `tsx` dependency is needed.
    - Depends on: 19.1, 16.5
    - Acceptance: an intentionally oversized import fails the budget step with a named message.
    - Mobile: LHCI mobile preset targets: Performance ≥ 95, A11y 100, LCP ≤ 2.0 s, CLS ≤ 0.02, TBT ≤ 150 ms.
    - A11y: LHCI Accessibility 100 is asserted.
    - Perf: this task is the budget gate itself.
    - _Requirements: 13.1, 13.3, 13.4, 13.5, 13.6, 13.7, 13.12, 14.10, 16.4, 20.1, 20.4, 20.7_

  - [ ]* 22.2 Write unit tests for the budget comparator
    - File: `tests/unit/check-budgets.test.ts`. Test the pass/fail boundaries and that messages include the budget name, limit and measured value.
    - _Requirements: 13.12_

  - [ ]* 22.3 Write the Chrome trace performance checks (release run)
    - File: `tests/perf/traces.spec.ts`. Capture CDP tracing at 4× CPU and 1440×900:
      - ≥ 95% of frames ≤ 16.7 ms during the intro and sweep, and during 5 s of pointer movement.
      - Zero long tasks over 50 ms from Hero code.
      - Zero rAF or ticker callbacks while off-screen or hidden.
      - Low power averages ≤ 2 ms per frame.
    - _Requirements: 13.9, 13.10, 20.6_

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Browser/device verification and mobile QA
  - [ ] 24.1 Build the mobile and device QA matrix with a manual gate record
    - Files: `tests/e2e/mobile-qa.spec.ts`, `playwright.config.ts` (Firefox and WebKit projects for the QA spec), `docs/qa/manual-gates.md`
    - Objective, automated matrix: run on Chromium, WebKit and Firefox at 320×568, 360×640, 375×667, 390×844, 414×896, 667×375, 844×390, 768×1024, 1024×768, 1024×1366, 1280×800, 1440×900, 1920×1080, 1920×1080 at DPR 2 and 3840×2160. Check:
      - Headline line counts per the design table (Chromium strict; WebKit and Firefox without `text-wrap: balance` may differ, but still with no clipping or hyphens).
      - No emblem clipping.
      - Header heights.
      - CTA stacking and rows.
      - Safe areas via CDP `Emulation.setSafeAreaInsetsOverride` where available, otherwise marked for the device check.
      - svh versus the toolbar case (390×660).
      - Horizontal overflow of 0.
      - Touch targets ≥ 44 px with 8 px spacing.
      - CLS via a `layout-shift` observer (0).
      - A loading filmstrip at 0/200/500/900 ms.
      - Reduced motion.
    - Objective, manual record: `docs/qa/manual-gates.md` is a template with pass/fail, date, reviewer, device, OS, browser and AT versions for:
      - notched iPhone, portrait and landscape;
      - Android with ≤ 4 GB RAM (Low_Power_Mode);
      - VoiceOver, NVDA and TalkBack;
      - keyboard-only walkthrough;
      - 400% zoom;
      - 4K at DPR 1 and 1920 at DPR 2.

      The team performs these checks; this task delivers the automation and the template.
    - Depends on: 21.1, 22.1
    - Acceptance: the matrix is green on Chromium; WebKit and Firefox deviations are documented as accepted per the design's browser table.
    - Mobile: this task is the explicit mobile QA gate.
    - A11y: target sizes and the reduced-motion render are verified on every device class.
    - Perf: CLS and loading filmstrips are captured per viewport.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9, 10.11, 11.4, 18.2, 18.3, 20.2, 20.5_

- [ ] 25. Visual QA
  - [ ] 25.1 Build the screenshot capture suite and visual QA checklist
    - Files: `tests/visual/capture.spec.ts` (writes to `qa/screenshots/`), `docs/qa/visual-qa-checklist.md`
    - Objective, capture: at 320×568, 390×844, 844×390, 768×1024, 1024×768, 1440×900, 1920×1080 and 3840×2160, capture:
      - the first-paint reduced-motion state;
      - mid-intro (400 ms);
      - the final state;
      - mid-sweep;
      - the scrolled header;
      - the open menu (fixture build).

      Emit a report with the measured gold-area % and contrast samples per viewport.
    - Objective, checklist: two reviewers (including the brand owner) record pass or fail with notes and a screenshot reference for each of:
      - hierarchy, spacing rhythm and typography (measure, balance, weight);
      - emblem scale and placement;
      - lighting subtlety;
      - gold restraint;
      - contrast;
      - mobile composition;
      - perceived premium quality;
      - animation restraint (nothing performs after about 2.4 s).

      Include the Req 18.5 anti-template items: not a law-firm template, corporate site, startup or SaaS template, government site, stock-photo legal site or flashy WebGL, and no copying of Harvey, Cooley, Luminance or the studied references.
    - Depends on: 24.1
    - Acceptance: screenshots are generated for every viewport and state, and the checklist is ready for sign-off.
    - Mobile: the 390×844 and 320×568 compositions are reviewed as primary canvases.
    - A11y: contrast samples are included in the report.
    - Perf: the report includes the filmstrips from 24.1.
    - _Requirements: 4.3, 12.1, 18.5_

- [ ] 26. Final acceptance verification
  - [ ] 26.1 Build the acceptance suite and release checklist
    - Files: `tests/e2e/acceptance.spec.ts`, `docs/release-checklist.md`
    - Objective, suite:
      - Req 18.1: median of 5 runs, with the headline, emblem and Primary_CTA final within 1500 ms of FCP at 1440×900.
      - Req 18.2 and 18.3 at every Test_Viewport.
      - The Req 18.4 pairs from 17.2.
      - Req 19 non-goals:
        - no route other than `/` and not-found;
        - `main` contains only the Hero;
        - no `footer`, `form`, `input` or search;
        - zero cookies, zero storage writes and zero third-party requests;
        - a single locale.
    - Objective, checklist: records Open Questions 1–9 and deltas D1–D10 with the owner decisions already given (Inter, `logo-alternative`, `showPlanned=false`, DEC-01/02/03/05), the manual gates and visual QA status. Release is blocked until `npm run release:check` passes, which requires the Contact and Advisory features to resolve both CTA integrations.
    - Depends on: 25.1
    - Acceptance: the suite passes. `release:check` fails only on the two pending CTA keys, as documented.
    - Mobile: acceptance runs include 390×844 and 844×390.
    - A11y: the checklist references the axe, keyboard and manual AT records.
    - Perf: the checklist references the LHCI medians and the budget report.
    - _Requirements: 13.1, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1, 19.4, 19.5, 19.6, 20.8_

- [ ] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. These property tests are required: Property 1 (3.3), Property 8 (8.2) and Property 9 (5.3). The layout conformance test (12.2), repository conformance test (1.3), mobile QA (24.1), visual QA (25.1) and acceptance (26.1) are also required.
- Property tests use fast-check 4.10.2 with at least 100 runs each and are tagged `// Feature: cinematic-hero, Property {n}: {title}`.
- There is no DOM test environment (jsdom is not in the pinned table). DOM behavior is covered by Playwright; component markup by `renderToStaticMarkup`.
- Recorded decisions (in `docs/decisions.md`):
  - DEC-01 (7.2): zero live Nav_Items → Brand_Mark plus header CTA only, with no trigger, menu, disclosure or `nav` landmark. This refines Req 7.5, 7.13, 8, 12.4, 12.5 and 17.4.
  - DEC-02 (5.1): CTA destinations are a `pending | resolved` union. Pending renders `#pending-contact-feature` or `#pending-advisory-feature`. No email, domain or LinkedIn URL is invented, and `contact.email` is removed from v1.
  - DEC-03 (5.2): the release gate is `release:check` / `build:release` / `PEYMAN_RELEASE=1`. Plain `next build` passes with warnings. Validation runs from the layout instead of `next.config.ts`.
  - DEC-04 (5.1): `nav.showPlanned` defaults to false, overriding Req 7.16.
  - DEC-05 (8.3): a live-nav fixture config for tests, rejected by the release gate.
- The production release is intentionally blocked until the Contact and Advisory features resolve both CTA integrations.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.4", "4.2"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.5", "2.6", "3.1", "3.2", "4.3", "5.1", "16.1"] },
    { "id": 3, "tasks": ["2.3", "2.7", "3.3", "3.4", "5.2", "6.1", "7.1", "10.1", "16.2", "16.3"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.2", "8.3", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 5, "tasks": ["6.3", "7.2"] },
    { "id": 6, "tasks": ["7.3", "10.6"] },
    { "id": 7, "tasks": ["7.4", "8.1", "10.7"] },
    { "id": 8, "tasks": ["8.2", "8.4", "10.8", "11.1"] },
    { "id": 9, "tasks": ["8.5"] },
    { "id": 10, "tasks": ["8.6", "11.2"] },
    { "id": 11, "tasks": ["11.3", "12.1"] },
    { "id": 12, "tasks": ["13.1"] },
    { "id": 13, "tasks": ["12.2", "13.2", "15.1"] },
    { "id": 14, "tasks": ["15.2", "16.4"] },
    { "id": 15, "tasks": ["16.5"] },
    { "id": 16, "tasks": ["16.6", "17.1", "19.1"] },
    { "id": 17, "tasks": ["17.2", "19.2", "20.1"] },
    { "id": 18, "tasks": ["20.2", "21.1"] },
    { "id": 19, "tasks": ["21.2", "21.3", "22.1"] },
    { "id": 20, "tasks": ["22.2", "22.3", "24.1"] },
    { "id": 21, "tasks": ["25.1"] },
    { "id": 22, "tasks": ["26.1"] }
  ]
}
```
