# Requirements Document

## Introduction

This spec covers the homepage hero for the Peyman Consulting website. It also covers the premium Site_Header, which will later become the global navigation. It is the first feature of a larger site and must set the visual, motion, accessibility and performance standard for everything built after it.

Target impression: "an elite advisory institution presented through a modern legal-intelligence interface". The mood is quiet institutional power. The creative mix is 30% legal/institutional authority, 30% technology/intelligence, 20% editorial luxury and 20% original Peyman. In the first 2–3 seconds the visitor should read the brand as serious, sophisticated and different. It must not read as a law-firm template, a generic corporate site, a startup or SaaS template, a government portal, a stock-photo legal site or a flashy WebGL demo.

### Source inputs (authoritative)

`reference/peyman-brief.pdf` (3 pages) is the authoritative source for company facts. Text was extracted locally with PyMuPDF and no files were written. Facts used by this spec:

- Positioning headline: "Bridging the Gap Between Innovation and Institutional Capital." (PDF p.1)
- Name meaning (PDF p.1): "Rooted in the ancient concept of Peyman (IPA: /pejmɒːn/ pay-mahn), a binding agreement of trust and loyalty."
- Services (PDF p.2, verbatim names):
  1. Capital Structuring & Financial Advisory
  2. Legal & Transactional Advisory
  3. Government Grant & Policy Advisory
  4. Fundraising Readiness & Deal Syndication
- Founder: Omar Saud, MBA, MS, LL.B, Founder & Startup Consultant (PDF p.1). Not used in the hero.
- Proof point (PDF p.3): "over 1,250 startups within state-backed initiatives". Not used in the hero.
- Contact (PDF p.3):
  - Office location: Bengaluru, Karnataka.
  - Email: `inquiries@peymanconsulting.[domain]`. The domain is an unresolved placeholder in the brief.
  - LinkedIn page: no URL supplied.
  - Inquiry form with the fields Name, Startup Name, Email, Area of Interest/Service required.

Where the PDF conflicts with the user brief, the approved copy wins. These conflicts are listed for sign-off:

| Item | PDF says | Approved (used) |
|---|---|---|
| Supporting copy | "…Premier financial, legal, and government advisory for high-growth **startups** navigating complex transactions." | "Strategic financial, legal and government advisory for high-growth **businesses** navigating complex transactions, capital and regulation." |
| CTAs | "Schedule a Consultation / Partner With Us" | "Start a Conversation" / "Explore Advisory" |

### Logo asset findings (`reference/*.png`)

| File | Content | Pixels | Alpha | Size |
|---|---|---|---|---|
| `logo-primary.png` | "P" monogram: a fluted classical column with a ribbon forming the bowl, and **scales of justice** hanging inside the bowl | 1225×1284 | True RGBA transparency (58% transparent px) | 1.38 MB |
| `logo-alternative.png` | Same "P" column and ribbon, **no scales** | 1254×1254 (content bbox 972×1108, asymmetric padding) | True RGBA (64% transparent) | 1.06 MB |
| `logo-column.png` | **Standalone scales of justice.** The file name is misleading because the image contains no column. | 1312×1199 | True RGBA (73% transparent) | 1.11 MB |

- **Rendering:** all three are photoreal, 3D-looking renders. The surfaces read as lacquered/brushed metallic navy with polished gold trim. Specular highlights are baked in and come from the upper-left. None of the files is vector.
- **Edges:** anti-aliased edges are dark (mean edge luminance about 50/255) with no white halo, so the marks sit cleanly on navy or near-black.
- **Sampled emblem colors:**
  - Navy: #040E23 (shadow), #071E46 (mid), #446592 (highlight).
  - Gold: #5B3E1F (shadow), #C59655 (mid), #F6E7C4 (highlight).
- **Missing assets:**
  - A wordmark / name lockup.
  - A simplified small-size mark or SVG for the header and favicon.
  - A master of at least 2400 px for 4K and DPR 3 sharpness.
  - Any GLB/GLTF model, depth map or normal map.
- **Default hero emblem:** `logo-alternative.png`. The brief excludes scales from hero visuals, and this variant is the only one without scales. The logo itself is not altered. Trimming transparent padding and generating AVIF/WebP derivatives are the only permitted asset operations.

### Reference study (principles only; no code or visual cloning)

License status was taken from the GitHub API. Only skynetlabs-law-demo carries a license (MIT). The other three have no license, so they are all-rights-reserved and were studied for principles only.

- **justice-law-firm (Next 14, GSAP, Lenis):**
  - Adopt: dark editorial stage with a single gold hairline, content data kept separate from components (`data/`), GSAP context cleanup.
  - Reject: CTAs revealed after 1.5 s, 90° word flips, infinite yoyo scroll cue, `min-h-screen` (100vh mobile toolbar bug), scroll-listener state, and a mobile menu without `aria-expanded`, Escape or focus management.
- **Atrey-Chambers-of-Law (reference only, real firm):**
  - Adopt: 320 px→4K coverage mindset, Lenis↔ScrollTrigger sync, gating motion on reduced motion.
  - Reject: particles, courthouse stock photography, rotating taglines, credential ticker overload, and a CTA implemented as a button with `location.href` instead of a link.
  - Reject its ticker cleanup, which removes a different function reference than the one it added and leaks the callback.
- **skynetlabs-law-demo (MIT):**
  - Adopt: the hero visual as a swappable layer, where R3F is lazy-loaded with `next/dynamic` (`ssr:false`) behind a Suspense poster fallback and swapped to the poster under reduced motion. Also adopt the DPR cap `[1, 1.5]` and a single motion-token source.
  - Reject: endless `Float`/`Sparkles`/`autoRotate` motion, an h1 that starts at `opacity:0` (LCP risk), a reduced-motion flag that defaults to `false` during SSR (motion flash), exit-intent modals and sticky sales bars.
- **harringtonandco (React 19, Tailwind 4):**
  - Adopt: skip link, `aria-expanded`/`aria-controls`, focus returned to the trigger on close, static-first rendering.
  - Reject: 7–10 px text, no Escape key or focus trap, a close target of about 20 px, and a full-bleed stock photo under an 80% overlay.

### Emblem / 3D strategy evaluation

| Option | Perceived quality | Cost / risk | Verdict |
|---|---|---|---|
| Static raster only | Good render, but reads flat | Lowest | Baseline and fallback only |
| **Layered raster stage**: AVIF emblem, lighting layers, a specular sweep masked to the emblem alpha, a light pool, a vignette and bounded parallax | High. It amplifies the existing photoreal render | No 3D dependency; transform/opacity/mask only | **Recommended** |
| Depth-map / shader displacement plane | Medium; glossy edges tear | Needs a depth map that is not supplied, plus three.js | Rejected |
| R3F with the PNG on a plane | Same as raster | Adds a large three.js payload with no visual gain | Rejected |
| R3F + GLB model | Highest, once a model exists | No model supplied; GPU and battery cost | **Future path** through the Emblem_Visual contract |
| Pre-rendered turntable video | Medium | No source footage; heavy; spinning is excluded | Rejected |

**Decision:** build the Layered Raster Stage now. Put the emblem behind an `Emblem_Visual` contract so a `Model_Emblem` (R3F + GLB) can replace the `Raster_Emblem` later without changing the hero layout, copy, header or motion system. Do not install three.js or R3F in this feature.

**Lenis:** not adopted in this feature. The hero is a single viewport. Native scrolling costs no JavaScript, keeps native keyboard and assistive-tech scrolling behavior, and adds no ticker work. Revisit Lenis when multi-section scroll choreography exists.

### Pinned versions (verified at spec authoring)

API patterns were verified via Context7:
- Next.js v16.2.9 docs: `next/image` `preload` replaces the deprecated `priority`.
- @gsap/react: `useGSAP` with `scope` and `contextSafe`.
- GSAP: `gsap.matchMedia` conditions with automatic revert.
- Lenis: `autoRaf:false` with `gsap.ticker`.
- R3F: `frameloop="demand"`, the `dpr` clamp and `PerformanceMonitor`.
- Tailwind v4: `@tailwindcss/postcss` and CSS-first `@theme`.

Latest stable versions were read from the npm registry.

