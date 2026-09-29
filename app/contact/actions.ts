"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { MIN_FILL_MS, isInterest, readInquiry, validateInquiry, type InquiryState } from "@/lib/inquiry";
import { notifyInquiry, saveInquiry } from "@/lib/inquiry-store";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

// 8 attempts per client per 10 minutes, per server instance.
const limiter = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000 });

const GENERIC_ERROR = "We could not send your inquiry just now. Please try again in a few minutes.";

/**
 * Inquiry server action (progressively enhanced: works as a plain form POST
 * without JavaScript). Order: honeypot and timing → rate limit → validation
 * → storage → notification (after the response, via `after`).
 */
export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const values = readInquiry((k) => form.get(k));

  // Spam traps: the hidden field must stay empty, and a JS-stamped start
  // time (when present) must be at least MIN_FILL_MS old. Bots get a
  // success response so they learn nothing; nothing is stored.
  const trap = form.get("website");
  const started = Number(form.get("startedAt"));
  if ((typeof trap === "string" && trap.length > 0) || (Number.isFinite(started) && started > 0 && Date.now() - started < MIN_FILL_MS)) {
    return { status: "success" };
  }

  const h = await headers();
  if (!limiter.hit(clientKey(h))) {
    return { status: "error", message: "Too many inquiries from this connection. Please wait a few minutes and try again.", values };
  }

  const errors = validateInquiry(values);
  if (Object.keys(errors).length > 0 || !isInterest(values.interest)) {
    return { status: "invalid", errors, values };
  }

  const input = { ...values, interest: values.interest };
  const saved = await saveInquiry({ ...input, sourcePath: "/contact" });
  if (!saved.ok) {
    if (saved.reason === "not-configured") console.error("[inquiry] Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).");
    else console.error(`[inquiry] storage failed: ${saved.reason}`);
    return { status: "error", message: GENERIC_ERROR, values };
  }

  after(() => notifyInquiry(input));
  return { status: "success" };
}
