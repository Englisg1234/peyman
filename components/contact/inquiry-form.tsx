"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { submitInquiry } from "@/app/contact/actions";
import { interestOptions } from "@/data/services";
import { FIELD_ORDER, INQUIRY_LIMITS, initialInquiryState, isInterest, readInquiry, validateInquiry, type FieldErrors } from "@/lib/inquiry";
import { FormField } from "./form-field";

/** Focuses the first invalid field in DOM order. */
function focusFirst(form: HTMLFormElement | null, e: FieldErrors) {
  const first = FIELD_ORDER.find((f) => e[f]);
  if (first) form?.querySelector<HTMLElement>(`#inquiry-${first}`)?.focus();
}

/**
 * Inquiry form (client leaf). A server action form: without JavaScript it
 * posts natively and the server validates. With JavaScript it validates
 * on submit, focuses the first invalid field, shows a pending state and
 * moves focus to the result. Values survive server errors.
 */
export function InquiryForm() {
  const [state, action, pending] = useActionState(submitInquiry, initialInquiryState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<HTMLInputElement>(null);
  const interestRef = useRef<HTMLSelectElement>(null);

  const errors: FieldErrors = clientErrors ?? (state.status === "invalid" ? state.errors : {});
  const values = state.status === "invalid" || state.status === "error" ? state.values : {};

  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
    const q = new URLSearchParams(window.location.search).get("interest") ?? "";
    if (isInterest(q) && interestRef.current && !interestRef.current.value) interestRef.current.value = q;
  }, []);

  useEffect(() => {
    if (state.status === "success" || state.status === "error") statusRef.current?.focus();
    if (state.status === "invalid") focusFirst(formRef.current, state.errors);
    // React resets action forms after submit; a <select> falls back to its
    // placeholder, so restore the submitted choice from the returned values.
    if ((state.status === "invalid" || state.status === "error") && interestRef.current && state.values.interest) {
      interestRef.current.value = state.values.interest;
    }
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const found = validateInquiry(readInquiry((k) => data.get(k)));
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setClientErrors(found);
      focusFirst(formRef.current, found);
      return;
    }
    setClientErrors(null);
  }

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} className="form-status success" data-kind="success" role="status">
        <p className="kicker kicker--accent" style={{ margin: 0 }}>Inquiry received</p>
        <p className="t-h3" style={{ margin: 0 }}>Thank you. Your inquiry is with Peyman.</p>
        <p className="t-small">We will review it and reply by email to schedule a consultation where it is a fit.</p>
        <p className="t-small">
          In the meantime, the <Link className="inline-link" href="/advisory">advisory scope</Link> and{" "}
          <Link className="inline-link" href="/insights">insights</Link> describe how we work.
        </p>
      </div>
    );
  }

  const count = Object.keys(errors).length;
  return (
    <form ref={formRef} className="form" action={action} onSubmit={onSubmit} noValidate aria-describedby="inquiry-note" aria-busy={pending || undefined}>
      {state.status === "error" && (
        <div ref={statusRef} tabIndex={-1} className="form-status" data-kind="error" role="alert">
          <p style={{ margin: 0 }}>{state.message}</p>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {count > 0 ? `${count} ${count === 1 ? "field needs" : "fields need"} attention.` : ""}
      </p>
      <div className="form__row">
        <FormField id="inquiry-name" label="Name" required error={errors.name}>
          {(a) => <input {...a} name="name" className="field__control" autoComplete="name" maxLength={INQUIRY_LIMITS.name.max} defaultValue={values.name} />}
        </FormField>
        <FormField id="inquiry-company" label="Company / Startup" required error={errors.company}>
          {(a) => <input {...a} name="company" className="field__control" autoComplete="organization" maxLength={INQUIRY_LIMITS.company.max} defaultValue={values.company} />}
        </FormField>
      </div>
      <div className="form__row">
        <FormField id="inquiry-email" label="Email" required error={errors.email}>
          {(a) => <input {...a} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className="field__control" maxLength={INQUIRY_LIMITS.email.max} defaultValue={values.email} />}
        </FormField>
        <FormField id="inquiry-interest" label="Area of interest / Service" required error={errors.interest}>
          {(a) => (
            <select {...a} ref={interestRef} name="interest" className="field__control" defaultValue={values.interest ?? ""}>
              <option value="" disabled>Select one</option>
              {interestOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <FormField id="inquiry-message" label="Message" required hint="Your stage, the question in front of you and any timelines. Please do not include confidential documents." error={errors.message}>
        {(a) => <textarea {...a} name="message" className="field__control" rows={6} maxLength={INQUIRY_LIMITS.message.max} defaultValue={values.message} />}
      </FormField>
      <div className="form__trap" aria-hidden="true">
        <label htmlFor="inquiry-website">Leave this field empty</label>
        <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input ref={startedRef} type="hidden" name="startedAt" defaultValue="" />
      <div className="form__footer">
        <button type="submit" className="btn btn-primary type-cta form__submit" aria-disabled={pending || undefined} disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Sending…
            </>
          ) : (
            "Send inquiry"
          )}
        </button>
        <p id="inquiry-note" className="field__hint" style={{ margin: 0 }}>
          All fields are required. We use your details only to respond. See the <Link className="inline-link" href="/privacy">privacy notice</Link>.
        </p>
      </div>
    </form>
  );
}
