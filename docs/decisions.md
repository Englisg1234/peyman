# Decisions

Project decisions and deviations from `.kiro/specs/cinematic-hero/`. Owner decisions DEC-01 to DEC-05 are added by the tasks that implement them (see `tasks.md`).

## Toolchain (task 1.1)

### Pinned versions

Every version in the requirements "Pinned versions" table exists on npm and was installed exactly. No substitutions were needed.

| Package | Installed |
|---|---|
| next | 16.3.6 |
| react / react-dom | 19.3.0 |
| typescript | ~~7.0.2~~ 6.0.3 (Req 14.9 fallback, task 1.2) |
| tailwindcss / @tailwindcss/postcss | 4.3.3 |
| postcss | 8.5.28 |
| gsap | 3.15.0 |
| @gsap/react | 2.1.2 |
| @types/react / @types/react-dom | 19.3.0 |
| @types/node | 24.19.0 (latest 24.x; matches Node 24 LTS in `.nvmrc`) |
| eslint / eslint-config-next | ~~10.11.0~~ 9.39.5 (deviation, task 1.2) / 16.3.6 |
| vitest / @testing-library/react / fast-check | 5.0.2 / 16.3.3 / 4.10.2 |
| @playwright/test / @axe-core/playwright / @lhci/cli | 1.63.0 / 4.13.0 / 0.15.1 |

Runtime `dependencies`: next, react, react-dom, gsap, @gsap/react. Everything else is a devDependency. Not installed (Req 14.3, 19.2): lenis, three, @types/three, @react-three/fiber, @react-three/drei, framer-motion, icon kits, UI kits, CSS-in-JS.

### TypeScript 7.0.2 → 6.0.3 (task 1.2, Req 14.9 fallback)

In task 1.1, `npx tsc --noEmit` and `npx next build` both passed with TypeScript 7.0.2. In task 1.2, `eslint .` failed at config load:

```
Error: typescript-eslint does not support TS 7.0.
    at node_modules/eslint-config-next/node_modules/typescript-eslint/dist/index.js:52:11
```

