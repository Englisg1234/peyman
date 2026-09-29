// Hero emblem `sizes` attribute (design: Performance architecture,
// "Responsive sizes"; Req 5.2). Pure data, no component imports.
//
// Each entry is the rendered emblem width of a band, rounded up so the
// resolved size stays within 100–125% of the width that `computeHeroLayout()`
// (lib/layout-model.ts) models, and that the CSS band layouts implement
// (tasks 10.6 mobile, 12.1 tablet and up, 13.1 compact). The browser takes the
// first matching condition, so order matters: the landscape-phone band wins
// over the width bands below 1024, as `bandFor()` does.
//
// Resolved value vs modelled width (emblem aspect 1003/1144) at every
// Test_Viewport:
//
//   viewport     band            sizes      model w   ratio
//   320×568      mobile-compact  104px       84.2     1.236
//   360×640      mobile-compact  104px       89.8     1.158
//   375×667      mobile-compact  104px       93.6     1.111
//   390×844      mobile          176px      162.8     1.081
//   414×896      mobile          176px      172.8     1.018
//   667×375      landscape       256px      230.1     1.112
//   844×390      landscape       256px      239.4     1.070
//   768×1024     tablet          36vw=276.5 243.0     1.138
//   1024×768     desktop         37vw=378.9 373.9     1.013
//   1024×1366    desktop         37vw=378.9 373.9     1.013
//   1280×800     wide            38vw=486.4 472.0     1.031
//   1440×900     wide            38vw=547.2 533.3     1.026
//   1920×1080    ultra           620px      620.0     1.000
//   1920×1080@2x ultra           620px      620.0     1.000
//   3840×2160    ultra           620px      620.0     1.000
//
// Band notes:
// - Mobile heights follow Req 10.2 / 10.3; the width is height × aspect.
//   Tall portrait (h ≥ 720): 720–819 → 139–158 px (160px), ≥ 820 → 158–175 px
//   (176px). Compact (h < 720): 84–101 px (104px).
// - Wide 1527–1919: the content box is capped at 1360, so the emblem stays at
//   548 px (580px = 1.058).
// - Outside the Test_Viewports, two rare window shapes fall outside 100–125%:
//   landscape windows below 768 wide but at least 480 tall (mobile band, emblem
//   105–148 px vs 104px) and short landscape windows below about 600 wide
//   (for example 568×320: 196 px vs 256px). No phone reports the first; the
//   second over-fetches by one candidate at most.
//
// With a `vw` entry present, next/image drops srcset candidates narrower than
// deviceSizes[0] × 0.36 = 184 px, so the smallest hero candidate is 192 w
// (next.config.ts `imageSizes`); the largest is 1240 w (Req 5.5).
export const HERO_EMBLEM_SIZES = [
  "(orientation: landscape) and (max-height: 479px) and (max-width: 1023px) 256px",
  "(max-width: 767px) and (min-height: 820px) 176px",
  "(max-width: 767px) and (min-height: 720px) 160px",
  "(max-width: 767px) 104px",
  "(max-width: 1023px) 36vw",
  "(max-width: 1279px) 37vw",
  "(max-width: 1526px) 38vw",
  "(max-width: 1919px) 580px",
  "620px",
].join(", ");
