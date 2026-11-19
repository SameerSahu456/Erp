/** The client-side cadence rule's messages (`validateCadence`, §16.12). */
export const CADENCE_VALIDATION_STRINGS = {
  customDaysRequired: "An interval in days is required for a custom cycle.",
  billingDayRequired: "A billing day is required.",
  billingDayRange: (min: number, max: number) => `The billing day must be between ${min} and ${max}.`,
  billIssueDayRange: (min: number, max: number) => `The bill issue day must be between ${min} and ${max}.`,
  billingGraceRange: (min: number, max: number) =>
    `Billing grace must be a whole number between ${min} and ${max} days.`,
  returnGraceRange: (min: number, max: number) =>
    `Return days must be a whole number between ${min} and ${max}.`,
  cycleLongerThanPeriod: (periodDays: number) =>
    `The billing cycle is longer than the rental period (${periodDays} days). Choose a cycle equal to or shorter than the period.`,
} as const;
