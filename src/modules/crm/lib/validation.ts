// Shared validation regexes + filter helpers. See validation.md §9.0 for the
// rules these enforce. Use these inside `validateForm()` (save-time check)
// AND in `onChange` (keystroke filter) so the input never carries bad chars.

/** Letters + space / apostrophe / hyphen / period. Must start with a letter. */
export const NAME_REGEX = /^[A-Za-z][A-Za-z .'\-]*$/

/** Minimal email shape — same pattern the Contact form already uses. */
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Indian mobile number, +91 / 91 / 10-digit. Spaces / hyphens are allowed
 *  as separators but stripped before matching. Save-time use only —
 *  keystroke-time use `PHONE_INPUT_FILTER`. */
export const PHONE_INDIA_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/

/** Website URL — accepts http://, https://, or a bare "www." prefix.
 *  Subdomains and most TLDs are permitted. The protocol is optional only
 *  when the host starts with `www.`; everything else must declare http(s). */
export const URL_REGEX =
  /^(?:https?:\/\/|www\.)([\w\-]+\.)*[\w\-]+\.[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i

/** Pure integer string (no signs, no exponent, no decimal). */
export const INTEGER_REGEX = /^\d+$/

/** Decimal with up to 2 fractional places (currency-friendly). */
export const CURRENCY_REGEX = /^\d+(\.\d{1,2})?$/

// ── Keystroke-time filters ─────────────────────────────────────────
// These return TRUE when the next text should be accepted. Use inside
// `onChange` so disallowed chars never reach state. Pair with a normalize
// step on blur if needed.

/** Allow only digit characters. Empty string is allowed (so backspace works). */
export function isIntegerInput(value: string): boolean {
  return value === "" || /^\d+$/.test(value)
}

/**
 * Decimal-as-you-type: empty, digits, optional single dot with ≤ 2 trailing
 * decimal digits. Accepts ".", "0.", "0.1", "12.", "12.34". Rejects "1.234"
 * and "1e5".
 *
 * Pass `maxIntegerDigits` to cap the digit count before the decimal — needed
 * for money fields that the backend stores as a bounded `Decimal`. Without a
 * cap, pasting a huge number is accepted here; if the submit path also calls
 * `Number(value)` the result is scientific notation (precision breaks past
 * ~17 digits) and the backend 400s with `decimal_max_digits`. Send such
 * fields as a trimmed string at submit time to avoid the Number round-trip.
 */
export function isDecimalInput(
  value: string,
  maxDecimals = 2,
  maxIntegerDigits?: number,
): boolean {
  if (value === "") return true
  const intPart = maxIntegerDigits ? `\\d{0,${maxIntegerDigits}}` : "\\d*"
  const pattern = new RegExp(`^${intPart}(\\.\\d{0,${maxDecimals}})?$`)
  return pattern.test(value)
}

/** Backend's `AccountCreate.revenue` is `Decimal(max_digits=18,
 *  decimal_places=2)` → max 16 integer digits. Cap the input at the same
 *  limit; the wizard must also send `revenue` as a trimmed string (not via
 *  `Number()`) so values past JS Number precision don't become scientific
 *  notation at submit time. */
export const REVENUE_MAX_INTEGER_DIGITS = 16

/** Phone keystroke filter — digits, +, -, space. */
export function isPhoneInput(value: string): boolean {
  return value === "" || /^[+\d\s\-]*$/.test(value)
}

/** Phone normaliser — keep digits only and cap at 10 (Indian mobile). Use in
 *  `onChange` so the field can only ever hold a bare 10-digit number: no +91,
 *  no spaces, no separators, no overflow. */
export function sanitizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

/** Strip non-digits/letters/spaces from a name as the user types. */
export function isNameInput(value: string): boolean {
  // Allow incomplete typing: an empty string, or a partial value that only
  // uses the legal name chars. Final shape (must START with a letter) is
  // checked at save time via NAME_REGEX.
  return value === "" || /^[A-Za-z][A-Za-z .'\-]*$/.test(value) || /^[A-Za-z]?$/.test(value)
}

// ── Save-time validators ───────────────────────────────────────────
// Return an error string (to be passed to FieldError) or null when valid.

export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length > 255) return "Email must be ≤ 255 characters."
  return EMAIL_REGEX.test(v) ? null : "Enter a valid email address."
}

export function validatePhoneIndia(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  // Strip separator chars before matching so "+91 98 7654 3210" passes.
  const compact = v.replace(/[\s\-]/g, "")
  if (compact.length > 30) return "Phone must be ≤ 30 characters."
  return PHONE_INDIA_REGEX.test(compact)
    ? null
    : "Enter a valid 10-digit Indian mobile number."
}

export function validateName(
  value: string,
  opts?: { maxLength?: number; label?: string },
): string | null {
  const v = value.trim()
  if (!v) return null
  const maxLength = opts?.maxLength ?? 255
  const label = opts?.label ?? "Name"
  if (v.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`
  return NAME_REGEX.test(v)
    ? null
    : "Name should only contain letters, spaces, apostrophes, or hyphens."
}

/** Free-text save-time check — enforces ONLY a max length, no character
 *  restrictions (digits, spaces, ampersands, etc. all allowed). Use for
 *  name/company fields that must accept arbitrary text. */
export function validateFreeText(
  value: string,
  opts?: { maxLength?: number; label?: string },
): string | null {
  const v = value.trim()
  if (!v) return null
  const maxLength = opts?.maxLength ?? 255
  const label = opts?.label ?? "This field"
  if (v.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`
  return null
}

export function validateUrl(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length > 500) return "URL must be ≤ 500 characters."
  return URL_REGEX.test(v)
    ? null
    : "Enter a valid URL (e.g. https://example.com or www.example.com)."
}

export function validateInteger(value: string, opts?: { min?: number; max?: number }): string | null {
  const v = value.trim()
  if (!v) return null
  if (!INTEGER_REGEX.test(v)) return "Enter whole numbers only (no decimals or letters)."
  const n = Number(v)
  if (opts?.min != null && n < opts.min) return `Must be ≥ ${opts.min}.`
  if (opts?.max != null && n > opts.max) return `Must be ≤ ${opts.max}.`
  return null
}

export function validateCurrency(
  value: string,
  opts?: { min?: number; max?: number },
): string | null {
  const v = value.trim()
  if (!v) return null
  if (!CURRENCY_REGEX.test(v))
    return "Enter a valid amount (digits with up to 2 decimal places)."
  const n = Number(v)
  if (opts?.min != null && n < opts.min) return `Must be ≥ ${opts.min}.`
  if (opts?.max != null && n > opts.max) return `Must be ≤ ${opts.max}.`
  return null
}
