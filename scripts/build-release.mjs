// Release build (task 5.2, DEC-03): `npm run build:release` runs
// `npm run release:check` first, then this script, which runs `next build`
// with PEYMAN_RELEASE=1 so the layout's Site_Config gate is strict during
// prerender. Setting the variable here keeps the command cross-platform
// (PowerShell, cmd, POSIX) without adding cross-env.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, PEYMAN_RELEASE: "1" },
});

if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
