import type { ReactNode } from "react";

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Renders the control; receives the ARIA wiring to spread onto it. */
  children: (aria: { id: string; "aria-invalid"?: true; "aria-describedby"?: string; required?: boolean }) => ReactNode;
}

/**
 * Label + control + hint + error. The control is always programmatically
 * labelled; hint and error are referenced by aria-describedby, and the
 * required state is announced by the native `required` attribute (the
 * visible asterisk is decorative).
 */
export function FormField({ id, label, required = false, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, required })}
      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}
