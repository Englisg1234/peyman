import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit + property tests run in Node only. There is no DOM environment
// (jsdom is not in the pinned table, Req 14.1); DOM behavior is tested in
// Playwright and component markup via react-dom/server.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/property/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    passWithNoTests: true,
  },
});