| Package | Version | Status |
|---|---|---|
| next | 16.3.6 | Install (requires Node ≥ 20.9.0) |
| react / react-dom | 19.3.0 | Install |
| typescript | 7.0.2 | Install. If `next build` type-checking fails with TS 7 (open Next.js issues #95400 / #96589), pin 6.0.3 and record the reason |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | Install |
| postcss | 8.5.28 | Install |
| gsap | 3.15.0 | Install (GSAP standard license; all plugins, including ScrollTrigger, are free) |
| @gsap/react | 2.1.2 | Install |
| @types/react / @types/react-dom | 19.3.0 | Install (dev) |
| @types/node | Match the Node LTS major in use | Install (dev) |
| eslint / eslint-config-next | 10.11.0 / 16.3.6 | Install (dev) |
| vitest / @testing-library/react / fast-check | 5.0.2 / 16.3.3 / 4.10.2 | Install (dev) |
| @playwright/test / @axe-core/playwright / @lhci/cli | 1.63.0 / 4.13.0 / 0.15.1 | Install (dev) |
| lenis | 1.3.26 | Deferred, not installed |
| three / @types/three | 0.186.1 / 0.186.0 | Deferred, not installed |
| @react-three/fiber / @react-three/drei | 9.8.1 / 10.7.9 | Deferred. Fiber's react peer range is ">=19 <19.4", which is compatible with 19.3.0 |

### Open questions (need owner sign-off before release)

1. Confirm `logo-alternative.png` as the hero emblem, instead of `logo-primary.png` with scales.
2. Supply the real email domain and the destination for "Start a Conversation". No contact route exists yet.
3. Confirm the approved copy supersedes the PDF (the copy conflicts table above).
4. Decide whether a typeset "PEYMAN CONSULTING" wordmark is acceptable in the header until an official wordmark is supplied.
5. Approve or reject the optional Service_Index (verbatim PDF service names) and Etymology_Note (verbatim PDF meaning).
6. Select the typefaces. Candidate criteria are in Requirement 6.
7. Supply a higher-resolution emblem master (≥ 2400 px on the long edge).
8. Confirm whether planned (coming-soon) Nav_Items are shown before their pages exist. Site_Config defaults `nav.showPlanned` to true (Requirement 7.16). While `/` is the only route (Requirement 19.1), live Nav_Items can only target `/` or in-page anchors.
9. Sign off the proposed values introduced during requirements refinement:
   - Column gaps of 16 / 24 / 32 px (Requirement 2.3).
   - Emblem padding of 0–2% (Requirement 5.1) and the 10 s timing values (Requirements 5.10 and 5.12).
   - The state-change curve `cubic-bezier(0.65, 0, 0.35, 1)` (Requirement 9.2) and the 16 px Headline entrance translate cap (Requirement 9.5).
   - WebP size limits of 130 KB / 260 KB (Requirement 13.6).
   - The Brand_Mark as the focus target when the Mobile_Menu closes on resize (Requirement 8.8).

## Glossary

- **Hero**: The first section of the homepage, containing the Headline, Supporting_Copy, CTAs and Emblem_Stage.
- **Site_Header**: The persistent top bar with the brand mark, Nav_Items and header CTA. It is designed to become the global navigation.
- **Brand_Mark**: The header logo lockup: the Raster_Emblem thumbnail plus the typeset wordmark "PEYMAN CONSULTING".
- **Nav_Item**: One navigation entry from Site_Config: Advisory, Industries, Intelligence, Insights, About, Recognition or Contact. Each has a status of `live` or `planned`.
- **Planned_Nav_Item**: A Nav_Item whose target route does not exist yet.
- **Mobile_Menu**: The modal navigation panel opened from the menu trigger below the desktop navigation breakpoint.
- **Headline**: The approved h1 "Bridging the Gap Between Innovation and Institutional Capital."
- **Supporting_Copy**: The approved paragraph "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation."
- **Primary_CTA**: The link labelled "Start a Conversation".
- **Secondary_CTA**: The link labelled "Explore Advisory".
- **Service_Index**: An optional hero element listing the four PDF service names verbatim.
- **Etymology_Note**: An optional hero meta element that quotes the PDF meaning of "Peyman" verbatim.
- **Emblem_Stage**: The hero visual region. It owns layout, lighting layers and the Emblem_Visual slot.
- **Emblem_Visual**: The swappable contract for the emblem renderer. It is either a Raster_Emblem or a Model_Emblem, and both share one aspect ratio and anchor.
- **Raster_Emblem**: The emblem rendered from `logo-alternative.png` derivatives (AVIF/WebP).
- **Model_Emblem**: A future GLB/GLTF emblem rendered with R3F. It is out of scope to build.
- **Light_Layer**: Decorative lighting in the Emblem_Stage: a vignette, a light pool, and a Specular_Sweep masked to the emblem alpha.
- **Specular_Sweep**: A single-pass highlight that moves across the emblem surface during the Intro_Sequence.
- **Intro_Sequence**: The one-time entrance choreography after page load.
- **Pointer_Parallax**: A bounded Emblem_Stage offset that responds to a fine pointer.
- **Scroll_Exit**: A scrubbed Emblem_Stage transform while the Hero scrolls out of view.
- **Motion_System**: The GSAP-based motion layer, with shared tokens and reduced-motion and low-power gating.
- **Reduced_Motion_Mode**: The state active when `prefers-reduced-motion: reduce` matches.
- **Low_Power_Mode**: The state active when Save-Data is on, OR `navigator.deviceMemory` ≤ 4, OR `navigator.hardwareConcurrency` ≤ 4, OR the document is hidden.
- **Site_Config**: A typed data module holding brand strings, CTA destinations, Nav_Items and feature flags.
- **Typography_System**: The type roles (display, heading, body, CTA, eyebrow/meta), implemented as CSS tokens.
- **Palette**: The color tokens defined in Requirement 4.
- **Test_Viewports**, in CSS px:
  - 320×568, 360×640, 375×667, 390×844, 414×896
  - Landscape phone: 667×375, 844×390
  - Tablet: 768×1024, 1024×768, 1024×1366
  - Desktop: 1280×800, 1440×900, 1920×1080
  - 4K: 3840×2160 at DPR 1, and 1920×1080 at DPR 2
- **Initial_Viewport**: The region from the top of the document to one small-viewport height (100svh) at page load.
- **Quality_Gate**: An automated or manual check that must pass before merge or release.
- **Build**: `next build` output for production.

## Requirements

### Requirement 1: Hero UX

**User Story:** As a prospective founder or investor, I want to understand who Peyman Consulting is and how to engage within seconds, so that I can decide to start a conversation.

#### Acceptance Criteria

1. THE Hero SHALL always render the Headline, Supporting_Copy, Primary_CTA, Secondary_CTA and Emblem_Stage. THE Hero SHALL render no other content elements except the optional Etymology_Note and Service_Index (each only when enabled in Site_Config, per Requirement 3) and decorative elements marked `aria-hidden="true"` (per Requirement 2.5). The Etymology_Note is the only content element permitted before the Headline (Requirement 3.1).
2. THE Hero SHALL render the following text character-for-character, with no CSS `text-transform` applied, so that each element's text content exactly equals the approved string:
   - Headline: "Bridging the Gap Between Innovation and Institutional Capital." (including the terminal period)
   - Supporting_Copy: "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation."
   - Primary_CTA label: "Start a Conversation"
   - Secondary_CTA label: "Explore Advisory"
3. WHILE the viewport is at least 360 CSS px wide and at least 548 CSS px tall, THE Hero SHALL display the Headline, Supporting_Copy and Primary_CTA fully within the Initial_Viewport. Measure this at scroll position 0, at 100% browser zoom, in the final composed state (after the Intro_Sequence completes, or at first paint in Reduced_Motion_Mode). "Fully within" means that each element's bounding box:
   - has its top edge at or below the Site_Header's bottom edge;
   - has its bottom edge at or above the bottom of the Initial_Viewport;
   - has its left edge at or right of 0 and its right edge at or left of the viewport width;
   - is not overlapped by the Site_Header.
4. WHILE the viewport is narrower than 360 CSS px or shorter than 548 CSS px (including 320×568, 667×375 and 844×390), THE Hero SHALL display the Headline fully within the Initial_Viewport, using the measurement conditions and definition in criterion 3. THE Hero SHALL also keep the Supporting_Copy, Primary_CTA and Secondary_CTA reachable by vertical scrolling alone, with no horizontal scrolling.
5. WHEN a visitor activates the Primary_CTA by pointer click, touch tap, or the Enter key while it has focus, THE Hero SHALL navigate to exactly the destination defined in Site_Config `cta.primary.href`.
6. WHEN a visitor activates the Secondary_CTA by pointer click, touch tap, or the Enter key while it has focus, THE Hero SHALL navigate to exactly the destination defined in Site_Config `cta.secondary.href`.
7. THE Hero SHALL render the Primary_CTA and Secondary_CTA in the server-rendered HTML as `a` elements. Each SHALL carry a non-empty `href` attribute. Neither SHALL carry `role="button"`, and neither SHALL rely on a script handler to navigate, so that both CTAs are operable without JavaScript. In a production Build, neither `href` SHALL be `#` or use the `javascript:` scheme. Non-production placeholder behavior is governed by Requirement 17.12.
8. WHEN hydration completes, THE Hero SHALL make the Primary_CTA and Secondary_CTA respond to click, tap and Enter activation within 100 ms, whatever the progress of the Intro_Sequence. At no point before, during or after the Intro_Sequence SHALL either CTA, or any of its ancestors, have `pointer-events: none`, `visibility: hidden`, `inert`, `aria-hidden="true"` or a negative `tabindex`.
9. THE Hero SHALL omit all of the following:
   - carousels;
   - rotating or cycling taglines;
   - autoplay video;
   - pop-ups (any overlay, modal or dialog that opens without a visitor activation);
   - exit-intent modals;
   - scroll cues with infinite or repeating motion;
   - cursor effects (custom cursors, cursor-following elements and cursor trails).

   The bounded Pointer_Parallax defined in Requirement 9.7 is not a cursor effect. The Mobile_Menu, which opens only on visitor activation, is not a pop-up.

### Requirement 2: Visual Composition

**User Story:** As the brand owner, I want a composed, asymmetric editorial layout around the emblem, so that the hero reads as an institution rather than a template.

#### Acceptance Criteria

1. THE Hero SHALL paint its stage background only with `ink-950`, `navy-950` and `navy-900`, either as a solid fill or as one gradient between two of these tokens, and SHALL use no photographic or other raster background image.
2. THE Hero SHALL limit its gradients as follows. A gradient is any gradient image used as a background or mask. The emblem alpha mask used by the Specular_Sweep does not count.
   - Each gradient has at most two color stops.
   - Each stop resolves to a Palette token at an opacity from 0% to 100%.
   - The stage background outside the Emblem_Stage uses at most one gradient.
   - The Emblem_Stage uses at most three gradients.
3. THE Hero SHALL lay out the text block on an equal-width column grid that spans the content box. The text block is the optional Etymology_Note, the Headline, the Supporting_Copy, the Primary_CTA, the Secondary_CTA and the optional Service_Index. The content box is the Hero width minus inline gutters, capped by the maximum widths in Requirement 11. The start edges of the Headline, Supporting_Copy and Primary_CTA SHALL each lie within 1 px of the start edge of column 1. The grid is:
   - Below 768 px: 4 columns, 16 px column gap, inline gutters as in Requirement 10.4.
   - 768 px to 1023 px: 8 columns, 24 px column gap, inline gutters as in Requirement 11.7.
   - 1024 px to 1279 px: 12 columns, 32 px column gap, inline gutters as in Requirement 11.7.
   - 1280 px and above: 12 columns, 32 px column gap, inline gutters as in Requirement 11.7 and maximum widths as in Requirements 11.3 and 11.4.

   While the landscape phone layout in Requirement 10.7 applies, its 60% / 40% split of the content box replaces these column assignments.
4. WHILE the viewport is at least 1024 px wide, THE Hero SHALL place the text block bounding box within columns 1–6 and the Emblem_Stage bounding box within columns 7–12, each within ±1 px of its column span, and SHALL left-align (`text-align: start`) all text in the text block.
5. THE Hero SHALL limit its decorative "intelligence" details to straight 1 CSS px hairlines and measurement ticks. These details SHALL:
   - Be stroked in `ivory-50` at 6–12% opacity, except that at most one hairline MAY be stroked in `gold-500` at 20–40% opacity.
   - Be marked `aria-hidden="true"` and contain no focusable element.
   - Have no bounding box that intersects the bounding box of the Headline, Supporting_Copy, Primary_CTA or Secondary_CTA.
6. THE Hero SHALL exclude gavels, courthouses, standalone scales imagery, particles, crypto or gaming aesthetics, glassmorphism cards, stock photography and neon glows. This is verified by all of the following at every Test_Viewport:
   - The only raster images in the Hero are the Raster_Emblem derivatives (AVIF/WebP of `logo-alternative.png`).
   - The only vector graphics in the Hero are the hairlines and measurement ticks in criterion 5.
   - WHILE the Emblem_Visual `kind` is `raster`, the Hero contains no `canvas` element and creates no WebGL context.
   - No Hero element uses `backdrop-filter`, and no Hero text uses `text-shadow`.
   - Outside forced-colors mode, every non-image color the Hero paints resolves to a Palette token at any opacity. This covers fills, strokes, borders, shadows and gradient stops.
7. THE Hero SHALL keep every descendant layer inside the Hero bounds, so that no layer paints outside the Hero border box. Descendant layers include the Light_Layer, the emblem at maximum Pointer_Parallax offset and the emblem at the full Scroll_Exit transform. Anything that extends past the border box SHALL be clipped there. THE Hero SHALL produce zero horizontal overflow at every Test_Viewport, measured as `document.scrollingElement.scrollWidth` ≤ `window.innerWidth`.
8. THE Hero SHALL keep the rendered emblem box and the text block bounding box from intersecting at every Test_Viewport, including while Pointer_Parallax is at its maximum 12 px offset.

### Requirement 3: Content Hierarchy

**User Story:** As a visitor scanning quickly, I want an unambiguous reading order, so that I absorb the positioning before the details.

#### Acceptance Criteria

1. THE Hero SHALL order its content elements in the DOM as: Etymology_Note (only when enabled), Headline, Supporting_Copy, Primary_CTA, Secondary_CTA, Service_Index (only when enabled), Emblem_Stage. No other content element SHALL come before the Headline.
2. THE Hero SHALL render the Headline as the only `h1` element in the document.
3. THE Hero SHALL render the Primary_CTA and Secondary_CTA with these default (non-hover, non-focus) styles:
   - Primary_CTA: a solid `gold-500` background fill with an `ink-950` label.
   - Secondary_CTA: a transparent background, an `ivory-50` label, and either no border or a 1 px border that meets 3:1 contrast against the adjacent Hero background (Requirement 12.1).
   - Neither CTA uses gold for its border or label in the default state (Requirement 4.2).
4. THE Hero SHALL place the Primary_CTA before the Secondary_CTA in both DOM order and sequential focus order. At every Test_Viewport, the Primary_CTA SHALL appear above the Secondary_CTA when the two are stacked, or to its left when they share a row.
5. WHERE the Service_Index is enabled in Site_Config, THE Hero SHALL render a list with `aria-label="Advisory services"` and exactly four list items. The items SHALL appear in PDF page 2 order, with text matching character-for-character: "Capital Structuring & Financial Advisory", "Legal & Transactional Advisory", "Government Grant & Policy Advisory", "Fundraising Readiness & Deal Syndication". The items SHALL be non-interactive text, with no links, buttons or focusable elements.
6. WHERE the Etymology_Note is enabled in Site_Config, THE Hero SHALL render text content that matches "Peyman /pejmɒːn/ (pay-mahn): a binding agreement of trust and loyalty" character-for-character (sourced from PDF page 1). The IPA segment "/pejmɒːn/" SHALL be wrapped in an element with `lang="fa-fonipa"` and a computed `text-transform` of `none`. The respelling "(pay-mahn)" SHALL remain as visible text exposed to assistive technology.
7. THE Site_Config SHALL default the Service_Index and Etymology_Note flags to disabled until owner approval (Open Question 5). WHILE a flag is disabled, THE Hero SHALL leave the corresponding element out of the rendered DOM rather than hiding it with CSS or `hidden`.
8. THE Hero SHALL limit its text content, including visually hidden and `aria-hidden` text, to the Headline, the Supporting_Copy, the Primary_CTA and Secondary_CTA labels, and, when enabled, the Service_Index and Etymology_Note. Decorative hairlines and measurement ticks (Requirement 2.5) SHALL contain no text or numerals. The Hero SHALL contain no statistics, awards, founder details or client names.
9. WHILE any Test_Viewport is active, THE Hero SHALL position the text-block elements so that their visual top-to-bottom order matches the DOM order in criterion 1. Each element's bounding-box top SHALL be at or below the bounding-box bottom of the element before it, except that the Primary_CTA and Secondary_CTA may share a row. The Emblem_Stage may be placed visually per Requirements 2.4, 10.1 and 11.
10. WHERE the Service_Index or Etymology_Note is enabled, THE Hero SHALL render it in the eyebrow/meta role (Requirement 6.6). The Headline SHALL have the largest computed font size of any text in the Hero at every Test_Viewport.

### Requirement 4: Brand Treatment and Palette

**User Story:** As the brand owner, I want disciplined use of navy, black, gold and ivory, so that the site feels precise and discreet.

#### Acceptance Criteria

1. THE Palette SHALL define the following tokens once, as Tailwind CSS v4 `@theme` tokens that serve as the single source for all Hero and Site_Header colors:
   - `ink-950` #05070C
   - `navy-950` #040E23
   - `navy-900` #0A1A36
   - `navy-800` #071E46
   - `gold-500` #C59655
   - `gold-300` #D6AE72
   - `gold-100` #F6E7C4
   - `ivory-50` #F4EFE4
   - `ivory-300` #B8B2A5

   The navy and gold values are sampled from the emblem. The remaining values are proposed. Any change to a token value SHALL be accepted only after every pairing listed in Requirement 12.2 is recomputed and still meets the thresholds in Requirement 12.1.
2. THE Hero SHALL use gold tokens (`gold-500`, `gold-300`, `gold-100`) only for the following:
   - The Primary_CTA fill: `gold-500` at rest, with `gold-300` permitted for its `:hover` and `:active` states.
   - Hover accents on interactive elements.
   - Hairlines and measurement ticks, as defined in Requirement 2.5.
   - At most one inline emphasis, defined as a single contiguous text span within the Headline or Supporting_Copy, rendered in `gold-500` with its characters unchanged from the approved copy.

   Gold SHALL NOT be used for the `:focus-visible` indicator, which remains `ivory-50` per Requirement 12.3.
3. THE Hero SHALL keep gold-painted area at or below 8% of the Hero area outside the Emblem_Stage box. This is measured in the final composed state at every Test_Viewport as the summed bounding-box area of every element painted with a gold token (fill, border, hairline, tick or text span), divided by the Hero bounding-box area minus the Emblem_Stage bounding-box area.
4. THE Brand_Mark SHALL render the Raster_Emblem unmodified in shape, color and proportion, according to all of the following:
   - Only uniform scaling is permitted, with a rendered aspect ratio within ±1% of 972:1108.
   - No CSS `filter`, `mix-blend-mode`, `mask`, color overlay or non-uniform transform is applied to the emblem image.
   - The image pixels are unchanged apart from the permitted transparent-padding trim and AVIF/WebP encoding.
5. WHILE no wordmark asset is supplied in Site_Config, THE Brand_Mark SHALL set the wordmark as the typeset text "PEYMAN CONSULTING" according to all of the following:
   - Uppercase, in `ivory-50`.
   - In one Typography_System role whose selection is recorded in Site_Config.
   - At a computed font size of at least 12 CSS px.
   - On a single line with no truncation, clipping or overlap with other Site_Header elements at every Test_Viewport.
6. WHERE Site_Config supplies a wordmark asset, THE Brand_Mark SHALL render that asset in place of the typeset wordmark. The Brand_Mark SHALL keep the accessible name "Peyman Consulting, home" (Requirement 7.11), fit within the Site_Header height defined in Requirement 7.2, and contribute a layout shift score of 0.
7. THE Hero and Site_Header SHALL render the Raster_Emblem only where the composited background within the emblem box, excluding Light_Layer effects, is `ink-950`, `navy-950`, `navy-900`, or a gradient whose every color stop is one of these three tokens.
8. THE Hero and Site_Header SHALL use only the following text/surface pairings, and every pairing SHALL meet the contrast thresholds of Requirement 12.1:
   - On dark surfaces (`ink-950`, `navy-950`, `navy-900`, `navy-800`): text in `ivory-50` or `ivory-300`, plus `gold-500` text only for the inline emphasis permitted in criterion 2.
   - On `gold-500` or `gold-300` surfaces: text in `ink-950` only.
9. THE Hero and Site_Header SHALL take every authored color value from Palette tokens, with opacity variants permitted. This covers backgrounds, text, borders, outlines, hairlines, gradient stops and shadows. Two exceptions apply: pixel colors inside the Raster_Emblem image, and system colors used in forced-colors mode per Requirement 12.8.

### Requirement 5: Emblem and 3D Strategy

**User Story:** As the brand owner, I want the supplied 3D emblem presented as a lit, dimensional centerpiece that can later become a real 3D model, so that the hero feels premium now and scales later.

#### Acceptance Criteria

1. THE Emblem_Stage SHALL render the Raster_Emblem from derivatives of `logo-alternative.png` that meet all of the following:
   - Trimmed to the alpha bounding box (972×1108 source px).
   - Padded with transparent pixels equal on all four sides, from 0 to 2% of the trimmed height (0–22 source px per side).
   - An intrinsic aspect ratio of 972:1108 (±1%).
   - No differences from the source other than trimming, uniform padding, uniform scaling and AVIF/WebP encoding, with shape, color and proportion unchanged.
2. THE Emblem_Stage SHALL serve the Raster_Emblem via `next/image` with:
   - AVIF for browsers that accept AVIF, and WebP for browsers that do not.
   - `width` and `height` attributes equal to the derivative's intrinsic pixel dimensions.
   - A `sizes` attribute that, at every Test_Viewport, resolves to 100–125% of the emblem's rendered CSS width as defined in Requirements 10 and 11.
   - `preload` enabled on the hero emblem image.
3. THE Emblem_Stage SHALL mark the hero emblem image as decorative (`alt=""`), because the Brand_Mark link carries the accessible organization name. The Emblem_Visual and Light_Layer SHALL expose no accessible name, focusable element or live region.
4. THE Emblem_Stage SHALL render the Light_Layer (vignette, light pool beneath the emblem, and Specular_Sweep masked to the emblem alpha) under these rules:
   - It stays inside the Emblem_Stage bounds, with pointer events disabled.
   - It is painted with no more than the gradient allowance in Requirement 2.2.
   - It changes only through opacity, transform, mask and blend-mode properties, never through layout properties.
5. THE Emblem_Stage SHALL cap the rendered emblem width at 620 CSS px at every viewport and DPR. This limits the largest required derivative to 1240 device px, which is at most 1.28× the 972 px trimmed source width. Upscaling above 1:1 is accepted until the ≥ 2400 px master in Open Question 7 is supplied.
6. THE Emblem_Visual contract SHALL expose:
   - `kind`: `raster` or `model`.
   - `aspectRatio`: width divided by height, equal to 972/1108 (±1%) for the Raster_Emblem.
   - `anchor`: the emblem's alignment point within its slot, given as horizontal and vertical fractions from 0 to 1, where (0, 0) is the top-left.
   - `poster`: the Raster_Emblem image shown before, or instead of, a Model_Emblem.

   THE Emblem_Stage SHALL size and position the slot from `aspectRatio` and `anchor` only. Switching `kind` between `raster` and `model` SHALL leave the slot's position and size unchanged within ±1 CSS px at every Test_Viewport.
7. WHERE Site_Config sets the emblem `kind` to `model`, THE Emblem_Stage SHALL load the Model_Emblem renderer after hydration through a dynamic import with server rendering disabled. It SHALL show the Raster_Emblem poster in the slot from first paint until the first model frame renders.
8. WHEN the Emblem_Stage swaps between the poster and a Model_Emblem in either direction, THE Emblem_Stage SHALL cross-fade over 400 ms (0 ms in Reduced_Motion_Mode) with a layout shift score of 0. The outgoing layer SHALL be removed only after the cross-fade completes.
9. WHERE a Model_Emblem is used, THE Model_Emblem SHALL meet all of the following:
   - GLB size ≤ 1.5 MB, compressed with Draco or Meshopt.
   - ≤ 100,000 triangles.
   - KTX2 textures.
   - On-demand frame rendering, with zero frames rendered while the model, camera and Light_Layer inputs are unchanged.
   - A rendering device-pixel ratio clamped to [1, 1.5].
10. WHILE no pointer movement or scrolling occurs after the Intro_Sequence completes, THE Emblem_Stage SHALL keep the emblem's transform and opacity constant over a 10 s observation window. It SHALL run no rotation, spinning, bobbing or floating loop, whether the emblem is a Raster_Emblem or a Model_Emblem.
11. WHERE Site_Config sets the emblem `kind` to `model`, WHILE Reduced_Motion_Mode or Low_Power_Mode is active, THE Emblem_Stage SHALL display the Raster_Emblem poster and SHALL NOT request the Model_Emblem renderer or GLB.
12. WHERE Site_Config sets the emblem `kind` to `model`, IF the Model_Emblem has not rendered its first frame within 10 s of the dynamic import starting, THEN THE Emblem_Stage SHALL treat the load as failed per Requirement 17.11. It SHALL keep the Raster_Emblem displayed and SHALL NOT swap to the model later in that page view.

### Requirement 6: Typography

**User Story:** As a reader, I want refined, legible typography that scales fluidly, so that the headline carries authority on every screen.

#### Acceptance Criteria

1. THE Typography_System SHALL use at most three families, self-hosted through `next/font`:
   - A display serif, classified by its publisher as a display or high-contrast serif, for the display role.
   - A sans-serif, classified by its publisher as a grotesque or neo-grotesque, for the heading, body and CTA roles.
   - A monospace for the eyebrow/meta role.

   Each family SHALL be available under the SIL Open Font License or a license that permits self-hosted commercial web embedding, with the license recorded in the project. Final family selection SHALL be recorded in Site_Config after owner sign-off (Open Question 6). Every family SHALL contain glyphs for all characters in the Headline, Supporting_Copy, CTA labels, Nav_Items and the Brand_Mark wordmark. The family used for the Etymology_Note SHALL also contain U+0252 (ɒ) and U+02D0 (ː). Font files SHALL stay within the preload count and size budget in Requirement 13.7.
2. THE Typography_System SHALL assign the display serif to the display role, and SHALL set the Headline as:
   - Font size `clamp(2.25rem, 1.6rem + 3.2vw, 5.5rem)`, which is 36–88 px at a 16 px root font size.
   - Line height 1.04–1.08.
   - Tracking −0.02em.
   - Maximum width 20ch at 1024 px and above.
   - `text-wrap: balance`.

   Other display-role uses keep the display serif at their own specified sizes. Mobile_Menu Nav_Items use 28–32 px per Requirement 8.11 and are not bound by the Headline's 36–88 px range.
3. THE Typography_System SHALL define the heading role as:
   - Font size `clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)`, which is 24–36 px at a 16 px root font size.
   - Line height 1.15.
   - Tracking −0.01em.
4. THE Typography_System SHALL define the body role (Supporting_Copy) as:
   - Font size `clamp(1rem, 0.95rem + 0.3vw, 1.25rem)`, which is 16–20 px at a 16 px root font size.
   - Weight 400.
   - Line height 1.55.
   - Tracking 0.
   - Maximum width 46ch.
   - `text-wrap: pretty`.
5. THE Typography_System SHALL define the CTA role as:
   - Font size 15–16 px.
   - Weight 500.
   - Tracking 0.02em.
   - No `text-transform`, so the labels "Start a Conversation" and "Explore Advisory" render with the exact capitalization from Site_Config.
6. THE Typography_System SHALL define the eyebrow/meta role as:
   - Font size 12–13 px, monospace, uppercase.
   - Tracking 0.14em.
   - Line height 1.4.

   WHERE the Etymology_Note is enabled, THE Typography_System SHALL exclude the IPA segment "/pejmɒːn/" from the uppercase transform, so that the segment renders in lowercase exactly as sourced from PDF page 1.
7. THE Typography_System SHALL give all visible text a computed font size of at least 12 CSS px. Body-role text SHALL have a computed font size of at least 16 CSS px, measured at a 16 px root font size and 100% zoom.
8. FOR ALL viewport widths from 320 to 3840 CSS px, at a 16 px root font size and 100% zoom, THE Typography_System SHALL compute a Headline font size within [36, 88] px that is non-decreasing as width increases (property).
9. THE Hero SHALL wrap the Headline at every Test_Viewport so that:
   - `hyphens` computes to `none` and no soft hyphens are inserted.
   - Every line break falls at a space character.
   - No glyph is clipped (Headline `scrollWidth` ≤ `clientWidth`, and no ancestor overflow hides any part of it).

   These conditions SHALL hold whether or not the browser supports `text-wrap: balance`.
10. IF a Typography_System font file fails to load, THEN THE Typography_System SHALL render the affected text in its declared size-adjusted fallback family, with all text visible throughout loading. The layout SHALL still satisfy criteria 7–9 and Requirement 1.3.

### Requirement 7: Navigation and Site_Header

**User Story:** As a visitor, I want a calm, premium header that works on every device and with the keyboard, so that I can orient myself and reach contact at any time.

#### Acceptance Criteria

1. THE Site_Header SHALL render its elements in this DOM and focus order:
   - Skip link "Skip to content" (targeting `#main`).
   - Brand_Mark linking to `/`.
   - The Nav_Items, in the order listed in Site_Config.
   - A header CTA that reuses the Primary_CTA label "Start a Conversation" and the Site_Config `cta.primary.href` destination.
   - A menu trigger.

   Each visible interactive element of the Site_Header SHALL have a hit area of at least 44×44 CSS px.
2. THE Site_Header SHALL remain visible at the top of the viewport at every scroll position. Excluding `env(safe-area-inset-top)`, its height SHALL be:
   - 56 px while the viewport is in landscape orientation with a height below 480 px (Requirement 10.7).
   - Otherwise, 64 px below 1024 px wide and 72 px at 1024 px and above.

   The height SHALL NOT change with scroll state. The wordmark SHALL stay on a single line, with zero horizontal overflow of the Site_Header, at every Test_Viewport.
3. WHILE the document vertical scroll offset is 24 px or less, THE Site_Header SHALL render with a transparent background, no backdrop blur and no hairline.
4. WHILE the document vertical scroll offset is greater than 24 px, THE Site_Header SHALL render:
   - A background of `ink-950` at 88% opacity with a 12 px backdrop blur. Where `backdrop-filter` is unsupported, the background SHALL be `ink-950` at 96% opacity with no blur (Requirement 17.10).
   - A 1 px `gold-500` bottom hairline at 24% opacity.

   Transitions between this state and the state in criterion 3 SHALL complete within 240 ms in both directions. The state SHALL be detected with an IntersectionObserver sentinel, not a scroll event listener.
5. WHILE the viewport is at least 1280 px wide, THE Site_Header SHALL show the Nav_Items inline in a single row and hide the menu trigger.
6. WHILE the viewport is at least 768 px wide, THE Site_Header SHALL show the header CTA.
7. WHILE the viewport is narrower than 768 px, THE Site_Header SHALL remove the header CTA from display, focus order and the accessibility tree. The Primary_CTA SHALL stay available in the Hero and in the Mobile_Menu.
8. WHERE Site_Config `nav.showPlanned` is true, THE Site_Header SHALL render each Planned_Nav_Item as:
   - An element reachable by the Tab key.
   - Carrying `aria-disabled="true"`.
   - With its visible label in `ivory-300`.
   - With the visually hidden text "(coming soon)" included in its accessible name.

   When activated by click, tap, Enter or Space, a Planned_Nav_Item SHALL NOT navigate. The URL SHALL stay unchanged, focus SHALL stay on the item, and an open Mobile_Menu SHALL stay open.
9. WHERE Site_Config `nav.showPlanned` is false, THE Site_Header SHALL omit Planned_Nav_Items from both the inline navigation and the Mobile_Menu, and render only live Nav_Items.
10. FOR ALL Nav_Item lists in Site_Config (any subset of the seven Nav_Items, in any order, with each status `live` or `planned`), THE Site_Header SHALL render the following in each rendered navigation list (inline and Mobile_Menu) (property):
    - Exactly one `href` per `live` item, equal to that item's Site_Config target.
    - Zero `href` attributes for `planned` items.
11. THE Brand_Mark SHALL carry the accessible name "Peyman Consulting, home". It SHALL carry `aria-current="page"` on the `/` route and no `aria-current` attribute on any other route.
12. THE Site_Header SHALL occupy z-index layer 50 on this scale: content 0–10, Site_Header 50, Mobile_Menu backdrop 60, Mobile_Menu panel 70, skip link 100.
13. WHILE the viewport is narrower than 1280 px, THE Site_Header SHALL hide the inline Nav_Items and show the menu trigger, so that Nav_Items are reached only through the Mobile_Menu. This is subject to Requirement 17.4 when JavaScript is unavailable.
14. WHEN the skip link receives keyboard focus, THE Site_Header SHALL display the skip link fully within the viewport, at z-index layer 100 above all other layers. The skip link SHALL be visually hidden while unfocused but stay in the accessibility tree.
15. WHEN the skip link is activated, THE Site_Header SHALL move keyboard focus to the `main` element with `id="main"`, so that the next Tab press reaches the first focusable element inside `main`.
16. THE Site_Config SHALL default `nav.showPlanned` to true until the owner decides otherwise (Open Question 8).

### Requirement 8: Mobile_Menu Interaction

**User Story:** As a touch or keyboard user, I want the menu to open deliberately and trap focus correctly, so that navigation feels crafted and is fully accessible.

#### Acceptance Criteria

1. THE menu trigger SHALL be a `button` element with:
   - `aria-expanded` set to "false" when the Mobile_Menu is closed and "true" when it is open.
   - `aria-controls` referencing the `id` of the Mobile_Menu.
   - A hit area of at least 44×44 CSS px.
   - The accessible name "Menu" when closed and "Close menu" when open.
2. WHEN the menu trigger is activated while the Mobile_Menu is closed, THE Mobile_Menu SHALL open as a modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-label="Site navigation"`) and move keyboard focus to the Mobile_Menu close control (criterion 11) within 50 ms of the open transition starting.
3. WHILE the Mobile_Menu is open and the viewport is narrower than 768 px, THE Mobile_Menu SHALL fill 100dvh (100vh where `dvh` is unsupported) and 100% width, pad its content by at least `env(safe-area-inset-top|right|bottom|left)` on each edge, and render no backdrop.
4. WHILE the Mobile_Menu is open and the viewport is 768 px to 1279 px wide, THE Mobile_Menu SHALL render as a right-aligned panel `min(420px, 100vw)` wide and 100dvh tall (100vh where `dvh` is unsupported), over a backdrop of `ink-950` at 64% opacity that covers the rest of the viewport.
5. WHILE the Mobile_Menu is open, THE Site_Header SHALL set `inert` on all content outside the Mobile_Menu, including the menu trigger. It SHALL also lock document scrolling so that the document scroll position does not change and the Site_Header and Hero content shift horizontally by 0 px, including when a classic scrollbar is removed.
6. WHEN the Escape key is pressed while the Mobile_Menu is open, THE Mobile_Menu SHALL close and return focus to the menu trigger.
7. WHEN the close control, the backdrop (768 px to 1279 px only), a live Nav_Item or the Primary_CTA inside the Mobile_Menu is activated, THE Mobile_Menu SHALL close and return focus to the menu trigger. After a live Nav_Item or the Primary_CTA, navigation SHALL proceed to the destination defined in Site_Config.
8. WHEN the viewport crosses to 1280 px or wider while the Mobile_Menu is open, THE Mobile_Menu SHALL close with no close transition, perform the restoration in criterion 13, and move focus to the Brand_Mark, because the menu trigger is hidden at that width (Requirement 7.5).
9. WHEN the Mobile_Menu opens, THE Motion_System SHALL:
   - Reveal the panel over 320–420 ms.
   - Stagger Nav_Item entrances at 40 ms intervals.
   - Complete the full open sequence within 560 ms of the open transition starting.
   - Keep every Nav_Item operable from the moment the transition starts.
   - In Reduced_Motion_Mode, use only an opacity fade of at most 150 ms, with no transform or stagger (Requirement 9.10).
10. WHEN the Mobile_Menu closes by close control, backdrop, Escape, live Nav_Item or Primary_CTA, THE Motion_System SHALL complete the close transition within 280 ms. In Reduced_Motion_Mode, it SHALL use only an opacity fade of at most 150 ms.
11. THE Mobile_Menu SHALL contain, in this DOM order:
   - A close control as the first focusable element: a `button` with the accessible name "Close menu" and a hit area of at least 44×44 CSS px.
   - The Nav_Items in Site_Config order. Each SHALL use the display-role typeface at a computed font size of 28–32 px, with a hit area of at least 44×44 CSS px and at least 8 px spacing between adjacent targets. Planned_Nav_Items SHALL be rendered or omitted per Requirements 7.8 and 7.9.
   - The Primary_CTA, with the label "Start a Conversation" and the Site_Config `cta.primary.href` destination.
   - The office location text "Bengaluru, Karnataka" (PDF p.3), exactly as written.
12. WHILE the Mobile_Menu is open, THE Mobile_Menu SHALL keep keyboard focus inside itself. Tab on the last focusable element SHALL move focus to the close control, and Shift+Tab on the close control SHALL move focus to the last focusable element.
13. WHEN the Mobile_Menu closes by any means, THE Site_Header SHALL:
   - Remove `inert` from all content outside the Mobile_Menu.
   - Release the scroll lock, leaving the document scroll position equal to its value before the menu opened.
   - Set the menu trigger's `aria-expanded` to "false".
14. IF a Planned_Nav_Item inside the Mobile_Menu is activated, THEN THE Mobile_Menu SHALL remain open, perform no navigation and keep focus on that Planned_Nav_Item.

### Requirement 9: Motion

**User Story:** As a visitor, I want restrained, purposeful motion, so that the hero feels cinematic without distraction or discomfort.

#### Acceptance Criteria

1. THE Motion_System SHALL animate only `transform`, `opacity`, `clip-path`, `mask-position` and `filter: blur` (≤ 8 px) for Hero, Site_Header and Mobile_Menu motion, with zero animated layout properties (width, height, top, right, bottom, left, margin, padding, border width, font-size, line-height). The Site_Header state change in Requirement 7.4 SHALL be animated as an opacity transition only.
2. THE Motion_System SHALL use:
   - `cubic-bezier(0.16, 1, 0.3, 1)` for entrances (Intro_Sequence, Mobile_Menu open, Pointer_Parallax follow).
   - `cubic-bezier(0.65, 0, 0.35, 1)` for state changes and exits (Site_Header state, Mobile_Menu close, Pointer_Parallax return, Specular_Sweep).
   - A linear mapping for scroll-scrubbed motion (Scroll_Exit).

   No animation SHALL use bounce, elastic or back easing, or any curve whose output leaves the range 0–1.
3. THE Motion_System SHALL define shared duration tokens in one module: micro 160 ms, ui 240 ms, reveal (any single value from 600 ms to 900 ms inclusive), and sweep 1400 ms. CSS and GSAP SHALL both read their values from this module, so that CSS custom property values and GSAP durations for the same token are identical. Every duration used by Hero, Site_Header and Mobile_Menu motion SHALL come from this module, including the values in Requirements 5.8, 7.4, 8.9, 8.10 and 9.10.
4. WHEN the page first paints, THE Hero SHALL display the Headline at a computed opacity of 1 without depending on JavaScript execution. Lab LCP SHALL occur within 150 ms of FCP, whether the LCP element is the Headline or the Raster_Emblem.
5. WHEN the page first paints, THE Intro_Sequence SHALL start without waiting for hydration or the motion enhancement chunk, and SHALL:
   - Keep the Headline at opacity 1 throughout, limiting any Headline entrance to a translation of at most 16 px.
   - Settle the Headline, Supporting_Copy and CTAs (opacity 1, zero offset) within 900 ms of first paint.
   - Draw hairlines to full length within 800 ms of first paint.
   - Fade the emblem in and scale it from 0.98 to 1, settling within 900 ms of first paint.
   - Leave every element in its final composed state if JavaScript is disabled or the motion enhancement chunk fails, per Requirements 17.3 and 17.7.
6. WHEN both the emblem has settled and the Motion_System has initialized, THE Light_Layer SHALL start the Specular_Sweep within 200 ms of whichever came later. The sweep SHALL run exactly once over 1400 ms and end on the static resting frame defined in criterion 10, so that the full Intro_Sequence completes within 1600 ms of that later point.
7. WHILE a pointer matching `(hover: hover) and (pointer: fine)` is present and neither Reduced_Motion_Mode nor Low_Power_Mode is active, WHEN the pointer moves within the Hero, THE Pointer_Parallax SHALL:
   - Offset the emblem in proportion to the pointer's distance from the Emblem_Stage center, reaching the maximum at the Hero edges.
   - Keep the translation magnitude at or below 12 px and the rotation at or below 2° about each of the X and Y axes.
   - Move the Light_Layer in the opposite direction by at most 12 px.
   - Reach each new target offset within 240 ms (ui token).
8. WHERE content follows the Hero, WHILE neither Reduced_Motion_Mode nor Low_Power_Mode is active, THE Scroll_Exit SHALL scrub the emblem with ScrollTrigger across the Hero's scroll-out range:
   - At the start (Hero top at the viewport top), translateY 0 and scale 1.
   - At the end (Hero bottom at the viewport top), translateY −8% of the emblem's rendered height and scale 0.96.
   - Linear interpolation in between, reversing exactly when scrolling back.
9. THE Motion_System SHALL register GSAP work through `useGSAP` with a component scope, wrap deferred handlers in `contextSafe`, and branch on breakpoints and motion preference through `gsap.matchMedia`. On unmount, it SHALL revert all tweens, ScrollTriggers and listeners, and restore every inline style it set.
10. WHILE Reduced_Motion_Mode is active, THE Hero SHALL render every element in its final composed state at first paint, before any JavaScript executes. This includes a static Light_Layer composition equivalent to the Specular_Sweep's resting frame. The Intro_Sequence, Specular_Sweep, Pointer_Parallax and Scroll_Exit SHALL be disabled, and Mobile_Menu transitions SHALL be limited to an opacity fade of at most 150 ms.
11. IF Reduced_Motion_Mode activates or deactivates during a session, THEN THE Motion_System SHALL complete the change before the next rendered frame:
    - On activation, it SHALL stop all running Hero and Mobile_Menu animations, set every element to its final composed state, and disable Pointer_Parallax and Scroll_Exit.
    - On deactivation, it SHALL enable Pointer_Parallax and Scroll_Exit (subject to Low_Power_Mode) from the final composed state, without replaying the Intro_Sequence or Specular_Sweep.
    - In both cases, no element SHALL be left in an intermediate state.
12. WHILE Low_Power_Mode is active, THE Motion_System SHALL disable Pointer_Parallax, Scroll_Exit and the Specular_Sweep, and SHALL display the static Light_Layer resting frame. The Save-Data, `navigator.deviceMemory` and `navigator.hardwareConcurrency` signals SHALL be evaluated when the Motion_System initializes, and an unavailable signal SHALL count as not indicating Low_Power_Mode.
13. WHILE the Hero's intersection ratio with the viewport is 0 or the document is hidden, THE Motion_System SHALL run zero animation-frame callbacks for Hero effects (Intro_Sequence, Specular_Sweep, Pointer_Parallax and Scroll_Exit). When the Hero becomes visible again, any interrupted Hero effect SHALL show its final composed state (the Specular_Sweep at its resting frame) without replaying.
14. WHEN the pointer leaves the Hero or the window loses focus, THE Pointer_Parallax SHALL return the emblem and Light_Layer to zero offset and zero rotation within 600 ms, using the state-change curve.
15. IF the page is restored from the back-forward cache, THEN THE Hero SHALL display its final composed state without replaying the Intro_Sequence or Specular_Sweep, because the Intro_Sequence runs at most once per document load.

### Requirement 10: Mobile Layout (320–767 px)

**User Story:** As a mobile visitor, I want a composed, thumb-friendly hero, so that the experience feels deliberate rather than shrunken.

#### Acceptance Criteria

1. WHILE the viewport is narrower than 768 CSS px and the landscape condition in criterion 7 does not apply, THE Hero SHALL stack the Emblem_Stage visually above the text block. The Emblem_Stage bottom edge SHALL sit at or above the text block top edge. THE Hero SHALL achieve this stacking without changing the DOM order in Requirement 3.1, where the Emblem_Stage remains the last element.
2. WHILE the viewport is narrower than 768 CSS px, at least 720 CSS px tall, and in portrait orientation (height greater than or equal to width), THE Emblem_Stage SHALL render the emblem at a height of `clamp(120px, 22svh, 200px)`. The emblem width SHALL follow the 972:1108 intrinsic aspect ratio in Requirement 5.1.
3. WHILE the viewport is narrower than 768 CSS px, below 720 CSS px tall, and in portrait orientation (height greater than or equal to width), THE Emblem_Stage SHALL render the emblem at a height of `clamp(96px, 16svh, 140px)`. In the same state, THE Hero SHALL set the Hero block padding and the vertical gaps between Emblem_Stage, Headline, Supporting_Copy and the CTA group to 75% (±1 px) of the values applied under criterion 2 at the same viewport width.
4. WHILE the viewport is narrower than 768 CSS px, THE Hero SHALL apply inline gutters of `max(20px, env(safe-area-inset-left))` and `max(20px, env(safe-area-inset-right))`.
5. WHILE the viewport is narrower than 768 CSS px, THE Hero SHALL stack the Primary_CTA above the Secondary_CTA. Each CTA SHALL span the full width of the text block, be at least 48 CSS px tall, and sit 12 CSS px (±1 px) from the other CTA vertically.
6. THE Hero SHALL set `min-height: 100svh` with a `100vh` fallback. Its rendered height SHALL equal the greater of the small-viewport height and its content height, with no fixed height, no dvh-based height and no clipped content.
7. WHILE the viewport width is greater than its height and the viewport height is below 480 CSS px, THE Hero SHALL render a two-column layout with these properties:
   - The text block sits in the left column at 60% of the content width. The Emblem_Stage sits in the right column at 40% of the content width, measured inside the inline gutters of criterion 4.
   - The emblem height is at most 70svh, and the emblem width is at most the right column's width.
   - This layout takes precedence over criteria 1–3 and over Requirement 11.1 for viewports up to 1023 CSS px wide. It applies to the landscape Test_Viewports 667×375 and 844×390.
8. WHILE the primary input lacks hover capability (`hover: none`), THE Hero SHALL give each interactive element that has a `:hover` style the same color, border or underline change on `:active` while the element is pressed. Keyboard focus SHALL show the `:focus-visible` indicator defined in Requirement 12.3.
9. THE Hero SHALL keep every interactive target at least 44×44 CSS px. Adjacent targets SHALL be at least 8 CSS px apart, measured edge-to-edge between their bounding boxes, at every Test_Viewport.
10. THE Hero SHALL make all content and every function reachable without hover. No text, link or control SHALL appear only on hover.
11. WHILE the landscape condition in criterion 7 applies, THE Site_Header SHALL render at a height of 56 CSS px plus `env(safe-area-inset-top)`. This is an exception to the 64 px height in Requirement 7.2.

### Requirement 11: Tablet and Desktop Layout (768 px–4K)

**User Story:** As a tablet or desktop visitor, I want a wide, editorial composition that stays proportional on very large screens, so that the brand never looks stretched.

#### Acceptance Criteria

1. WHILE the viewport is from 768 px to 1023 px wide and at least 480 px tall, THE Hero SHALL place the text block in columns 1–5 and the Emblem_Stage in columns 6–8 of the 8-column grid defined in Requirement 2.3. The rendered emblem height SHALL be at most 46svh, and the rendered emblem width SHALL be no wider than the Emblem_Stage column span. Viewports narrower than 1024 px and shorter than 480 px SHALL use the landscape layout in Requirement 10.7 instead.
2. WHILE the viewport is from 1024 px to 1279 px wide, THE Hero SHALL render the emblem at a width between 360 px and 460 px inclusive, inside the columns 7–12 placement defined in Requirement 2.4.
3. WHILE the viewport is from 1280 px to 1919 px wide, THE Hero SHALL constrain the content box (excluding inline gutters) to a maximum width of 1360 px, centered horizontally in the viewport, and SHALL render the emblem at a width between 460 px and 580 px inclusive.
4. WHILE the viewport is at least 1920 px wide, THE Hero SHALL:
   - Constrain the content box (excluding inline gutters) to a maximum width of 1680 px, centered horizontally in the viewport.
   - Render the emblem at a width between 580 px and 620 px inclusive, never exceeding the 620 px cap in Requirement 5.5.
   - Compute the Headline font size at no more than 88 px.
   - Extend the stage background edge to edge across the full viewport width, up to 3840 px, with no page background visible at either side.
5. WHILE the viewport is at least 768 px wide and at least 480 px tall, THE Hero SHALL vertically center the text block and the Emblem_Stage within the region that runs from the bottom edge of the Site_Header (64 px or 72 px per Requirement 7.2) to the bottom edge of the Hero. Each SHALL have at least 48 px of block padding above and below, and its top and bottom spacing SHALL differ by at most 2 px. When the content is taller than that region, the Hero SHALL grow per Requirement 10.6 and keep the 48 px minimum padding.
6. WHILE the viewport is at least 768 px wide, THE Hero SHALL place the Primary_CTA and Secondary_CTA side by side in one row, Primary_CTA first, with a 16 px gap. CTA heights SHALL be at least 48 px from 768 px to 1023 px, and exactly 52 px at 1024 px and above.
7. WHILE the viewport is at least 768 px wide, THE Hero SHALL apply inline gutters of `max(clamp(40px, 4vw, 80px), env(safe-area-inset-left))` and `max(clamp(40px, 4vw, 80px), env(safe-area-inset-right))`.
8. IF the combined width of both CTAs plus the 16 px gap exceeds the text block width at a viewport of 768 px or wider (for example, under WCAG 1.4.12 text-spacing overrides), THEN THE Hero SHALL wrap the Secondary_CTA onto a second row with a 12 px row gap. No CTA SHALL be clipped or overflow the text block.
9. WHILE the viewport is at least 768 px wide and at least 480 px tall, THE Hero SHALL render the text block and Emblem_Stage bounding boxes without intersecting, and no part of the emblem SHALL be clipped by the Hero bounds.

### Requirement 12: Accessibility (WCAG 2.2 AA)

**User Story:** As a visitor using assistive technology, keyboard or magnification, I want full access to the hero and navigation, so that I receive the same information and actions.

#### Acceptance Criteria

1. THE Hero and Site_Header SHALL meet the following contrast ratios at every Test_Viewport. Each ratio is measured in the final composed state, in both the transparent and the scrolled Site_Header states, against the lightest composited background pixel inside the element's bounding box, including any Light_Layer or emblem pixels behind it:
   - Normal text: at least 4.5:1.
   - Large text (≥ 24 px, or ≥ 18.66 px at font weight ≥ 700): at least 3:1.
   - UI component boundaries (the Primary_CTA fill, the Secondary_CTA outline where outlined, the menu trigger) and focus indicators: at least 3:1 against adjacent colors.

   Decorative elements marked `aria-hidden="true"` (hairlines, measurement ticks, Light_Layer) are exempt.
2. THE Palette pairings SHALL meet these contrast ratios, computed with the WCAG 2.x relative-luminance formula and rounded to two decimals:
   - `ivory-50` on `ink-950`: 17.57:1
   - `ivory-50` on `navy-950`: 16.77:1
   - `ivory-50` on `navy-900`: 15.09:1
   - `ivory-300` on `ink-950`: 9.55:1
   - `ivory-300` on `navy-950`: 9.11:1
   - `ivory-300` on `navy-900`: 8.2:1
   - `gold-500` on `ink-950`: 7.55:1
   - `gold-500` on `navy-950`: 7.20:1
   - `gold-500` on `navy-900`: 6.48:1
   - `ink-950` on `gold-500`: 7.55:1
   - `ink-950` on `gold-300`: 9.75:1

   THE Hero SHALL NOT place `ivory-50` text on a `gold-500` surface (2.33:1). Any text/surface pairing not listed above SHALL have its ratio computed and recorded, and SHALL meet criterion 1 before use.
3. WHEN any interactive element in the Hero, Site_Header or Mobile_Menu receives keyboard focus, including a Planned_Nav_Item, THE Hero and Site_Header SHALL:
   - Display a `:focus-visible` indicator as a 2 px solid `ivory-50` outline with a 3 px offset. Gold SHALL NOT be used for the indicator.
   - Show no focus indicator on pointer click alone.
   - Keep the full indicator outline visible: not clipped by any ancestor, and not overlapped by the Site_Header. Content scrolled into view on focus SHALL land below the Site_Header's bottom edge (64 px or 72 px plus `env(safe-area-inset-top)`), which meets and exceeds WCAG 2.4.11.
4. THE Hero and Site_Header SHALL expose exactly one `header` landmark, exactly one `main` landmark (`id="main"`) and a `nav` landmark with `aria-label="Primary"`. Any additional `nav` landmark present at the same time SHALL have a different accessible name. The skip link SHALL be the first focusable element in the document.
5. THE Hero and Site_Header SHALL follow this sequential focus order, with no positive `tabindex` values, and with hidden or `aria-hidden` elements and non-interactive elements (Headline, Supporting_Copy, Service_Index, Etymology_Note, Emblem_Stage) receiving no tab stop:
   - Below 768 px: skip link, Brand_Mark, menu trigger, Primary_CTA, Secondary_CTA.
   - From 768 px to 1279 px: skip link, Brand_Mark, header CTA, menu trigger, Primary_CTA, Secondary_CTA.
   - At 1280 px and above: skip link, Brand_Mark, rendered Nav_Items in Site_Config order, header CTA, Primary_CTA, Secondary_CTA.
6. WHILE the viewport is 320 CSS px wide as a result of 400% browser zoom at a 1280 px window width, THE Hero and Site_Header SHALL:
   - Show `document.scrollingElement.scrollWidth` ≤ `window.innerWidth`.
   - Present the Headline, Supporting_Copy, Primary_CTA, Secondary_CTA, Brand_Mark and menu trigger with no clipped text.
   - Allow the Mobile_Menu to be opened, with every Nav_Item reachable by vertical scrolling only.
7. WHILE text spacing is overridden per WCAG 1.4.12 (line height 1.5×, paragraph spacing 2×, letter spacing 0.12× and word spacing 0.16× the font size), THE Hero, Site_Header and Mobile_Menu SHALL display all text at every Test_Viewport with no characters truncated by overflow clipping and no intersection between the bounding boxes of separate text elements. CTAs SHALL grow in height to contain their labels.
8. WHILE forced-colors mode is active, THE Hero and Site_Header SHALL:
   - Hide decorative gradients, the Light_Layer, hairlines and measurement ticks.
   - Keep the Raster_Emblem visible.
   - Render the Primary_CTA, Secondary_CTA, header CTA and menu trigger with a border of at least 1 px in a system color.
   - Render the focus indicator from criterion 3 as a 2 px outline in a system color, so it stays visible.
9. THE Build SHALL set `lang="en"` on the `html` element of the document.
10. THE project documentation SHALL state that automated checks do not establish full WCAG 2.2 AA conformance. It SHALL also state that manual testing is required before claiming compliance, using VoiceOver (iOS Safari, macOS Safari), NVDA (Windows Chrome/Firefox) and TalkBack (Android Chrome), plus expert accessibility review.
11. WHEN the skip link receives keyboard focus, THE Site_Header SHALL show it fully within the viewport at z-index layer 100, meeting criterion 1 contrast. WHEN the skip link is activated, THE Site_Header SHALL move keyboard focus to the `main` element, so that the next Tab press focuses the Primary_CTA.
12. WHILE the Mobile_Menu is open, THE Mobile_Menu SHALL contain keyboard focus:
   - The in-menu close button is the first focus target.
   - Tab from the last interactive element moves focus to the close button.
   - Shift+Tab from the close button moves focus to the last interactive element.
   - No element outside the Mobile_Menu can receive focus or be reached by the screen-reader virtual cursor.

### Requirement 13: Performance

**User Story:** As a visitor on a mid-range phone, I want the hero to load instantly and respond smoothly, so that quality is felt rather than waited for.

#### Acceptance Criteria

1. WHEN Lighthouse runs in mobile mode with default throttling against `/` of the production Build served by `next start`, THE Build SHALL achieve the following, where each value is the median of that metric taken independently across 5 consecutive runs:
   - Performance score ≥ 95
   - Accessibility score 100
   - Best Practices score ≥ 95
   - SEO score ≥ 95
   - LCP ≤ 2.0 s
   - CLS ≤ 0.02
   - TBT ≤ 150 ms
2. WHERE at least 28 days of field Core Web Vitals data for `/` is available after release, THE Build SHALL meet, at the 75th percentile of page loads, LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms.
3. THE Build SHALL keep first-load JavaScript for `/` at or below 180 KB gzip. First-load JavaScript is the total gzip-compressed size of every JavaScript file requested by `/` up to the end of hydration, excluding the motion enhancement chunk and any other chunk dynamically imported after hydration. In this requirement, 1 KB = 1,024 bytes.
4. THE Build SHALL keep hero and header client code at or below 15 KB gzip in total. This covers the `use client` leaf components for header scroll state, the Mobile_Menu and motion enhancement, and excludes the React, React DOM and Next.js runtime, GSAP, ScrollTrigger and @gsap/react library code.
5. THE Build SHALL keep GSAP, ScrollTrigger and @gsap/react at or below 50 KB gzip combined, contained only in the motion enhancement chunk. That chunk SHALL be requested only after hydration completes, SHALL NOT appear in the initial preload or modulepreload list, and SHALL NOT be render-blocking.
6. THE Build SHALL keep each Raster_Emblem derivative within these file-size limits:
   - AVIF up to 440 device px wide: ≤ 90 KB.
   - AVIF wider than 440 device px, up to 1240 device px: ≤ 180 KB.
   - WebP fallback up to 440 device px wide: ≤ 130 KB.
   - WebP fallback wider than 440 device px, up to 1240 device px: ≤ 260 KB.
7. THE Build SHALL preload at most 3 font files, with a combined size of at most 110 KB WOFF2 across all preloaded font files. Fallback metrics SHALL keep font-swap CLS at or below 0.01.
8. THE Hero SHALL be implemented as React Server Components, with `use client` limited to leaf components for header scroll state, the Mobile_Menu and motion enhancement. No Hero composition component (hero shell, hero copy, hero actions, Emblem_Stage, Raster_Emblem) SHALL carry `use client`.
9. WHILE Low_Power_Mode is active, THE Hero SHALL keep main-thread time attributable to Hero, Site_Header and motion enhancement code at or below 2 ms per 16.7 ms frame interval on average. This is measured over a 10-second Chrome performance trace that starts at hydration, with 4× CPU throttling.
10. WHILE the Intro_Sequence (including the Specular_Sweep) or Pointer_Parallax runs, THE Hero SHALL present at least 95% of frames within 16.7 ms, with zero long tasks over 50 ms attributable to Hero, Site_Header or motion enhancement code. This is measured in a Chrome performance trace of the production Build at 1440×900 with 4× CPU throttling. The measurement windows are first paint to Intro_Sequence completion, and 5 seconds of continuous pointer movement across the Hero.
11. WHEN the motion enhancement chunk loads and initializes after hydration, THE Hero SHALL leave the CSS-driven Intro_Sequence running without restarting, jumping or reversing any element. It SHALL add a CLS contribution of 0 and produce zero long tasks over 50 ms attributable to Hero code.
12. IF any budget in criteria 3–7 is exceeded in a production Build, THEN THE CI pipeline SHALL fail the check with a message naming the exceeded budget, its limit and the measured value.

### Requirement 14: Technical Constraints

**User Story:** As a developer, I want a small, current, pinned stack, so that the codebase is secure and maintainable.

#### Acceptance Criteria

1. THE project SHALL use Next.js App Router, React, TypeScript with `strict` enabled, Tailwind CSS v4 (CSS-first `@theme` tokens via `@tailwindcss/postcss`), GSAP and @gsap/react. Every entry in `package.json` `dependencies` and `devDependencies` SHALL be declared at the exact version in the Pinned versions table, with no range operators (`^`, `~`, `>`, `>=`, `<`, `*`, `x`) and no dist-tags such as `latest`. The following clarifications apply:
   - @types/node SHALL be pinned to an exact version whose major number matches the Node.js LTS major used in CI.
   - The project SHALL declare a Node.js engine requirement of ≥ 20.9.0.
2. WHEN a runtime dependency not listed in the Pinned versions table is added to `package.json` `dependencies`, THE design document SHALL record, before merge, a justification with these parts:
   - The package name and exact version.
   - Its license.
   - The capability it provides.
   - Why the pinned stack cannot provide that capability.
   - Its gzip size impact measured against the budgets in Requirement 13.
3. THE project SHALL keep the following out of `dependencies`, out of `devDependencies` and out of all source imports in this feature:
   - Lenis, three.js, @types/three, R3F and drei.
   - Framer Motion.
   - Any package whose primary purpose is an icon set, a prebuilt UI component kit, or runtime CSS-in-JS styling.
4. THE project SHALL register each GSAP plugin in use, including ScrollTrigger, exactly once, in a single module marked `use client`. It SHALL import `gsap` and `@gsap/react` only from modules marked `use client` or imported only by such modules, with zero GSAP imports in React Server Components.
5. THE Site_Config SHALL be a typed TypeScript module whose types require every brand string, CTA destination, Nav_Item status and feature flag, so that a missing key or a value of the wrong type fails the TypeScript type check during the Build.
6. IF a production Build finds any of the following in Site_Config, THEN THE Build SHALL exit with a non-zero status, produce no deployable output, and print a message that names every offending key:
   - An unresolved CTA destination: empty, `#`, or containing a square-bracketed placeholder token.
   - A placeholder email domain: an email whose domain contains a square-bracketed placeholder token, such as `[domain]`.
   - A Nav_Item whose status is neither `live` nor `planned`.

   Non-production builds SHALL follow Requirement 17.12 instead.
7. THE project SHALL contain no code copied from justice-law-firm, Atrey-Chambers-of-Law, harringtonandco, or any other repository without an OSI-approved license. Use of those repositories SHALL be limited to the principles recorded in the Reference study.
8. WHEN code from an MIT-licensed repository, such as skynetlabs-law-demo, is reused, THE project documentation SHALL record the source repository, the original copyright notice, the MIT license text and the files or components that contain reused code. The copyright notice SHALL also be kept with the reused code.
9. IF `next build` type-checking fails under TypeScript 7.0.2 because of a TypeScript 7 incompatibility, THEN THE project SHALL pin TypeScript to exactly 6.0.3 and record the failing error and the reason in the design document.
10. WHEN a change is proposed or a release is prepared, THE CI pipeline SHALL run `npm audit` against the committed lockfile, covering both `dependencies` and `devDependencies`. It SHALL block the merge or release if the audit reports one or more high or critical vulnerabilities.

### Requirement 15: Component Boundaries

**User Story:** As a developer, I want small components with clear responsibilities, so that the hero is testable and the header can become global navigation.

#### Acceptance Criteria

1. THE project SHALL separate responsibilities into the following categories, and SHALL assign every component file to exactly one of them:
   - Layout components (Site_Header, Brand_Mark, Mobile_Menu, nav list)
   - UI primitives (button-link, visually-hidden text)
   - Hero composition (hero shell, hero copy, hero actions, Emblem_Stage, Raster_Emblem)
   - Motion enhancement (hero motion, menu motion)
   - Shared modules (`lib` motion tokens and capability detection, `data` Site_Config)
   - Styles (global CSS with `@theme` tokens)
2. THE project SHALL create a source directory only when it holds at least one file directly, with zero empty or placeholder-only directories. THE project SHALL NOT create a `three` directory in this feature, and the design document SHALL name `three` as the reserved location for the future Model_Emblem.
3. THE project SHALL keep each component file at or below 150 physical lines, counting blank and comment lines. Each component file SHALL export exactly one React component, plus that component's own prop types. Test files, Site_Config and style files are not component files for this limit.
4. THE Hero composition components SHALL take all visible text, all accessible-name strings (including `aria-label` values and visually hidden text), all CTA destinations and all feature flags from Site_Config, and SHALL contain zero hard-coded copy strings. The decorative emblem's `alt=""` is the only permitted literal. Changing any of these values in Site_Config SHALL change the rendered output without editing a component file.
5. THE Site_Header, Brand_Mark, Mobile_Menu and nav list SHALL have zero direct or transitive imports from Hero composition or hero motion modules. They SHALL import only UI primitives, shared modules, styles and menu motion. The header CTA and Mobile_Menu Primary_CTA SHALL read their label and destination from Site_Config, so that the Site_Header can be rendered from the root layout without changing any Site_Header file.
6. THE motion enhancement components SHALL attach to server-rendered markup only through refs or `data-` attributes. They SHALL NOT insert, remove or reorder DOM elements, and SHALL NOT change text content or `href` values.
7. WHEN the motion enhancement components are removed or not loaded, THE Hero SHALL match the Reduced_Motion_Mode final state at every Test_Viewport with the same text content, the same links and `href` values, and every element's bounding box within 1 CSS px of that state.
8. THE UI primitives and shared modules SHALL import no Layout, Hero composition or Motion enhancement module, and the project's module import graph SHALL contain zero circular imports.
9. THE Emblem_Stage SHALL use its emblem renderer only through the Emblem_Visual contract (`kind`, `aspectRatio`, `anchor`, `poster`), with no direct import of Raster_Emblem outside the renderer-selection point. Adding a Model_Emblem SHALL require changes only to Site_Config, the renderer-selection point and the new renderer, with zero changes to the hero shell, hero copy, hero actions, Site_Header or motion token modules.

### Requirement 16: Loading

**User Story:** As a visitor, I want the hero to appear immediately and assemble gracefully, so that there is no blank screen or jump.

#### Acceptance Criteria

1. THE Hero SHALL render without a preloader, splash screen or full-page loading state. The server-rendered HTML response SHALL contain the Headline, Supporting_Copy, Primary_CTA, Secondary_CTA and Emblem_Stage markup, and no overlay element SHALL cover any part of the Hero at any point from first paint onward.
2. THE Emblem_Stage SHALL reserve the emblem box from first paint, sized from the intrinsic aspect ratio 972:1108 (Requirement 5.1) and the rendered widths in Requirements 10–11. The box SHALL show a solid `navy-950` placeholder until the Raster_Emblem decodes, and the Emblem_Stage SHALL contribute a layout shift score of 0 from navigation start until 5 s after the load event.
3. WHEN web fonts finish loading, THE Typography_System SHALL swap from size-adjusted fallback metrics, so that at every Test_Viewport:
   - The Headline's bounding-box height differs by at most 2% between the fallback render and the web-font render.
   - The Headline's rendered line count stays the same.
   - Font-swap CLS stays at or below 0.01 (Requirement 13.7).
4. THE Build SHALL load the motion enhancement chunk (GSAP, ScrollTrigger, hero motion and menu motion) through a dynamic import that starts only after hydration completes. The initial HTML SHALL contain no preload or modulepreload reference to that chunk or to GSAP.
5. THE Build SHALL set `viewport-fit=cover` in the viewport meta and a `theme-color` of #05070C (`ink-950`).
6. THE Build SHALL set the document title to exactly "Peyman Consulting" and the meta description to the Supporting_Copy, character-for-character: "Strategic financial, legal and government advisory for high-growth businesses navigating complex transactions, capital and regulation."
7. WHILE a web font file has not loaded or has failed to load, THE Typography_System SHALL render the affected Hero and Site_Header text visibly in its size-adjusted fallback font, with no period of invisible text.
8. IF the motion enhancement chunk has not finished loading within 1600 ms of hydration (the Intro_Sequence completion bound in Requirement 9.6), THEN THE Motion_System SHALL skip the Intro_Sequence and the Specular_Sweep, leave every Hero element in its final composed state with the static Light_Layer, and enable only Pointer_Parallax and Scroll_Exit where their conditions in Requirement 9 are met.

### Requirement 17: Error and Fallback Behavior

**User Story:** As a visitor on any browser, device or network, I want the hero to stay complete when something fails, so that trust is never undermined.

#### Acceptance Criteria

1. IF the Raster_Emblem image fails to load or decode (network error, error response or unsupported format), THEN THE Emblem_Stage SHALL:
   - Keep its reserved emblem box at the same dimensions it had before the failure, with the `navy-950`-tinted placeholder from Requirement 16.2.
   - Keep the vignette and light pool, and omit the Specular_Sweep.
   - Display no broken-image icon and no alt text.
   - Contribute a layout shift score of 0.
2. IF the Raster_Emblem thumbnail in the Brand_Mark fails to load, THEN THE Brand_Mark SHALL keep its link to `/`, its wordmark "PEYMAN CONSULTING" and its accessible name "Peyman Consulting, home", with no broken-image icon and no change to Site_Header height.
3. IF JavaScript is disabled or fails before hydration completes, THEN THE Hero SHALL display the Headline, Supporting_Copy, Primary_CTA, Secondary_CTA and emblem in their final composed state (computed opacity 1, no transform offset, not clipped), with both CTAs navigating to their Site_Config destinations on activation.
4. IF JavaScript is disabled or fails before hydration completes, THEN THE Site_Header SHALL hide the JavaScript menu trigger. WHILE the viewport is narrower than 1280 px, it SHALL instead render a native disclosure (`details`/`summary`) in the same header position, with the visible summary text "Menu" and a hit area of at least 44×44 CSS px.
5. WHEN a visitor expands the no-JavaScript disclosure by click, tap, Enter or Space, THE Site_Header SHALL reveal:
   - Every Nav_Item in Site_Config order, with `live` items as working links and Planned_Nav_Items rendered as in Requirement 7.8.
   - The Primary_CTA.

   Every revealed item SHALL be reachable by keyboard and by scrolling at every Test_Viewport narrower than 1280 px, with zero horizontal overflow.
6. WHEN the Site_Header hydrates successfully, THE Site_Header SHALL replace the no-JavaScript disclosure with the menu trigger defined in Requirement 8.1, in the same position, with no change to Site_Header height and a layout shift score of 0. If the disclosure summary had focus, focus SHALL move to the menu trigger.
7. IF the motion enhancement chunk fails to load, or motion code throws an error during the Intro_Sequence, THEN THE Motion_System SHALL leave every Hero element in its static final composition within one frame, with no element hidden, offset, scaled or partly animated. It SHALL leave CTAs and the Site_Header fully operable, raise no uncaught exception, and make no retry during the page session.
8. IF the browser lacks `svh` support, THEN THE Hero SHALL apply `min-height: 100vh` and allow content-driven growth, as in Requirement 10.6.
9. IF the browser lacks `mask-image` support, detected through a CSS feature query, THEN THE Emblem_Stage SHALL omit the Specular_Sweep, render no rectangular or unmasked highlight over the emblem box, and keep the vignette and light pool.
10. IF the browser lacks `backdrop-filter` support, THEN THE Site_Header SHALL render its scrolled state (Requirement 7.4) with an `ink-950` background at 96% opacity and the 1 px `gold-500` hairline at 24% opacity, leaving the transparent top-of-page state unchanged.
11. WHERE Site_Config sets the emblem `kind` to `model`, IF the Model_Emblem renderer or GLB fails to load, WebGL2 is unavailable, or the WebGL context is lost, THEN THE Emblem_Stage SHALL:
    - Display the Raster_Emblem in the same slot, with a layout shift score of 0.
    - Cross-fade over 400 ms if a model frame was already visible (0 ms in Reduced_Motion_Mode).
    - Make no further Model_Emblem load attempt during the page session.
12. IF a CTA destination in Site_Config is missing, empty or still a placeholder value in a non-production build, THEN THE Hero SHALL render that CTA as a focusable anchor with its placeholder `href` and log exactly one console warning per page load naming the offending Site_Config key. Production builds are governed by Requirement 14.6.

### Requirement 18: Hero Acceptance (End-to-End)

**User Story:** As the product owner, I want objective sign-off criteria, so that "serious, sophisticated and different" is verified rather than asserted.

#### Acceptance Criteria

1. WHEN the homepage loads from a production Build on a 1440×900 desktop at DPR 1, with no CPU or network throttling, a cold cache, the pointer left still, and neither Reduced_Motion_Mode nor Low_Power_Mode active, THE Hero SHALL show the Headline, the Raster_Emblem and the Primary_CTA in their final state within 1500 ms of FCP, measured as the median of 5 runs. Final state means all of the following:
   - Computed opacity is 1.
   - The computed transform is the identity (emblem scale 1, zero translate and rotate offset).
   - The Raster_Emblem image is decoded and painted.
   - The Primary_CTA is operable.

   The Specular_Sweep, Pointer_Parallax and Scroll_Exit are excluded from this measurement.
2. WHEN the Intro_Sequence has completed (or at first paint in Reduced_Motion_Mode), with fonts loaded, the Mobile_Menu closed and the document scrolled to 0, THE Hero SHALL show zero horizontal overflow at every Test_Viewport, measured as `document.scrollingElement.scrollWidth` ≤ `window.innerWidth`.
3. WHEN the Intro_Sequence has completed (or at first paint in Reduced_Motion_Mode), with fonts loaded and the document scrolled to 0, THE Hero SHALL satisfy all of the following at every Test_Viewport:
   - The Primary_CTA and Secondary_CTA bounding boxes have an intersection area of 0 CSS px².
   - The Headline bounding box lies entirely within 0 to `window.innerWidth` horizontally and 0 to `window.innerHeight` vertically.
   - The Headline top edge sits at or below the Site_Header bottom edge.
4. WHILE Reduced_Motion_Mode is active, THE Hero SHALL pass the walkthrough against the default-motion final state (criterion 1 conditions, captured 2000 ms after hydration) at 1440×900, 390×844 and 844×390, on all of the following:
   - Content: Hero text, CTA labels, CTA `href` values and DOM order are identical in both modes.
   - Layout: the bounding boxes of the Headline, Supporting_Copy, Primary_CTA, Secondary_CTA and Emblem_Stage differ by at most 1 CSS px in position and size from the default-motion final state.
   - Static composition: screenshots captured 100 ms and 2000 ms after first paint have 0 differing pixels.

   Each walkthrough SHALL be recorded as a side-by-side screenshot pair per viewport.
5. WHEN a production release is prepared, THE team SHALL obtain approval of the Hero from at least two stakeholder reviewers, one of whom is the brand owner. Each reviewer SHALL independently record a pass or fail for every checklist item after viewing the Hero at 1440×900 and 390×844. The checklist SHALL assert:
   - It does not read as a law-firm template, generic corporate site, startup template, SaaS dashboard, government site, stock-photo legal site or flashy WebGL.
   - It does not copy Harvey, Cooley, Luminance or any studied reference.

   Approval means every item is marked pass by every reviewer.
6. WHEN a production release is prepared, THE team SHALL record an owner decision for each Open Question listed in the Introduction.
7. IF any criterion 1–4 fails at any Test_Viewport, or any criterion 5 checklist item is marked fail, or any Open Question lacks a recorded owner decision, THEN THE team SHALL block the production release and record the failing criterion, the Test_Viewport or checklist item, and the observed value.

### Requirement 19: Non-Goals

**User Story:** As the team, I want explicit scope limits, so that the hero ships focused.

#### Acceptance Criteria

1. THE Build SHALL exclude pages, sections and features outside the Hero and Site_Header. This is verified by all of the following on the production Build:
   - No application route exists other than `/` and the framework-generated not-found page. This includes no Advisory, Industries, Intelligence, Insights, About, Recognition or Contact route.
   - `main` contains the Hero as its only section.
   - The document contains no `footer` element and no `contentinfo` landmark.
   - The document contains no `form`, `input`, `select` or `textarea` element, and the Build contains no form-submission handler or server endpoint.
   - All copy is read from Site_Config at build time, with no request to a CMS or other external content source.
   - The document has a single locale (`lang="en"`), with no language switcher and no locale-prefixed routes.
2. THE Build SHALL exclude a Model_Emblem renderer. None of `lenis`, `three`, `@types/three`, `@react-three/fiber` or `@react-three/drei` SHALL appear in `package.json` or the lockfile. Site_Config SHALL set the emblem `kind` to `raster`. The Emblem_Visual contract SHALL still expose `kind`, `aspectRatio`, `anchor` and `poster` as defined in Requirement 5.6.
3. THE Build SHALL use the supplied logo files with three permitted operations only: trimming transparent padding, uniform scaling, and AVIF/WebP derivative encoding. Beyond those three operations, derivatives SHALL NOT recolor, retouch, redraw, vectorize or add elements to the emblem. Differences caused by lossy encoding are allowed. Light_Layer effects SHALL be rendered as separate layers and SHALL leave the asset files unmodified. THE Brand_Mark SHALL render "PEYMAN CONSULTING" as live text in the Typography_System, as defined in Requirement 4.5. It SHALL NOT use custom-drawn glyphs, outlined lettering or an image-based wordmark created in this feature.
4. THE Hero SHALL render visible and accessible text only from these Site_Config strings:
   - The Headline and Supporting_Copy.
   - The Primary_CTA and Secondary_CTA labels.
   - Where enabled, the verbatim Service_Index and Etymology_Note.

   The Hero SHALL contain no statistics (including the PDF proof point "over 1,250 startups within state-backed initiatives"), testimonials, founder name or credentials, or recognition or award content. This also applies inside `aria-hidden` decorative details.
5. THE Site_Header SHALL remain visible at the top of the viewport at every scroll position and in both scroll directions, with no hide-on-scroll or reveal-on-scroll-up behavior. THE Site_Header SHALL render each Nav_Item as a single entry with no nested submenu, flyout or mega-menu panel. It SHALL render no search input, no search trigger and no `search` landmark.
6. THE Build SHALL satisfy all of the following while the page loads and during any interaction with the Hero, Site_Header or Mobile_Menu, so that no analytics or cookie consent mechanism is required:
   - Zero cookies are set.
   - Zero entries are written to browser storage.
   - Zero network requests go to origins other than the site's own origin.
7. IF a production Build finds Site_Config emblem `kind` set to `model` while no Model_Emblem renderer exists, THEN THE Build SHALL fail in the same way as the Site_Config validation in Requirement 14.6, with a message naming the offending key.

### Requirement 20: Quality Gates

**User Story:** As the team, I want automated and manual gates, so that regressions are blocked before merge and release.

#### Acceptance Criteria

1. WHEN a pull request is opened or new commits are pushed to it, THE CI pipeline SHALL run each of the following as a separate, named step and SHALL block the merge unless every step passes:
   - TypeScript type check in strict mode, with zero errors.
   - ESLint (`eslint-config-next`), with zero errors.
   - Vitest unit tests and fast-check property tests, running at least 100 runs per property and covering at minimum the properties in Requirement 6.8 and Requirement 7.10.
   - `next build`, with Site_Config validated in the non-production mode defined in Requirement 17.12.
   - `npm audit`, reporting zero high or critical vulnerabilities (Requirement 14.10).
2. WHEN a pull request is opened or new commits are pushed to it, THE CI pipeline SHALL run Playwright in at least the Chromium engine against the Build at every Test_Viewport, evaluating layout assertions both after the Intro_Sequence and Specular_Sweep have completed and with Reduced_Motion_Mode emulated, and SHALL assert:
   - No horizontal overflow, measured as `document.scrollingElement.scrollWidth` ≤ `window.innerWidth` (Requirement 18.2).
   - The Headline bounding box lies fully inside the viewport (Requirement 18.3).
   - The Primary_CTA and Secondary_CTA bounding boxes do not intersect (Requirement 18.3).
   - Every interactive element in the Hero, Site_Header and Mobile_Menu has a hit area of at least 44×44 CSS px, with at least 8 px spacing between adjacent targets (Requirement 10.9).
   - At Test_Viewports narrower than 1280 px: focus is trapped inside the open Mobile_Menu for both Tab and Shift+Tab, Escape closes it, and focus returns to the menu trigger (Requirements 8.2, 8.6, 8.7, 8.12).
   - At Test_Viewports 1280 px wide or wider: the menu trigger is hidden and Nav_Items are shown inline (Requirement 7.5).
   - In Reduced_Motion_Mode, every Hero element is in its final composed state at first paint, with computed opacity 1 and no transform offset on the Headline, Supporting_Copy and CTAs (Requirement 9.10).
3. WHEN a pull request is opened or new commits are pushed to it, THE CI pipeline SHALL run axe (`@axe-core/playwright`, WCAG 2.2 A/AA tags) after the Intro_Sequence has completed, in these states and viewports:
   - Default state and forced-colors emulation, at 320×568, 390×844, 1024×768 and 1440×900.
   - Open Mobile_Menu, at 320×568, 390×844 and 1024×768.

   THE CI pipeline SHALL require zero violations of any impact level in every run, and SHALL list axe "incomplete" results in the CI report for manual review without failing the step.
4. WHEN a pull request is opened or new commits are pushed to it, THE CI pipeline SHALL run Lighthouse CI against the Build served in production mode, with the mobile preset and default throttling, for 5 runs on `/`. THE CI pipeline SHALL fail the step if the median of those runs breaches any budget in Requirement 13.1, or if the Build breaches any budget in Requirements 13.3–13.7. Field targets in Requirement 13.2 SHALL be excluded from this gate.
5. WHEN a release is prepared, THE team SHALL complete the following manual gates and record, for each one, the result (pass or fail), the date, the reviewer, and the device, OS, browser and assistive-technology versions used, in the project documentation:
   - Keyboard-only walkthrough of the Site_Header, Mobile_Menu and Hero, confirming focus order matches visual order (Requirement 12.5) and the focus indicator is never obscured (Requirement 12.3).
   - VoiceOver (iOS Safari, macOS Safari), NVDA (Windows Chrome/Firefox) and TalkBack (Android Chrome), confirming that every landmark, the Headline, both CTAs, the Brand_Mark accessible name and every Nav_Item state is announced (Requirements 7.8, 7.11, 12.4).
   - 400% zoom at 1280 px width, with no two-dimensional scrolling (Requirement 12.6).
   - Real-device checks on one iPhone with a notch, in portrait and landscape, and one Android device with ≤ 4 GB RAM, confirming Requirements 10.1–10.11, 18.2 and 18.3 and, on the Android device, the Low_Power_Mode behavior in Requirement 9.12.
   - A 4K display review at 3840×2160 at DPR 1 and 1920×1080 at DPR 2, confirming the width caps and Headline cap in Requirement 11.4.
6. WHEN a release is prepared, THE team SHALL capture Chrome performance traces at 4× CPU throttling and a 1440×900 viewport, with Reduced_Motion_Mode inactive and Low_Power_Mode not triggered, and SHALL verify all of the following:
   - From navigation until the Specular_Sweep completes, and during 5 s of continuous fine-pointer movement over the Emblem_Stage, at least 95% of frames render within 16.7 ms (60 fps), with zero long tasks over 50 ms attributable to Hero code (Requirement 13.10).
   - With the Hero scrolled fully out of the viewport, and separately with the document hidden, a 5 s trace window contains zero animation-frame or GSAP ticker callbacks attributable to Hero effects (Requirement 9.13).
   - With Low_Power_Mode active, main-thread work for Hero effects averages ≤ 2 ms per frame (Requirement 13.9).
7. IF any CI step fails, errors, or times out without producing a result, THEN THE CI pipeline SHALL mark the pull request as blocked and report the name of the failing step. A Playwright test SHALL be retried at most 2 times, and a test that passes only on retry SHALL be flagged as flaky in the CI report.
8. IF any manual gate in criteria 5–6 records a failure, the production Build fails Site_Config validation (Requirement 14.6), stakeholder approval (Requirement 18.5) is incomplete, or any Open Question is unresolved (Requirement 18.6), THEN THE team SHALL block the release until a corrective change passes criteria 1–4 and every failed manual gate is re-run and recorded as a pass.
