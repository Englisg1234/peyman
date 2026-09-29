// Site_Config release gate (task 5.2, DEC-03, Req 14.6, 17.12, 18.7, 19.7).
//
// - Release mode (`PEYMAN_RELEASE=1`): any issue throws. The root layout calls
//   the gate during prerender, so `next build` fails and names every key.
// - Otherwise (dev, plain `next build`, preview): the gate returns the CTA
//   warnings, and the layout inlines `warningScript()` to log each once.
import { validateSiteConfig, type BuildMode, type ValidationIssue } from "./site-config-schema";

type Env = Readonly<Record<string, string | undefined>>;

/** True only for `PEYMAN_RELEASE=1`. */
export function isReleaseBuild(env: Env = process.env): boolean {
  return env.PEYMAN_RELEASE === "1";
}

export function buildMode(env: Env = process.env): BuildMode {
  return isReleaseBuild(env) ? "production" : "non-production";
}

/** One line per issue: `cta.primary.destination: pending-integration ("contact-feature")`. */
export function describeIssue(issue: ValidationIssue): string {
  const value = issue.value === undefined ? "" : ` (${JSON.stringify(issue.value)})`;
  return `${issue.key}: ${issue.reason}${value}`;
}

export class SiteConfigReleaseError extends Error {
  readonly issues: readonly ValidationIssue[];
  constructor(issues: readonly ValidationIssue[]) {
    super(
      "Site_Config release gate failed (PEYMAN_RELEASE=1). Resolve every offending key " +
        "in data/site-config.ts before releasing:\n" +
        issues.map((i) => `  - ${describeIssue(i)}`).join("\n"),
    );
    this.name = "SiteConfigReleaseError";
    this.issues = issues;
  }
}

/**
 * Validates `cfg` for the current mode. Throws `SiteConfigReleaseError` in
 * release mode when any issue exists; otherwise returns the warnings to log.
 */
export function runSiteConfigGate(cfg: unknown, env: Env = process.env): readonly ValidationIssue[] {
  const result = validateSiteConfig(cfg, buildMode(env));
  if (!result.ok) throw new SiteConfigReleaseError(result.issues);
  return result.warnings;
}

/**
 * Inline script body that calls `console.warn` once per warning, or `null`
 * when there is nothing to log. The data is JSON-serialized and `<`, `>`, `&`
 * and U+2028/2029 are escaped, so config values cannot close the `<script>`.
 */
export function warningScript(warnings: readonly ValidationIssue[]): string | null {
  if (warnings.length === 0) return null;
  const messages = warnings.map((w) => `[Site_Config] ${describeIssue(w)}`);
  const json = JSON.stringify(messages)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `${json}.forEach(function(m){console.warn(m)})`;
}
