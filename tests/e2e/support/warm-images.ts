// Playwright globalSetup (task 19.1, risk R1): warm the image optimizer once
// per run, so no spec measures a cold AVIF encode. Playwright starts the
// webServer entries before globalSetup, so every server is already up here.
//
// Each project's baseURL (default build, and the live-nav fixture build when
// it is enabled) is warmed: the builds have separate image caches
// (`.next/cache/images`, `.next-fixture/cache/images`). Request failures abort
// the run. Budget overruns (Req 13.6) are reported as warnings here; the image
// budget spec (task 19.2) and `npm run warm:images` fail on them.
import type { FullConfig } from "@playwright/test";
import { formatReport, warmImages } from "../../../scripts/warm-images.mjs";

export default async function globalSetup(config: FullConfig) {
  const baseURLs = new Set(
    config.projects.map((p) => p.use.baseURL).filter((u): u is string => typeof u === "string"),
  );
  for (const baseURL of baseURLs) {
    const result = await warmImages(baseURL);
    const broken = result.failures.filter((f) => !f.includes("Req 13.6"));
    if (broken.length > 0) {
      throw new Error(`Image warm-up failed at ${baseURL}:\n- ${broken.join("\n- ")}\n${formatReport(result)}`);
    }
    for (const f of result.failures) console.warn(`[warm-images] ${baseURL}: ${f}`);
    console.log(`[warm-images] ${baseURL}: ${result.rows.length} derivatives warmed`);
  }
}
