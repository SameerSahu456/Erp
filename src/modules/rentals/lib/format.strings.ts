/** Copy the rentals formatters return (§16.12, §6.9.5 — lib never imports components). */
export const FORMAT_STRINGS = {
  everyNDays: (days: number) => `Every ${days} days`,
  // One label everywhere (2026-10-29) — before dispatch the figure is the
  // sales order's, after it the live units', but it is always the rent.
  monthlyRate: "Monthly rent",
} as const;
