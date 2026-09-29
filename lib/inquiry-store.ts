// Inquiry persistence (Supabase, via PostgREST) and the optional
// notification hook. Server-only by construction: it reads non-public env
// vars and is imported only by app/contact/actions.ts ("use server").
//
// Least privilege: the server uses the project's anon / publishable key,
// and the `inquiries` table allows INSERT only for that role through RLS
// (supabase/migrations/0001_inquiries.sql). No service-role key is needed
// or read, and nothing here is exposed to the browser.
import type { InquiryInput } from "./inquiry";

type Env = Readonly<Record<string, string | undefined>>;

export interface StoreConfig {
  url: string;
  key: string;
}

/** https anywhere; plain http only for loopback (the local Supabase CLI stack runs on http://127.0.0.1:54321). */
const ALLOWED_URL = /^(https:\/\/[^\s/]+|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?)(\/|$)/;

export function storeConfig(env: Env = process.env): StoreConfig | null {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key || !ALLOWED_URL.test(url)) return null;
  return { url, key };
}

export type StoreResult = { ok: true } | { ok: false; reason: "not-configured" | "rejected" | "network" };

export async function saveInquiry(input: InquiryInput & { sourcePath: string }, cfg = storeConfig(), fetchImpl: typeof fetch = fetch): Promise<StoreResult> {
  if (!cfg) return { ok: false, reason: "not-configured" };
  const headers: Record<string, string> = {
    apikey: cfg.key,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  // Legacy anon keys are JWTs and go in Authorization too; new publishable keys do not.
  if (cfg.key.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.key}`;
  try {
    const res = await fetchImpl(`${cfg.url}/rest/v1/inquiries`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: input.name,
        company: input.company,
        email: input.email,
        interest: input.interest,
        message: input.message,
        source_path: input.sourcePath,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * Notification integration point. When INQUIRY_WEBHOOK_URL is set (for
 * example an email provider, Slack, or a Supabase Edge Function that sends
 * mail), the inquiry is POSTed there as JSON after it is stored. Optional
 * INQUIRY_WEBHOOK_SECRET is sent as `X-Webhook-Secret`. Failures never
 * affect the visitor's result.
 */
export async function notifyInquiry(input: InquiryInput, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<void> {
  const url = env.INQUIRY_WEBHOOK_URL?.trim();
  if (!url || !ALLOWED_URL.test(url)) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.INQUIRY_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = env.INQUIRY_WEBHOOK_SECRET;
  try {
    await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "inquiry.created", inquiry: input, receivedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Integration point only: storage already succeeded.
  }
}
