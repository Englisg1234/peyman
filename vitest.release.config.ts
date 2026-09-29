import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Release gate (task 5.2, DEC-03): `npm run release:check`.
// PEYMAN_RELEASE=1 is set here rather than on the command line, so the check
// is identical on Windows PowerShell, cmd and POSIX shells with no extra
// dependency (no cross-env).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/release/**/*.test.ts"],
    env: { PEYMAN_RELEASE: "1" },
  },
});
