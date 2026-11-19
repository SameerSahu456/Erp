// Shared validation regexes + filter helpers. See validation.md §9.0 for the
// rules these enforce. Use these inside `validateForm()` (save-time check)
// AND in `onChange` (keystroke filter) so the input never carries bad chars.

/** Letters + space / apostrophe / hyphen / period. Must start with a letter. */
export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/

/** Minimal email shape — same pattern the Contact form already uses. */
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Indian mobile number, +91 / 91 / 10-digit. Spaces / hyphens are allowed
 *  as separators but stripped before matching. Save-time use only —
 *  keystroke-time use `PHONE_INPUT_FILTER`. */
export const PHONE_INDIA_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/

/** Indian pincode — exactly 6 digits. */
export const PINCODE_REGEX = /^\d{6}$/

/** Decimal with up to 2 fractional places (currency-friendly). */
export const CURRENCY_REGEX = /^\d+(\.\d{1,2})?$/

/** Canonical UUID (any version), case-insensitive. */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when `value` is a well-formed UUID string. */
export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_REGEX.test(value)
}

/** A route/search param coerced to a real UUID, or null. §11.1 — params are
 *  UNTRUSTED input: a malformed id must become a not-found render, never a raw
 *  API call that the backend answers with a 422 validator message. One shared
 *  guard so every detail/form page validates an `:id` the same way. */
export function asUuid(value: string | null | undefined): string | null {
  return isUuid(value) ? value : null
}

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
 */
export function isDecimalInput(value: string, maxDecimals = 2): boolean {
  if (value === "") return true
  const pattern = new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`)
  return pattern.test(value)
}

/**
 * True when a money-like string overflows a `NUMERIC(maxDigits, decimals)` field:
 * more than `maxDigits` digits in total, OR more than `maxDigits - decimals`
 * digits before the decimal point (e.g. 12 / 2 → at most 10 whole digits). The
 * backend rejects either with a 422, so inputs use this to refuse the keystroke.
 */
export function exceedsMoneyDigits(raw: string, maxDigits: number, decimals = 2): boolean {
  const digits = (text: string) => (text.match(/\d/g) ?? []).length
  const [whole = ""] = raw.split(".")
  return digits(raw) > maxDigits || digits(whole) > maxDigits - decimals
}

/** Phone keystroke filter — digits, +, -, space. */
export function isPhoneInput(value: string): boolean {
  return value === "" || /^[+\d\s-]*$/.test(value)
}

/**
 * Display a stored phone with a consistent +91 country code. Numbers
 * are captured inconsistently — some with a country code, some a bare 10-digit
 * national number — but every vendor/contact is India-based, so the DISPLAY
 * always shows +91. Formats display only; never rewrites the stored value, and
 * returns an unrecognised shape unchanged so no data is ever hidden.
 */
export function formatIndiaPhone(raw: string | null | undefined): string {
  const s = (raw ?? "").trim()
  if (!s) return ""
  if (s.startsWith("+")) return s // already carries a country code
  const digits = s.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`
  if (digits.length === 11 && digits.startsWith("0")) return `+91 ${digits.slice(1)}`
  if (digits.length === 10) return `+91 ${digits}`
  return s // unusual shape → leave as entered
}

// ── Parsers ────────────────────────────────────────────────────────

/**
 * Parse a raw string to a finite, non-negative number, or `undefined` when it
 * is empty / malformed / negative. Shared by the numeric range filter — both
 * the URL-param reader (`useUrlValueRange`) and the input control
 * (`ValueRangeInput`) — so a stray `?min_quote_value=abc` or a typed "-" never
 * reaches the query. Negatives are dropped (the backend 422s on `< 0`).
 */
export function parseNonNegativeNumber(
  value: string | null | undefined,
): number | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  if (trimmed === "") return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
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
  const compact = v.replace(/[\s-]/g, "")
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

export function validatePincode(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  return PINCODE_REGEX.test(v) ? null : "Pincode must be exactly 6 digits."
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
