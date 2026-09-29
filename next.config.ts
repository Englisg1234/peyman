import type { NextConfig } from 'next';

// Build output directory (task 8.3, DEC-05). Default `.next`. The live-nav
// fixture build (`npm run build:fixture`) uses `.next-fixture` so it never
// overwrites the default build and both can be served side by side.
const DIST_DIRS = ['.next', '.next-fixture'];
const distDir = process.env.NEXT_DIST_DIR || '.next';
if (!DIST_DIRS.includes(distDir)) {
  throw new Error(`NEXT_DIST_DIR must be one of ${DIST_DIRS.join(', ')} (got "${distDir}").`);
}

const nextConfig: NextConfig = {
  distDir,
  // Inlined at build time, so data/site-config.ts selects the fixture (or not)
  // as a compile-time constant and the default build drops the fixture code.
  env: {
    PEYMAN_CONFIG_FIXTURE: process.env.PEYMAN_CONFIG_FIXTURE ?? '',
  },
  // Next adds `<distDir>/types/**` to the tsconfig it type-checks with. A
  // non-default distDir gets its own tsconfig so tsconfig.json never lists two
  // copies of the generated route types (duplicate global declarations).
  ...(distDir === '.next' ? {} : { typescript: { tsconfigPath: 'tsconfig.fixture.json' } }),
  images: {
    // AVIF first, WebP fallback. Next 16 defaults to WebP only (Req 13.6).
    formats: ['image/avif', 'image/webp'],
    // Quality allow-list: every next/image usage requests q=70.
    qualities: [70],
    // Fixed-size candidates: brand thumbnail (32/64) and mobile emblem slots (96–384).
    imageSizes: [32, 48, 64, 96, 128, 192, 256, 384],
    // Responsive candidates. The largest is 1240 px (Req 5.5).
    deviceSizes: [512, 640, 750, 828, 1080, 1240],
    // Next 16 default (4 h). Kept explicit so it never drops below the default (risk R1).
    minimumCacheTTL: 14400,
    // Local static imports only: no remotePatterns, no domains.
  },
};

export default nextConfig;