`eslint-config-next@16.3.6` depends on `typescript-eslint@8.70.1` (peer `typescript >=4.8.4 <6.1.0`), which refuses to load under TS 7 (upstream tracking: typescript-eslint/typescript-eslint#10940). ESLint is a required PR gate (Req 20.1), so TypeScript is pinned to exactly 6.0.3 per Req 14.9. The design's R10 row carries a one-line note. `tsc --noEmit`, `next build` and `eslint .` all pass on 6.0.3. The side-by-side TS 6 API package suggested by the error was not used: it would add an unpinned-table dependency for no gain over the sanctioned fallback.

### ESLint 10.11.0 → 9.39.5 (task 1.2, deviation)

With TS 6.0.3, `eslint .` on ESLint 10.11.0 crashed:

```
TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function
    at node_modules/eslint-config-next/node_modules/eslint-plugin-react/lib/util/version.js:31
```

ESLint 10 removed the legacy `context.getFilename()` API. `eslint-plugin-react@7.37.5`, `eslint-plugin-import@2.32.0` and `eslint-plugin-jsx-a11y@6.10.2` (all pulled by `eslint-config-next@16.3.6`) declare `eslint ^9` at most. A config-only workaround (hard-coding `settings.react.version`) would dodge this one call but leave the plugins running outside their supported range. The minimal supported fix is to pin ESLint to the latest 9.x, exactly `9.39.5`. `eslint-config-next` itself declares `eslint >=9.0.0`, so this is within its range. Revisit when the plugins support ESLint 10.

### Open issues for later tasks

- **npm audit (task 22.1, Req 14.10).** `npm audit --omit=dev` reports 0 vulnerabilities. The full audit reports 10 (7 high), all transitive through `@lhci/cli@0.15.1` (lighthouse, puppeteer-core, @puppeteer/browsers, extract-zip, tmp, uuid, inquirer). 0.15.1 is the latest release. The CI audit gate needs a resolution (for example, running LHCI via `npx` outside the lockfile, or an owner-approved exception) before it can pass.

## DEC-02: CTA destinations are typed pending integrations (task 5.1)

Refines Req 1.5, 1.6, 14.6 and design delta D10.

- A CTA carries `destination: CtaDestination`, a union of `{ kind: 'pending'; integration: 'contact-feature' | 'advisory-feature'; note }` and `{ kind: 'resolved'; href }` (`lib/site-config-schema.ts`), instead of the design's `href: string`.
- v1: "Start a Conversation" → pending `contact-feature`; "Explore Advisory" → pending `advisory-feature`.
- `resolveCtaHref()` (`lib/cta.ts`) returns the real href for resolved destinations and an in-page placeholder fragment for pending ones: `#pending-contact-feature` or `#pending-advisory-feature`. It never returns `#` alone and never navigates away.
- `contact.email` is removed from v1. No email address, domain, LinkedIn URL or page is invented. The brief's `inquiries@peymanconsulting.[domain]` stays unresolved (Open Question 2).
- To connect a feature, replace its pending destination with `{ kind: 'resolved', href }` in `data/site-config.ts`. No component changes are needed.
- Pending destinations block the release gate (DEC-03, task 5.2).

## DEC-04: `nav.showPlanned` defaults to false (task 5.1)

Owner override of Req 7.16 (which defaults it to true, Open Question 8). All six Nav_Items (Advisory, Industries, Intelligence, Insights, About, Contact) are `planned` because no routes exist (Req 19.1), so with `showPlanned: false` no Nav_Item renders in v1. The resulting zero-nav header is DEC-01 (task 7.2).

## Site_Config emblem values (task 5.1)

The emblem entry uses the measured master from task 4.1: `aspectRatio: 1003/1144` (not the design's 994/1130) and `anchor: { x: 0.278, y: 0.499 }` (not the estimated `{ x: 0.30, y: 0.52 }`). See `assets/emblem/README.md`.

## Headline measure model: measured Display-cut ratio and cap changes (task 3.2, risk R3)

Measured with fontTools 4.66 (outside the npm graph) from Inter 4.001, the google/fonts `Inter[opsz,wght].ttf` variable file that Google Fonts serves, instantiated at wght 400 and opsz 14 / 32. Widths are hmtx advances plus −0.02em tracking per character, no kerning (upper bounds). Implemented in `lib/layout-model.ts`.

**Display-cut ratio r = 0.909** (opsz 32 ÷ opsz 14; 0.9091–0.9131 across the arrangements, full headline 0.9152). This is below the design's assumed r ≥ 0.95, so the caps were adjusted (the only change R3 allows). `ch` at opsz 32 = 0.6133em (0.6309em at opsz 14).

**Corrected line thresholds.** The design's 4- and 2-line thresholds were not the narrowest arrangements. Measured minimum measure (em, opsz 14) for each line count:

| Lines | Design | Measured | Narrowest arrangement |
|---|---|---|---|
| 2 | 16.80 | 15.805 | Bridging the Gap Between / Innovation and Institutional Capital. |
| 3 | 10.81 | 10.811 | Bridging the Gap / Between Innovation / and Institutional Capital. |
| 4 | 8.99 | 8.845 | Bridging the Gap / Between / Innovation and / Institutional Capital. |
| 5 | (not given) | 6.699 | Bridging the / Gap Between / Innovation and / Institutional / Capital. |

Danger zones [T·r, T] with r = 0.909: 5→6 lines [6.09, 6.70], 4→5 [8.04, 8.85], 3→4 [9.83, 10.81], 2→3 [14.37, 15.81].

**Cap changes (container inline size → h1 measure cap):**

| Container | Design cap | New cap | Lines | Margin to nearest zone |
|---|---|---|---|---|
| < 335 px | 8.4em | **7.6em** | 5 | 5.5% below 8.04 |
| 335–403 px | 9.6em | **9.4em** | 4 | 4.4% below 9.83; uncapped minimum 9.31 is 5.2% above 8.85 |
| ≥ 404 px | min(13em, 20ch) | unchanged | 3 | 13em is 9.5% below 14.37; minimum measure 11.22 is 3.8% above 10.81 |

The old 8.4em cap sat inside the 4→5 danger zone (4 lines in the Display cut, 5 in the opsz 14 metrics), so it had to change. 9.6em was valid but had only 2.3% margin. Task 12.1 must use the new caps in the container queries.

**Result at every Test_Viewport** (model, Display-cut prediction, identical at r = 1): 320×568 and 360×640 → 7.60em, 5 lines; 375×667 → 9.31em, 390×844 / 414×896 / 667×375 → 9.40em, 4 lines; 844×390 11.85, 768×1024 11.58, 1024×768 and 1024×1366 11.43, 1280×800 11.71, 1440×900 11.85, 1920×1080 (DPR 1 and 2) and 3840×2160 11.51 → 3 lines. Line counts match the design table everywhere; font sizes match its Size column.

**Open points for later tasks:**

- **4-line break shape.** `text-wrap: balance` picks the narrowest 4-line arrangement, "Bridging the Gap / Between / Innovation and / Institutional Capital.", not the design's intended "Bridging the Gap / Between Innovation / and Institutional / Capital." (max 8.99em > 8.845em). The line count is right; the shape differs at 375–414 and 667×375. Changing the shape would need markup (for example a no-break space) and an owner decision; it is not a cap change.
- **Tiny landscape windows.** The `landscape-short` variant has no minimum width. For landscape viewports narrower than 466 px (for example 460×400, which no phone reports; the smallest landscape phone is 568×320) the 60% text column gives fewer than 6.70em, so the headline takes 6 or more lines. Property 2 (task 3.4) must either constrain its generator to landscape widths ≥ 568 or the variant must gain `min-width: 568px`. All other widths 320–3840 at heights 320–2400 are outside every danger zone.
- **Fallback metrics.** The display-tuned Arial fallback (task 3.1) is assumed to track the Display cut within the margins above. Kerning (not modeled) narrows lines further in both renders. Playwright line counts (task 12.2) are the enforcement.

## DEC-03: Explicit release gate for Site_Config validation (task 5.2)

Refines Req 14.6 ("production Build" means **release build**), 17.12, 18.7 and 19.7. Deviates from the design's "validate in `next.config.ts`".

- **Validator.** `validateSiteConfig(cfg, mode)` in `lib/site-config-schema.ts` reports one issue per offending key: `pending-integration` (DEC-02), `unresolved-cta` (missing, empty, `#`, bracket token, or a scheme outside `/`, `#`, `mailto:`, `https://`, so `javascript:` is rejected), `placeholder-email` (a `mailto:` with a bracketed domain, in CTAs or live Nav_Item hrefs), `invalid-nav-status`, `model-without-renderer` (any `emblem.kind` other than `raster`). `fixture-config` is reserved in the type for task 8.3 (DEC-05) and not emitted yet.
- **Modes.** Production: `ok` is false iff any issue exists. Non-production: `ok` is always true and `warnings` holds only the CTA issues (Req 17.12 covers CTAs). `issues` always lists every offending key.
- **Release mode is `PEYMAN_RELEASE=1`, not `NODE_ENV`.** Plain `next build` (local and preview) runs in non-production mode and succeeds while the CTA integrations are pending. The release pipeline must run `npm run build:release` (or `next build` with `PEYMAN_RELEASE=1`).
- **Where it runs.** `app/layout.tsx` calls `runSiteConfigGate(siteConfig)` (`lib/site-config-gate.ts`). In release mode it throws `SiteConfigReleaseError` during prerender, naming every key, and `next build` exits 1 ("Error occurred prerendering page"). It does not run from `next.config.ts` because the config loader cannot import the static image module (`assets/emblem/peyman-emblem.png`) that Site_Config references.
- **Non-production warnings.** The layout inlines one `<script>` (about 190 bytes for the two v1 warnings) that calls `console.warn` once per offending CTA key per page load. It is omitted when there are no warnings and is never present in a release build (which fails instead). Messages are JSON-serialized with `<`, `>`, `&`, U+2028 and U+2029 escaped. No client component is added.
- **Cross-platform env without dependencies.** `release:check` is `vitest run --config vitest.release.config.ts`; that config sets `PEYMAN_RELEASE=1` through `test.env`. `build:release` is `npm run release:check && node scripts/build-release.mjs`; the script runs Next's own bin (`next/dist/bin/next build`) with `PEYMAN_RELEASE=1` added to the child environment. This works the same in PowerShell, cmd and POSIX shells without `cross-env`. It is equivalent to the task's `npm run release:check && next build` with the variable set.
- **Current state.** `release:check` and `build:release` fail on `cta.primary.destination` and `cta.secondary.destination` (both `pending-integration`). This is expected and blocks release until the Contact and Advisory features resolve them.

## Hero layout oracle: measured values and interpretations (task 10.1)

`computeHeroLayout(viewport)` in `lib/layout-model.ts` is the test oracle for the CSS that task 12.1 writes. Where the design was silent or its numbers conflict with measured assets, the model uses the following. Task 12.1 must implement the same values, or change both together.

- **Emblem aspect ratio 1003/1144** (measured master, task 4.1), not 972/1108 or 994/1130. Anchor `{ x: 0.278, y: 0.499 }`. The design's emblem-size table is still reproduced within 0.5 px at every listed viewport (for example 390×844 → 162.8×185.7, 1440×900 → 533.3×608.3, 1920 → 620×707.2).
- **Mobile emblem area is the full content width, end-aligned**, not a hard columns 3–4 area. At every mobile Test_Viewport the emblem still sits inside columns 3–4. At narrow tall windows (for example 320×720: emblem 139 px wide, columns 3–4 only 132 px) a columns 3–4 area would break the exact height rule of Req 10.2. Every band caps the emblem at its area width (`max-inline-size: 100%`); this never binds at 320–3840.
- **Landscape phone.** Both columns start at header + 24 px (`align-items: start`) and use the tall mobile rhythm (24 / 20 / 28 / 24). The emblem is end-aligned in the 40% column. CTAs stack below 768 px (667×375) and sit in a row from 768 px (844×390), following Req 10.5 and 11.6 by width. Gutters stay at 20 px, as in task 3.2.
- **≥ 768 px.** Text block and emblem are each centered in the region from the header bottom to the Hero bottom, with at least 48 px padding (Req 11.5). Gaps: headline→copy `clamp(24px, 2vw, 32px)`, copy→CTA `clamp(32px, 3vw, 48px)`.
- **Supporting_Copy line count.** Measured the same way as the headline (Inter 4.001, fontTools, hmtx, no kerning), wght 400 at opsz 14 and 32, interpolated linearly at opsz = font size. Wrapping is greedy with break opportunities at spaces and after the hyphen in "high-growth". Width is `min(text block, 46ch)`. Predicted lines: 5 at 320, 4 at 360–390 and 667×375, 3 at 414 and every width ≥ 768. The copy has no measure caps, so these counts are not protected across the font swap. Playwright (task 12.2) is the enforcement.
- **CTA box.** Every `.btn` has a 1 px border (transparent unless painted), so width = label + 2 × padding (20 below 768, 28 from 768) + 2 px. Height = max(48 or 52, lines × 1.2 × font + 26). Label widths were measured at wght 500 with 0.02em tracking: "Start a Conversation" 152.1 px at 15 px and 161.6 px at 16 px; "Explore Advisory" 126.3 / 134.1 px. The 768 px tablet row needs 410.3 of 421 px, so it fits.
- **Plinth.** 1 px at the emblem's bottom edge. Mobile: the full content width. Other bands: from the emblem's inline-start edge to the content end, or to the viewport edge from 1920 px.
- **Parallax envelope.** 12 px translation plus a conservative projection of 2° rotateX/rotateY about the anchor under `perspective(1200px)`. That adds up to 5.6 px per side at 620 px. The design's "under 5 px" assumed a centered anchor. The envelope never intersects the text block (minimum clearance about 10.6 px, in the tablet band) and stays inside the Hero at every width 320–3840.
- **Vertical budget vs design** (Primary_CTA bottom): 390×844 655.8 (design 657), 390×660 549.7 (548), 360×640 584.1 (584), 375×667 550.6 (551). At 320×568 the headline bottom is 392.8 (393). All are within 2 px; the differences are the design's rounding of line heights.

**Open point: gold budget (Req 4.3, Property 7).** The design's 7.5% at "320×598" assumed a 598 px Hero. The model's Hero at 320 is 680 px, because the copy wraps to 5 lines, which gives 6.55%. The highest value at any Test_Viewport is 6.93% (390×660). But near-square compact portrait windows from about 444 to 584 px (h ≥ w, h < 720, for example 551×551 at 8.38%) exceed 8%. The full-width 48 px Primary_CTA (Req 10.5) is large relative to a short Hero. No Test_Viewport is affected, and Req 4.3 is scoped to Test_Viewports. Property 7 (task 10.5) is stated "for any viewport", so it needs an owner decision: either constrain its generator, or change the layout (for example cap the mobile CTA width), which would conflict with Req 10.5.

## Gold budget scope (task 10.5)

Resolves the task 10.1 open point above. Orchestrator decision, consistent with Req 4.3 being scoped to Test_Viewports. The layout is unchanged (Req 10.5 keeps the full-width 48 px Primary_CTA below 768 px).

- **Property 7 scope.** `tests/property/gold-area.property.test.ts` asserts `goldAreaRatio ≤ 0.08` (a) at every Test_Viewport and (b) for generated viewports from realistic device classes: portrait phones 320–430 × 568–960, landscape phones 568–1023 × 320–479, tablets and desktops 768–3840 × 480–2400.
- **Excluded.** Near-square compact-portrait windows (h ≥ w, h < 720). An exhaustive 1 px scan of 431–767 wide found exceedances only for widths and heights 444–584, worst 8.38% at 556×556. No phone or tablet reports such a viewport.
- **Measured worst cases (1 px scan, 4 px above 768 wide).** Portrait phones 7.74% (430×568), landscape phones 7.88% (763×456), tablets/desktops 3.15% (768×480). Test_Viewports: maximum 6.84% (360×640), 390×844 5.74%, 1440×900 1.23%. The design's 320×598 seed gives 6.55% because the Hero grows to 680 px.
- **Revisit** if a real device class enters the excluded range, or if Req 10.5 changes (for example a capped mobile CTA width).

## DEC-05: Live-nav fixture configuration for tests (task 8.3)

The shipped config has zero live Nav_Items (DEC-01, DEC-04), which would leave the inline nav, Mobile_Menu, focus trap and no-JS disclosure untestable. A test-only fixture makes those paths reachable. It never ships and the release gate rejects it. Supports Req 7.10, 14.6 and 20.2.

- **Fixture.** `data/fixtures/nav-live.ts` exports `withNavLiveFixture(base)`. It returns the shipped config with `showPlanned: true`, `fixture: "nav-live"` and 4 Nav_Items reusing the approved labels: Advisory → `/`, Industries → `#main` (`main#main`), About → `#top` (the HTML top-of-document fragment), all live, and Contact as planned. No page is invented. Every other key, including the approved copy and the pending CTAs, is unchanged. The base is passed in rather than imported, so the import graph stays acyclic.
- **Selection.** `data/site-config.ts` keeps the shipped values in `defaultSiteConfig` and exports `siteConfig: SiteConfig`, which is the fixture only when `PEYMAN_CONFIG_FIXTURE=nav-live`. An unknown value throws. `next.config.ts` inlines the variable through `env`, so the choice is a build-time constant. In the default build the fixture code is absent from `.next/server` and `.next/static` (checked by searching the output for the fixture's strings).
- **Marker, not env, for the gate.** `SiteConfig` gains an optional `fixture?: ConfigFixture` field that only fixtures set. `validateSiteConfig` reports `{ key: "fixture", reason: "fixture-config" }` for any `fixture` value, so validation stays a pure function of the config and the signature is unchanged. Configs without the key validate exactly as before. The issue is not a non-production warning (Req 17.12 covers CTAs only). With `PEYMAN_RELEASE=1`, a fixture build fails during prerender with `fixture: fixture-config ("nav-live")`, even when every CTA is resolved.
- **Separate output.** `next.config.ts` reads `distDir` from `NEXT_DIST_DIR`: `.next` (default) or `.next-fixture`. Any other value throws. `npm run build:fixture` (`scripts/build-fixture.mjs`) runs `next build` with `NEXT_DIST_DIR=.next-fixture` and `PEYMAN_CONFIG_FIXTURE=nav-live` in the child environment, the same cross-platform pattern as `build-release.mjs`. `PEYMAN_RELEASE` is passed through, so the gate still applies.
- **Type-checking side effects.** Next adds `<distDir>/types/**` to the tsconfig it uses and rewrites `next-env.d.ts` to import `<distDir>/types/routes.d.ts`. Both copies of the generated route types declare the global `LayoutProps`, so they cannot share one program. The fixture build therefore uses `tsconfig.fixture.json` (extends `tsconfig.json` and includes only `.next-fixture/types`), set through `typescript.tsconfigPath`. The script restores `next-env.d.ts` afterwards, so `npm run typecheck` keeps using `.next/types`.
- **Playwright.** Two projects: `chromium` (default build, port 3000) and `chromium-nav-live` (fixture build, port 3001, `next start` with `NEXT_DIST_DIR=.next-fixture`). Tests tagged `@nav-live` (`NAV_LIVE_TAG` in `tests/e2e/support/builds.ts`) run only against the fixture build; untagged tests run only against the default build. The fixture project and server are always configured in CI. Locally they are added only when `.next-fixture/BUILD_ID` exists, with a console warning otherwise. Run `npm run build && npm run build:fixture` before `npm run test:e2e`.
- `.next-fixture/` is ignored by git, ESLint and the repository conformance test.
- Supersedes the DEC-03 note that `fixture-config` is reserved and not emitted.

## DEC-01: Zero-live-nav header state (task 7.2)

With the shipped config (DEC-04: `showPlanned: false`, every Nav_Item planned), `renderedNavItems(siteConfig)` (`lib/nav.ts`) is empty. When it is empty, the Site_Header (`components/layout/site-header.tsx`) renders only the skip link, the Brand_Mark and the header CTA (quiet style, "Start a Conversation", `resolveCtaHref(cta.primary.destination)`, shown from 768 px). There is no `nav` landmark, no menu trigger, no Mobile_Menu and no `details` disclosure. Below 768 px the Hero Primary_CTA is the only action. `header[data-nav="none" | "items"]` exposes the state as a styling and test hook. The nav, trigger and disclosure zones are added by tasks 8.1, 8.4 and 8.5, and only when items exist (the fixture build, DEC-05).

This refines the following requirements for the zero-item case:

- **Req 7.1 and 12.5 (DOM and focus order).** Below 768: skip link, Brand_Mark, Primary_CTA, Secondary_CTA. From 768: skip link, Brand_Mark, header CTA, Primary_CTA, Secondary_CTA, at every width including ≥ 1280. The Nav_Item and menu-trigger positions are empty.
- **Req 7.5 and 7.13.** There are no inline Nav_Items to show at ≥ 1280 and no trigger to show below 1280.
- **Req 7.7.** "The Primary_CTA SHALL stay available in the Hero and in the Mobile_Menu": only the Hero applies, because there is no Mobile_Menu.
- **Req 8 (all).** Not applicable while no item renders. It applies unchanged once one does.
- **Req 12.4.** No `nav aria-label="Primary"` landmark is rendered while there are no items. An empty landmark would be announced with nothing in it. Exactly one `header` and one `main` remain, and the skip link is still the first focusable element.
- **Req 17.4.** No no-JS disclosure is rendered, because there is nothing to disclose.

### Brand_Mark `aria-current` from a parallel-route slot

Req 7.11 needs `aria-current="page"` on `/` only. The Site_Header must render before `main#main` in the root layout, but the root layout also wraps not-found and cannot read the pathname without `usePathname()`, which would add a fourth client leaf (Req 13.8). So the header comes from an `@header` parallel-route slot:

- `app/@header/page.tsx` renders `<SiteHeader current />` for `/`.
- `app/@header/default.tsx` renders `<SiteHeader />` (no `aria-current`) for hard loads of URLs without their own slot page. Next 16 requires `default.tsx` for every slot.
- `app/layout.tsx` renders `{header ?? <SiteHeader />}` before `main#main`. Next passes no slot to the not-found route (`header` is `undefined` there; checked in `.next/server/app/_not-found.html`), so not-found gets the header without `aria-current`.

Verified in the build output: `/` has one `header` with `aria-current="page"` on the Brand_Mark, and `_not-found` has one `header` with no `aria-current`. Both are static. No client component was added.

**Rule for future routes.** Every route that ships later must add `app/@header/<segment>/page.tsx` rendering `<SiteHeader />` (or `current` for its own section, if a later design needs that). On soft navigation, Next keeps the previously matched slot page for a slot that has no match. Without its own slot page, a client-side move from `/` to `/advisory` would keep `aria-current` on the Brand_Mark.

### Skip link placement

The skip link is the first child of the `header` element, not a sibling of it. `position: fixed` with `z-index: 50` makes the header a stacking context, so the skip link's `z-index: 100` resolves inside it. The only layers above 50 are the Mobile_Menu backdrop and panel (60, 70). While those are open, `header` is `inert` (task 8.5), so the skip link cannot be focused then. When focused, it is therefore always the topmost layer. Keeping it inside the header also means one `inert` covers it. It is clipped to 1 px until `:focus` (never `display: none` or `visibility: hidden`), then shown at the start gutter, centered in the header row. `main[tabindex="-1"]:focus` draws no outline, because a ring around the whole page carries no information. The next Tab reaches the first control inside `main`, which has the normal ring.

### Local build note

A leftover `NEXT_DIST_DIR=.next-fixture` in a shell session makes `npm run build` write the default config into `.next-fixture` (`next.config.ts` reads the variable). Clear it (`Remove-Item Env:NEXT_DIST_DIR`) before `npm run build`. `npm run build:fixture` sets it for its own child process only.

## Hero framing placement (task 11.1)

The design fixes the framing colors and the plinth rect but not where the spine and ticks sit. Choices in `components/hero/hero-framing.tsx` and `.hero-framing` in `app/globals.css`:

- **Spine.** A 1 px column line in a grid gap. Mobile: the gap after column 1. It runs from the header bottom down to the plinth and stands on it, in the empty columns beside the end-aligned emblem. For the side-by-side bands, task 12.1 should move it to the gap between the text and emblem spans (after column 5 on tablet, column 7 from 1024) and let it run the full Hero height.
- **Ticks.** Three 8 px marks on the spine at 1/4, 1/2 and 3/4 of its length, pointing toward the emblem. No numerals.
- **Plinth.** Matches `computeHeroLayout().plinth`: its top edge sits at the emblem's bottom edge, and on mobile it spans the full content width. Checked in Chromium at 320×568, 360×640, 390×844, 768×1024, 1440×900 and 1920×1080.
- **Mechanism.** The layer is absolutely positioned against the Hero grid (`.hero__grid { position: relative }`) and placed by grid lines. It takes no grid cell. All band-specific geometry is exposed as `--frame-*` variables, documented in the CSS comment, for task 12.1.
- **Layering.** `.hero__text` gets `position: relative; z-index: 5`, the design's layer-stack value. Without it, the positioned framing (z 1) would paint above the non-positioned text.

## Hero band layouts (task 12.1)

The CSS ("Hero band layouts" in `app/globals.css`) implements `computeHeroLayout()` with no deviations. Checked in Chromium against `npm run build` at all 15 Test_Viewports: every rect (Hero, text block, headline, copy, both CTAs, emblem, plinth) is within 0.3 px of the model. Headline line counts match (5/4/3), and there is no horizontal overflow or headline overflow.

- **Band selection.** Side-by-side rules apply at `(min-width: 48rem) and (min-height: 480px), (min-width: 64rem)`, the exact complement of `landscape-short` from 768. So 768–1023 windows shorter than 480 stay in the landscape band, as `bandFor()` does.
- **Vertical centering.** From 768 (and in landscape) `.hero` becomes a one-track grid, so `.hero__grid` stretches to the Hero height. Its 48 px block padding and `align-items: center` center the text block and the emblem in the region below the header. From 768 the Hero bottom padding is 0, matching the model, which ignores `safe-area-inset-bottom` from 768. The 48 px padding covers any home-indicator inset.
- **Shared geometry in container units.** `.hero` is an inline-size container named `hero`. `--hero-content-w` (100cqw, capped at 1360 / 1680) and `--hero-emblem-w` (per band: `min(span, 46svh × aspect)`, 460, 580, 620, or `min(40% column, 70svh × aspect)` in landscape) drive the stage width and the framing geometry together. The Hero section also exposes `--emblem-aspect`, so the framing layer can derive the emblem height.
- **Framing, from 768.** The spine sits in the gap after column 5 (tablet) or 7 (from 1024) and runs from the header bottom to the Hero bottom. The plinth runs from the emblem's inline-start edge (`100% − emblem width`) at `50% + emblem height / 2`, since the emblem is centered in its row. From 1920 it extends to the Hero's inline-end edge (gutter plus half the uncapped space) and stops exactly there. **Landscape:** the spine sits in the middle of the 24 px gap, from the header bottom to the Hero bottom. The plinth sits at the emblem base (both columns are top-aligned).
- **Not in this task.** The compact portrait band (h < 720) and the viewport metadata are task 13.1. `lib/emblem-sizes.ts` is unchanged, because the rendered widths equal the modelled ones.

## Motion chunk loading (task 16.4)

`components/motion/motion-loader.tsx` is the Hero's only client leaf. In its post-hydration `useEffect` it sets the `peyman:motion-start` User Timing mark (`lib/motion-marks.ts`), starts the 1600 ms deadline, reads the capability signals once and calls a plain `import("@/components/motion/hero-motion")`. HeroMotion receives `{ heroId, capabilities, lowPower, deadlineMissed }`; the contract is documented in `hero-motion.tsx`, whose body is task 16.5.

- **Always loaded.** The chunk loads under reduced motion, on coarse pointers and in Low_Power_Mode. Reduced motion and pointer type are evaluated live through `gsap.matchMedia()` so a runtime toggle can re-enable parallax without a reload (design rule 2, task 17.1). Low power is passed through as the design specifies. Skipping the import in low power would save about 43 KB of parse work on those devices; it is not done because the design contract passes `lowPower` to HeroMotion.
- **Deadline.** `deadlineMissed` is true if the import settles 1600 ms or more after the start mark (timer flag or elapsed time, whichever trips first).
- **Failure.** A rejected import is caught and never retried by application code, and render errors from the chunk are contained by a boundary inside MotionLoader (Req 17.7).
- **Bundler retry (deviation, Req 17.7).** The Turbopack chunk loader in Next 16.3.6 retries a script once after a network error (200–600 ms jitter) before rejecting the `import()`. So a failed chunk can produce two requests inside the single import call. No further requests follow the rejection. This is framework behavior with no configuration option; removing it would mean building with webpack instead of Turbopack. `tests/e2e/motion-loader.spec.ts` asserts at most two attempts and none after the rejection.
- **Measured (task 16.4, `next start`, Chromium, gzip).** Scripts requested before hydration: 141.8 KB (1 KB = 1,024 bytes), within the 180 KB budget (Req 13.3). The static HTML also references a 39.5 KB chunk that `/` never requests, so summing every script reference in the HTML (180.0 KB) overstates first-load JS; task 22.1 should measure requests, not HTML references. MotionLoader chunk: 0.85 KB. Motion chunk (GSAP, ScrollTrigger, @gsap/react, placeholder HeroMotion): 43.3 KB, within 50 KB (Req 13.5). It is requested after the start mark, with a `script` initiator, and is not in any preload or modulepreload.
## Reduced motion (task 17.1)
- **Intro plays at most once per document.** The CSS intro rules are scoped to `:root:not([data-intro-done])`. `lib/intro-done.ts`, called from MotionLoader's effect, sets `html[data-intro-done]` once every intro animation has finished (or was cancelled), and at once when `prefers-reduced-motion: reduce` matches at hydration or on a runtime change. So a reduce → no-preference toggle, or a CTA blur after `.cta-group:focus-within`, never replays the intro. Removing the rules drops `both`-filled, finished animations onto the identical final style. Without JS the attribute is never set and the intro still runs (Req 17.3). If `document.getAnimations` is missing, the attribute is set after the intro's 880 ms end.
- **State-change transitions under reduce.** The CTA overlay and nav underline (160 ms) and the header scrolled surface (240 ms) drop to `--dur-rmFade` (150 ms), opacity only, linear. A short fade was kept rather than 0 ms because it is not movement and matches the Mobile_Menu rule (Req 8.10). Touch press feedback stays instant. The menu fade and the icon morph (removed) were already in place from task 8.5.
- **GSAP.** Unchanged from 16.5: `gsap.matchMedia()` reverts parallax and a running sweep synchronously in the media change event, before the next frame. The sweep is spent under reduce, so toggling back re-enables parallax only.
- **Resting frame.** The static Light_Layer is the sweep's resting frame: `toRest` removes `data-sweep` and `--sweep-x`, the specular copy returns to `display: none`, and the sweep never writes the Light_Layer.
- **Model_Emblem (future).** The poster ↔ model crossfade is 0 ms under reduce (Req 5.8). Documented at the extension point in `components/hero/emblem-visual.tsx`; no model code exists.

## Emblem derivative delivery review (task 19.1)

No change to `next.config.ts` `images` or `lib/emblem-sizes.ts`: nothing measured gives a benefit worth a change.

- **Budgets (Req 13.6).** Measured with `npm run warm:images` on `npm run build` + `next start`, cold cache (1 KB = 1,024 bytes). AVIF: 32w 1.0, 192w 5.6, 384w 12.4 (limit 90), 512w 17.5, 640w 24.2, 1080w/1240w 42.6 KB (limit 180). WebP: 192w 12.2, 384w 30.3 (limit 130), 640w 63.0, 1080w/1240w 120.0 KB (limit 260). The largest file is under a quarter of its budget, so quality stays at 70; a higher quality has no approved visual need, and a lower one saves a few KB at the cost of fine-line detail. Cold AVIF encodes take up to about 1.2 s per candidate, which is why the warm-up exists (risk R1).
- **1080w and 1240w are the same file.** The master is 1003 px wide and Next never upscales, so both return the 1003 px image. 1240 stays in `deviceSizes` because Req 5.5 names it as the largest candidate. It costs one extra cache entry, not bytes on the wire.
- **Selected candidates (Chromium, `currentSrc`).** `sizes` resolves to 100–125% of the rendered width at every Test_Viewport (`tests/unit/emblem-sizes.test.ts`). The fetched candidate is the next `srcset` width up, so it can be larger: 390×844 → 192w (1.18×), 390×844 at DPR 3 → 640w (≤ 640, as required), 768×1024 → 384w (1.58×), 1440×900 → 640w (1.20×), 1920×1080 at DPR 2 → 1240w (the 1003 px master). The brand thumbnail takes 32w at DPR 1, 64w at DPR 2 and 96w at DPR 3.
- **Compact portrait at DPR 1 over-fetches (not changed).** At 320–375 px the emblem is 84–94 CSS px, but the smallest hero candidate is 192w, because the `vw` entries in `sizes` make next/image drop candidates below 184 px. Hiding the `vw` entries (for example `calc(36vw)`) would expose 96w/128w and save about 2–3 KB AVIF, but only on DPR 1 phones, which are not a real device class. At DPR 2 and 3 the same 256w/384w candidates are chosen either way.
- **Warm-up.** `scripts/warm-images.mjs` (`npm run warm:images`) and the Playwright `globalSetup` (`tests/e2e/support/warm-images.ts`) warm every derivative under both Accept variants; see README "Image optimizer warm-up". The `beforeAll` warm-ups in `motion.spec.ts` and `reduced-motion.spec.ts` stay: they also warm the page route and the browser's decode path for their timed windows.

## Fallbacks audit (task 20.1)

Each Req 17 criterion checked against the code. Two gaps were fixed in `app/globals.css`; the rest were already in place. Behavioral checks (failure injection, no-JS, chunk abort) are task 20.2; WebKit and Firefox runs are task 24.1.

| Req | Where handled | Status |
|---|---|---|
| 17.1 Emblem fails | `raster-emblem.tsx` (reserved `width`/`height` box, `alt=""`, `color: transparent`); `.raster-emblem__img::after/::before` failure cover (navy-950 tint and icon mask, Light_Layer kept); `sweep.ts` arms only when `naturalWidth > 0` | Done (tasks 10.7, 11.2, 16.5). WebKit limitation below |
| 17.2 Thumbnail fails | `brand-mark.tsx` fixed `.brand-mark__thumb` box; `.brand-mark__img::after` cover; link, wordmark and `aria-label` are independent of the image | Done (task 7.1). WebKit limitation below |
| 17.3 No JS | CSS-first intro with `animation-fill-mode: both` (final state without JS); CTAs are server `<a href>`; `<noscript>` drops the undecodable placeholder | Done (tasks 6.1, 10.7, 15.1) |
| 17.4–17.6 No-JS menu, swap | `nojs-menu.tsx` `details`/`summary` in the trigger slot, 44×44; `mobile-menu.tsx` swaps after hydration with focus carried over. Not rendered in v1 (DEC-01) | Done (tasks 8.4, 8.5), fixture build only |
| 17.7 Motion chunk fails / throws | `motion-loader.tsx` catches the `import()` rejection, no retry, render errors contained by its boundary; HeroMotion setup in `try/catch` with `mm.revert()` | Done (tasks 16.4, 16.5). Turbopack's single internal retry is documented under "Motion chunk loading" |
| 17.8 No `svh` | Plain properties: `100vh` then `100svh` (Hero min-height, mobile and compact stage heights; menu uses `vh` then `dvh`). **Fixed:** the landscape and tablet `--hero-emblem-w` custom properties used `70svh` / `46svh` directly. Custom properties are not validated at parse time, so a second declaration cannot act as a fallback, and an unsupporting browser would make every `var(--hero-emblem-w)` consumer (stage width, plinth, spine) invalid at computed-value time. They now use `N * var(--hero-svh)`, where `.hero` sets `--hero-svh: 1vh` and `@supports (height: 1svh)` upgrades it to `1svh`. Computed values are unchanged where `svh` is supported | Fixed |
| 17.9 No `mask-image` | `sweep.ts` `supportsMask()` never arms the copy. **Fixed:** added a CSS guard, `@supports not ((mask-image: linear-gradient(black, black)) or (-webkit-mask-image: …))`, that keeps `.raster-emblem__specular` at `display: none` even if `data-sweep` were set. Same probe as the JS. The Light_Layer uses no mask and is unaffected | Fixed |
| 17.10 No `backdrop-filter` | `@supports not (backdrop-filter or -webkit-backdrop-filter)` gives `.site-header__surface` 96% `ink-950`; the hairline and the transparent top state are unchanged | Done (task 7.3) |
| 17.11 Model fails | v1 is raster only. `emblem-visual.tsx` renders the Raster_Emblem for `kind: 'model'` too, and the release gate rejects `model` (`model-without-renderer`). No model loader, GLB or WebGL code exists, so there is nothing that can fail. The future loader must keep `<RasterEmblem>` as its poster (extension-point comment) | N/A in v1, documented |
| 17.12 Placeholder CTA warnings | `lib/site-config-gate.ts` + the inline `console.warn` script in `app/layout.tsx`, one per CTA key per load; CTAs render the `#pending-*` fragments | Done (task 5.2) |
| 6.10 / 16.7 Font fails | Inter and Source Code Pro use `display: 'swap'` (text never invisible); body text falls back to next/font's size-adjusted "Inter Fallback" (`adjustFontFallback`), the h1 to the display-tuned "Inter Display Fallback" `@font-face` (task 3.1) | Done, confirmed |

**17.8 follow-up.** The build's CSS minifier drops a same-property `vh` fallback when an `svh`/`dvh` declaration follows in the same rule, so the Mobile_Menu panel, the no-JS panel, the Hero, the Hero stage and its compact band now declare the `vh` value in the base rule and upgrade it in an `@supports (height: 1svh)` / `@supports (height: 1dvh)` block (placed before the band rules they must not override); both values are confirmed in the built CSS.

**WebKit broken-image limitation (Req 17.1, 17.2).** The failure covers rely on generated content (`::before`/`::after`) on `<img>`, which Chromium and Firefox render only for failed images and WebKit never renders. There is no CSS-only failure hook that works in WebKit: CSS has no `:broken` state, and next/image's own error handling cannot be used. Its `onError` path (which drops the inline `color: transparent`) replays pre-hydration errors only when a caller passes an `onError` function, and `RasterEmblem` and `BrandMark` are Server Components that cannot pass functions. Otherwise next/image treats a failed image like a loaded one: `decode()` rejects, the error is swallowed, and the placeholder is removed. Painting the tint on a wrapper would sit behind the loaded emblem's transparent pixels and alter the resting frame, so it was not done. In WebKit a failed emblem therefore keeps its reserved box (CLS 0), `alt=""` (no alt text), the vignette and pool, and no sweep, but shows the stage gradient instead of the navy-950 tint. Whether WebKit also paints a broken-image glyph for `alt=""` images with explicit dimensions is unverified here; task 24.1 (WebKit project) must check it. If it does, the fix needs a small client hook (for example an `onError` on a client wrapper that sets a failure attribute), which is a client-leaf change (Req 13.8) and needs an owner decision.
