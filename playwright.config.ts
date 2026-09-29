import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { DEFAULT_PORT, NAV_LIVE_DIST_DIR, NAV_LIVE_PORT, NAV_LIVE_TAG } from "./tests/e2e/support/builds";

const isCI = Boolean(process.env.CI);
const tagPattern = new RegExp(NAV_LIVE_TAG);
const url = (port: number) => `http://127.0.0.1:${port}`;

// The live-nav fixture build (DEC-05) is required in CI. Locally it is served
// only once `npm run build:fixture` has produced it, so default-build runs do
// not fail on a missing fixture build.
const withNavLive = isCI || existsSync(`${NAV_LIVE_DIST_DIR}/BUILD_ID`);
if (!withNavLive) {
  console.warn(`[playwright] ${NAV_LIVE_DIST_DIR} not found: skipping ${NAV_LIVE_TAG} tests (run \`npm run build:fixture\`).`);
}

const chrome = devices["Desktop Chrome"];

// E2E runs against production builds: `npm run build` (default) and
// `npm run build:fixture` (live-nav fixture). Neither server builds on start.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  // Runs after the webServers are up: warms every emblem derivative under both
  // Accept variants on each project's server, once per run (risk R1).
  globalSetup: "./tests/e2e/support/warm-images.ts",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", grepInvert: tagPattern, use: { ...chrome, baseURL: url(DEFAULT_PORT) } },
    ...(withNavLive
      ? [{ name: "chromium-nav-live", grep: tagPattern, use: { ...chrome, baseURL: url(NAV_LIVE_PORT) } }]
      : []),
  ],
  webServer: [
    {
      command: `npx next start -p ${DEFAULT_PORT}`,
      url: url(DEFAULT_PORT),
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    ...(withNavLive
      ? [
          {
            // next.config.ts reads NEXT_DIST_DIR, so `next start` serves the fixture build.
            command: `npx next start -p ${NAV_LIVE_PORT}`,
            url: url(NAV_LIVE_PORT),
            env: { NEXT_DIST_DIR: NAV_LIVE_DIST_DIR, PEYMAN_CONFIG_FIXTURE: "nav-live" },
            reuseExistingServer: !isCI,
            timeout: 120_000,
          },
        ]
      : []),
  ],
});
