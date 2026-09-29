// Live-nav fixture build (task 8.3, DEC-05): `npm run build:fixture`.
// Runs `next build` with PEYMAN_CONFIG_FIXTURE=nav-live into `.next-fixture`,
// next to (never over) the default `.next` build. Playwright serves it as the
// `chromium-nav-live` project. Setting the variables here keeps the command
// cross-platform (PowerShell, cmd, POSIX) without adding cross-env.
//
// `next build` rewrites next-env.d.ts to import `<distDir>/types/*`. The file
// is restored afterwards so `npm run typecheck` keeps using `.next/types`.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const NEXT_ENV = "next-env.d.ts";
const savedNextEnv = existsSync(NEXT_ENV) ? readFileSync(NEXT_ENV) : null;

// PEYMAN_RELEASE is passed through untouched: with it set, the layout's gate
// fails this build on `fixture: fixture-config` (a fixture is never a release).
const env = { ...process.env, NEXT_DIST_DIR: ".next-fixture", PEYMAN_CONFIG_FIXTURE: "nav-live" };

const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], { stdio: "inherit", env });

if (savedNextEnv === null) rmSync(NEXT_ENV, { force: true });
else writeFileSync(NEXT_ENV, savedNextEnv);

if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
