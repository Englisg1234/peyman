// Inquiry form contract: fields, limits, validation and action state.
// Pure and shared: the client validates with it before submitting and the
// server action validates again (the server result is authoritative).
import { interestOptions, type InterestValue } from "@/data/services";

export const INQUIRY_LIMITS = {
  name: { min: 2, max: 120 },
  company: { min: 1, max: 160 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
} as const;

/** Submissions faster than this after the form rendered are treated as automated. */
export const MIN_FILL_MS = 2500;

export type InquiryField = "name" | "company" | "email" | "interest" | "message";

export interface InquiryInput {
  name: string;
  company: string;
  email: string;
  interest: InterestValue;
  message: string;
}

export type FieldErrors = Partial<Record<InquiryField, string>>;

export type InquiryState =
  | { status: "idle" }
  | { status: "invalid"; errors: FieldErrors; values: Partial<Record<InquiryField, string>> }
  | { status: "error"; message: string; values: Partial<Record<InquiryField, string>> }
  | { status: "success" };

export const initialInquiryState: InquiryState = { status: "idle" };

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const INTEREST_VALUES = new Set<string>(interestOptions.map((o) => o.value));
// Control characters other than tab / newline / carriage return.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trims, strips control characters and collapses runs of spaces (not newlines in `message`). */
export function clean(value: unknown, multiline = false): string {
  if (typeof value !== "string") return "";
  const stripped = value.replace(CONTROL, "").trim();
  return multiline ? stripped.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : stripped.replace(/\s+/g, " ");
}

export function readInquiry(get: (key: string) => unknown): Record<InquiryField, string> {
  return {
    name: clean(get("name")),
    company: clean(get("company")),
    email: clean(get("email")).toLowerCase(),
    interest: clean(get("interest")),
    message: clean(get("message"), true),
  };
}

/** Returns field errors (empty object when valid). Messages are user-facing. */
export function validateInquiry(v: Record<InquiryField, string>): FieldErrors {
  const e: FieldErrors = {};
  const L = INQUIRY_LIMITS;
  if (v.name.length === 0) e.name = "Enter your name.";
  else if (v.name.length < L.name.min || v.name.length > L.name.max) e.name = `Use ${L.name.min}–${L.name.max} characters.`;
  if (v.company.length === 0) e.company = "Enter your company or startup name.";
  else if (v.company.length > L.company.max) e.company = `Use up to ${L.company.max} characters.`;
  if (v.email.length === 0) e.email = "Enter your email address.";
  else if (v.email.length > L.email.max || !EMAIL.test(v.email)) e.email = "Enter a valid email address, like name@company.com.";
  if (!INTEREST_VALUES.has(v.interest)) e.interest = "Choose the service or area you are interested in.";
  if (v.message.length === 0) e.message = "Tell us briefly what you need.";
  else if (v.message.length < L.message.min) e.message = `Add a little more detail (at least ${L.message.min} characters).`;
  else if (v.message.length > L.message.max) e.message = `Keep the message under ${L.message.max} characters.`;
  return e;
}

export function isInterest(value: string): value is InterestValue {
  return INTEREST_VALUES.has(value);
}

/** Field order, used to focus the first invalid field. */
export const FIELD_ORDER: readonly InquiryField[] = ["name", "company", "email", "interest", "message"];
