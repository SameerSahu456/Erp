export const RENTAL_ORDER_NUMBER_TAG_STRINGS = {
  label: "Rental",
  // The SO number rides in the hover hint only — the row already shows it
  // (2026-11-16: "Rental · SO-…" repeated the number beside itself).
  hint: (orderNumber: string) => `For rental order ${orderNumber}`,
} as const;
