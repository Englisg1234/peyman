// Image optimizer warm-up and derivative budget check (task 19.1, risk R1,
// Req 5.5, 13.6). Node built-ins only.
//
//   npm run warm:images [-- <baseURL>]      (or WARM_IMAGES_BASE_URL=...)
//
// next/image encodes AVIF on the first request for each URL, which can take
// seconds for the large candidates. Run this after `next start` (and after
// every deploy) before Lighthouse, screenshots or traffic, so a cold encode
// never lands inside a measured window. Next keys its image cache by URL and
// output format, so every URL is requested twice: once with an AVIF-first
// Accept header and once with a WebP-only header.
//
// It fetches `/`, collects every `/_next/image?...` URL from `src`, `srcset`
// and `<link rel=preload imagesrcset>`, requests each under both Accept
// headers, prints a table and exits non-zero on any non-2xx response, a
// candidate wider than 1240 device px, or a derivative over its Req 13.6
// budget. Also usable as a module: `warmImages(baseURL)`.
export const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
export const MAX_WIDTH = 1240;
/** Req 13.6 splits the budgets at 440 device px (the `w` parameter). */
export const SMALL_MAX_WIDTH = 440;
const KB = 1024;
/** Req 13.6 limits in bytes, per output format: [≤ 440 px, > 440 px]. */
export const BUDGETS = {
  "image/avif": [90 * KB, 180 * KB],
  "image/webp": [130 * KB, 260 * KB],
};
export const ACCEPT_VARIANTS = [
  { name: "avif", accept: "image/avif,image/webp,*/*", expect: "image/avif" },
  { name: "webp", accept: "image/webp,*/*", expect: "image/webp" },
];

const REQUEST_TIMEOUT_MS = 60_000;
const READY_TIMEOUT_MS = 30_000;

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"');

/** Every unique `/_next/image` URL referenced by img src/srcset or preload imagesrcset. */
export function extractImageUrls(html) {
  const urls = new Set();
  const attr = /\s(?:src|srcset|imagesrcset)="([^"]*)"/gi;
  for (const tag of html.match(/<(?:img|link)\b[^>]*>/gi) ?? []) {
    for (const [, raw] of tag.matchAll(attr)) {
      // srcset candidates are "URL descriptor" pairs; the optimizer URLs are
      // percent-encoded, so a comma only ever separates candidates.
      for (const candidate of decodeEntities(raw).split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url?.startsWith("/_next/image?")) urls.add(url);
      }
    }
  }
  return [...urls];
}

/** The Req 13.6 byte limit for a derivative, or undefined for an unexpected type. */
export function budgetFor(contentType, width) {
  const limits = BUDGETS[contentType];
  return limits && limits[width <= SMALL_MAX_WIDTH ? 0 : 1];
}

async function fetchPage(baseURL) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      const res = await fetch(new URL("/", baseURL), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`GET / returned ${res.status}`);
      return await res.text();
    } catch (error) {
      if (Date.now() > deadline) throw new Error(`Cannot load ${baseURL}/: ${error.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Requests every optimizer URL on `/` under both Accept variants.
 * Resolves to `{ baseURL, rows, failures }`; never throws for budget or HTTP
 * failures (they are listed in `failures`), only when `/` cannot be loaded.
 */
export async function warmImages(baseURL = DEFAULT_BASE_URL) {
  const html = await fetchPage(baseURL);
  const urls = extractImageUrls(html);
  const rows = [];
  const failures = [];
  if (urls.length === 0) failures.push(`${baseURL}/: no /_next/image URLs found`);

  for (const path of urls) {
    const width = Number(new URL(path, baseURL).searchParams.get("w"));
    if (!(width > 0) || width > MAX_WIDTH) failures.push(`${path}: width ${width} is outside 1–${MAX_WIDTH} px (Req 5.5)`);
    for (const variant of ACCEPT_VARIANTS) {
      const started = Date.now();
      const row = { path, width, variant: variant.name, status: 0, type: "", bytes: 0, cache: "", ms: 0, limit: undefined };
      try {
        const res = await fetch(new URL(path, baseURL), {
          headers: { Accept: variant.accept },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const body = await res.arrayBuffer();
        Object.assign(row, {
          status: res.status,
          type: (res.headers.get("content-type") ?? "").split(";")[0].trim(),
          bytes: body.byteLength,
          cache: res.headers.get("x-nextjs-cache") ?? "",
        });
      } catch (error) {
        failures.push(`${path} [${variant.name}]: ${error.message}`);
      }
      row.ms = Date.now() - started;
      rows.push(row);
      if (row.status === 0) continue;
      const label = `w=${width} [${variant.name}]`;
      if (row.status < 200 || row.status > 299) {
        failures.push(`${label}: HTTP ${row.status}`);
        continue;
      }
      if (row.type !== variant.expect) failures.push(`${label}: served ${row.type || "no type"}, expected ${variant.expect}`);
      row.limit = budgetFor(row.type, width);
      if (row.limit === undefined) failures.push(`${label}: no Req 13.6 budget for ${row.type}`);
      else if (row.bytes > row.limit) {
        failures.push(`${label}: ${row.type} ${(row.bytes / KB).toFixed(1)} KB exceeds the ${row.limit / KB} KB budget (Req 13.6)`);
      }
    }
  }
  return { baseURL, rows, failures };
}

/** A fixed-width text table: one line per URL, both variants side by side. */
export function formatReport({ baseURL, rows }) {
  const byPath = new Map();
  for (const r of rows) {
    const entry = byPath.get(r.path) ?? { width: r.width };
    entry[r.variant] = r;
    byPath.set(r.path, entry);
  }
  const cell = (r) =>
    r ? `${String(r.status).padEnd(4)}${(r.type || "-").padEnd(11)}${(r.bytes / KB).toFixed(1).padStart(7)} KB / ${r.limit ? r.limit / KB : "-"} KB  ${(r.cache || "-").padEnd(6)}${String(r.ms).padStart(6)} ms` : "-";
  const lines = [`Image derivatives at ${baseURL} (1 KB = 1,024 bytes)`, `${"w".padStart(5)}  ${"AVIF-first Accept".padEnd(50)}  WebP-only Accept`];
  for (const { width, avif, webp } of [...byPath.values()].sort((a, b) => a.width - b.width)) {
    lines.push(`${String(width).padStart(5)}  ${cell(avif).padEnd(50)}  ${cell(webp)}`);
  }
  return lines.join("\n");
}

async function main() {
  const baseURL = process.argv[2] || process.env.WARM_IMAGES_BASE_URL || DEFAULT_BASE_URL;
  const result = await warmImages(baseURL);
  console.log(formatReport(result));
  if (result.failures.length > 0) {
    console.error(`\n${result.failures.length} failure(s):\n- ${result.failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`\nOK: ${result.rows.length} derivatives warmed, all within Req 13.6 budgets.`);
}

// CLI entry. Detected from argv, not `import.meta`, because Playwright's
// transform loads this file as CommonJS when globalSetup imports it.
if (/[\\/]warm-images\.mjs$/.test(process.argv[1] ?? "")) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
