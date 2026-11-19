// Numeric limits shared by every line-item price input — the Quote builder,
// the Sales Order form, and the Closed-Won wizard (plus their BOM child rows).
// One source of truth so the cap can be widened in a single place.
export const LINE_ITEM_LIMITS = {
  // Max number of integer (pre-decimal) digits allowed in a Rate / unit-price
  // input. 10 digits admits values up to 9,99,99,99,999 (e.g. 2000020000).
  // Bump this single value to widen the cap on all three surfaces at once —
  // every rate handler reads it through `exceedsPriceDigitCap`.
  MAX_PRICE_INTEGER_DIGITS: 10,
  // Max digits allowed in a Qty input. Qty is a whole number, so unlike the
  // price cap there is no decimal part to exclude. Read through
  // `exceedsQtyDigitCap` by every qty handler.
  MAX_QTY_DIGITS: 9,
  // Max characters for the line-item Name input (backend `item_name` column
  // cap). Applied as `maxLength` on the shared row so typing AND pasting
  // truncate at the limit.
  MAX_ITEM_NAME_CHARS: 255,
} as const;

// True when the integer (pre-decimal) part of an already format-validated
// numeric string exceeds the price digit cap. Rate handlers call this to
// reject the keystroke, so the field can never hold a value wider than the
// cap. Decimal places don't count toward the limit.
export function exceedsPriceDigitCap(cleaned: string): boolean {
  const integerDigits = cleaned.split(".")[0].length;
  return integerDigits > LINE_ITEM_LIMITS.MAX_PRICE_INTEGER_DIGITS;
}

// True when an already format-validated whole-number qty string exceeds the
// qty digit cap. Qty handlers call this to reject the keystroke, so the field
// can never hold a value wider than the cap.
export function exceedsQtyDigitCap(cleaned: string): boolean {
  return cleaned.length > LINE_ITEM_LIMITS.MAX_QTY_DIGITS;
}

// Truncate (rather than reject) an over-long numeric string to the price
// digit cap — used on paste, where dropping the whole value would read as
// "nothing happened". Keeps the first MAX_PRICE_INTEGER_DIGITS integer
// digits; the decimal part is preserved untouched.
export function clampPriceDigits(cleaned: string): string {
  const [int, dec] = cleaned.split(".");
  const clampedInt = int.slice(0, LINE_ITEM_LIMITS.MAX_PRICE_INTEGER_DIGITS);
  return dec != null ? `${clampedInt}.${dec}` : clampedInt;
}

// Truncate (rather than reject) an over-long qty string to the qty digit
// cap — paste counterpart of `exceedsQtyDigitCap`.
export function clampQtyDigits(cleaned: string): string {
  return cleaned.slice(0, LINE_ITEM_LIMITS.MAX_QTY_DIGITS);
}
