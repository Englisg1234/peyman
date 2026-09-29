// Types for scripts/warm-images.mjs (imported by the Playwright globalSetup).
export interface WarmRow {
  path: string;
  width: number;
  variant: "avif" | "webp";
  status: number;
  type: string;
  bytes: number;
  cache: string;
  ms: number;
  limit: number | undefined;
}

export interface WarmResult {
  baseURL: string;
  rows: WarmRow[];
  failures: string[];
}

export const DEFAULT_BASE_URL: string;
export const MAX_WIDTH: number;
export const SMALL_MAX_WIDTH: number;
export const BUDGETS: Record<"image/avif" | "image/webp", [number, number]>;
export const ACCEPT_VARIANTS: ReadonlyArray<{ name: "avif" | "webp"; accept: string; expect: string }>;
export function extractImageUrls(html: string): string[];
export function budgetFor(contentType: string, width: number): number | undefined;
export function warmImages(baseURL?: string): Promise<WarmResult>;
export function formatReport(result: WarmResult): string;
