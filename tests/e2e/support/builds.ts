// The two builds Playwright serves (task 8.3, DEC-05).
//
// - default:  `npm run build`         -> `.next`,         project `chromium`
// - nav-live: `npm run build:fixture` -> `.next-fixture`, project `chromium-nav-live`
//
// Tag a test with NAV_LIVE_TAG to run it against the live-nav fixture build
// only (Mobile_Menu, focus trap, no-JS disclosure). Untagged tests run against
// the default build only. A spec that must cover both builds declares one
// tagged and one untagged `describe`.

export const NAV_LIVE_TAG = "@nav-live";

export const DEFAULT_PORT = Number(process.env.PORT ?? 3000);
export const NAV_LIVE_PORT = Number(process.env.NAV_LIVE_PORT ?? DEFAULT_PORT + 1);

export const NAV_LIVE_DIST_DIR = ".next-fixture";
