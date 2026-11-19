import type { ErrorDetail } from "./envelope";

// Operator-facing names for request fields whose raw API name reads badly
// ("min_deal_value"). Anything not listed falls back to a humanized snake_case
// ("lead_value" → "Lead value").
const FIELD_LABELS: Record<string, string> = {
  // One query param serves both the Leads and Deals filters, so stay neutral.
  min_deal_value: "Value (min)",
  max_deal_value: "Value (max)",
  min_quote_value: "Quote value (min)",
  max_quote_value: "Quote value (max)",
  min_total: "Total (min)",
  max_total: "Total (max)",
};

function humanizeField(field: string): string {
  // `body.items.0.qty` → "qty"; the last path segment is the one the user edits.
  const last = field.split(".").filter(Boolean).pop() ?? field;
  const known = FIELD_LABELS[last];
  if (known) return known;
  const spaced = last.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function firstNumber(text: string): string | undefined {
  return text.match(/-?\d+(?:\.\d+)?/)?.[0];
}

/**
 * One readable sentence for a field-scoped validation error, e.g.
 *   { field: "min_deal_value", code: "decimal_max_digits",
 *     message: "Decimal input should have no more than 14 digits in total" }
 *   → "Deal value (min) can have at most 14 digits in total."
 *
 * Common pydantic codes get a plain-English rewrite; anything else keeps the
 * server's own wording behind a humanized field name, so no message is lost.
 */
export function describeFieldError(detail: ErrorDetail): string {
  if (!detail.field) return detail.message;
  const label = humanizeField(detail.field);
  const n = firstNumber(detail.message);
  switch (detail.code) {
    case "decimal_max_digits":
      return n ? `${label} can have at most ${n} digits in total.` : `${label} is too long.`;
    case "decimal_max_places":
      return n ? `${label} can have at most ${n} decimal places.` : `${label} has too many decimals.`;
    case "less_than_equal":
      return n ? `${label} must be at most ${n}.` : `${label} is too large.`;
    case "less_than":
      return n ? `${label} must be less than ${n}.` : `${label} is too large.`;
    case "greater_than_equal":
      return n ? `${label} must be at least ${n}.` : `${label} is too small.`;
    case "greater_than":
      return n ? `${label} must be greater than ${n}.` : `${label} is too small.`;
    default:
      return `${label}: ${detail.message}`;
  }
}
