// ESLint flat config (Next 16 has no `next lint`; run `eslint .`).
// Import boundaries enforce Req 14.3, 14.4, 15.5 and 15.8 (task 1.2).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Packages banned everywhere (Req 14.3, 19.2). */
const BANNED_PACKAGES = [
  {
    regex: "^(lenis|three|framer-motion)(/|$)",
    message: "Banned in this project (Req 14.3): no Lenis, three.js or Framer Motion.",
  },
  {
    regex: "^@react-three/",
    message: "Banned in this project (Req 14.3): no R3F or drei.",
  },
];

/** GSAP may be imported only in lib/gsap.ts and components/motion/* (Req 14.4). */
const GSAP_ONLY_IN_MOTION = {
  regex: "^(gsap|@gsap/react)(/|$)",
  message: "Import GSAP only in lib/gsap.ts or components/motion/* (Req 14.4).",
};

/** Layout components must not reach hero composition or hero motion (Req 15.5). */
const LAYOUT_NO_HERO = [
  {
    regex: "^(@/|(\\.\\./)+)components/hero(/|$)|^\\.\\./hero(/|$)",
    message: "components/layout/* must not import components/hero/* (Req 15.5).",
  },
  {
    regex: "^(@/|(\\.\\./)+)components/motion/hero-motion$|^\\.\\./motion/hero-motion$",
    message: "components/layout/* must not import hero motion (Req 15.5).",
  },
];

/** UI primitives may import other UI primitives only (Req 15.1). */
const UI_NO_COMPONENTS = {
  regex: "^(@/|(\\.\\./)+)components/(?!ui(/|$))|^\\.\\./(?!\\.\\./|ui/)",
  message: "components/ui/* must not import other components (Req 15.1).",
};

/** Shared modules must not import components (Req 15.1). */
const LIB_NO_COMPONENTS = {
  regex: "^(@/|(\\.\\./)+)components(/|$)",
  message: "lib/* must not import components/* (Req 15.1).",
};

/** Raster_Emblem only through the renderer-selection point (Req 15.9). */
const RASTER_ONLY_VIA_SELECTION = {
  regex: "(^|/)raster-emblem$",
  message: "Import Raster_Emblem only in components/hero/emblem-visual.tsx (Req 15.9).",
};

/**
 * Flat config replaces (does not merge) rule options when several blocks
 * match a file, so each block lists its full pattern set.
 * `restrict` always includes the banned packages and the Raster_Emblem rule;
 * `restrictAllowingRaster` is only for the renderer-selection point.
 */
const restrictAllowingRaster = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns: [...BANNED_PACKAGES, ...patterns] }],
});
const restrict = (...patterns) => restrictAllowingRaster(RASTER_ONLY_VIA_SELECTION, ...patterns);

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-fixture/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "qa/**",
    ".lighthouseci/**",
  ]),
  { rules: restrict(GSAP_ONLY_IN_MOTION) },
  { files: ["components/layout/**"], rules: restrict(GSAP_ONLY_IN_MOTION, ...LAYOUT_NO_HERO) },
  { files: ["components/ui/**"], rules: restrict(GSAP_ONLY_IN_MOTION, UI_NO_COMPONENTS) },
  { files: ["lib/**"], rules: restrict(GSAP_ONLY_IN_MOTION, LIB_NO_COMPONENTS) },
  { files: ["components/motion/**"], rules: restrict() },
  { files: ["lib/gsap.ts"], rules: restrict(LIB_NO_COMPONENTS) },
  { files: ["components/hero/emblem-visual.tsx"], rules: restrictAllowingRaster(GSAP_ONLY_IN_MOTION) },
]);
