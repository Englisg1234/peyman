'use client';

// The single GSAP entry point (Req 13.5, 14.4; design: GSAP architecture, rule 1).
//
// This is the only module that imports `gsap`, `gsap/ScrollTrigger` and
// `@gsap/react` (enforced by eslint.config.mjs and tests/unit/architecture.test.ts).
// Plugins are registered once, here, at module evaluation.
//
// Import it only from components/motion/*. Those modules are reached solely
// through MotionLoader's post-hydration `import()`, so GSAP lives in the motion
// chunk and never in the first-load bundle or the server render.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Registering useGSAP as a plugin keeps it bound to this gsap instance
// (per the @gsap/react README). Re-registration is a no-op.
gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };
