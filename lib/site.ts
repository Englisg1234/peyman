// Site-wide routing and URL facts. Pure; safe for server and tests.

/**
 * Absolute origin used for canonical URLs, OG tags, the sitemap and JSON-LD.
 * The production domain is not in the brief, so it must be supplied through
 * NEXT_PUBLIC_SITE_URL (e.g. https://www.example.com). Localhost otherwise.
 */
export function siteUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\/[^\s/]+/.test(raw)) return raw.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export interface RouteInfo {
  readonly path: `/${string}`;
  readonly label: string;
  readonly priority: number;
}

/** Every static public route, in footer / sitemap order. */
export const staticRoutes: readonly RouteInfo[] = [
  { path: "/", label: "Home", priority: 1 },
  { path: "/advisory", label: "Advisory", priority: 0.9 },
  { path: "/industries", label: "Industries", priority: 0.7 },
  { path: "/intelligence", label: "Intelligence", priority: 0.6 },
  { path: "/insights", label: "Insights", priority: 0.7 },
  { path: "/about", label: "About", priority: 0.8 },
  { path: "/recognition", label: "Recognition", priority: 0.6 },
  { path: "/contact", label: "Contact", priority: 0.9 },
  { path: "/privacy", label: "Privacy", priority: 0.2 },
  { path: "/terms", label: "Terms", priority: 0.2 },
];

/** Formats an ISO date (YYYY-MM-DD) as "28 September 2026", timezone-independent. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
}
