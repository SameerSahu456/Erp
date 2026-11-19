// Single source of truth for the Source dropdown on both the Lead and Deal
// forms (DEAL_SOURCES re-exports this — see dealForm.constants.ts). The field
// stays free text, so the form unions this list with any current value.
export const LEAD_SOURCES = [
  "Email",
  "Whatsapp",
  "Chat",
  "Website",
  "Call",
  "Indiamart",
  "Rent with Rentr",
  "Lease with Rentr",
  "Build your own",
  "Host with Rentr",
  "Can't find what you are looking for?",
  "Request Support",
  "Can't find what you're seeking Reach out",
  "Justdial",
  "LinkedIn",
  "Google Ads",
  "Alibaba",
  "Get free Consultation",
  "Meta",
  "Rental Hire",
  "Get Offer",
  "Bulk Order - Serverstore",
  "source-test",
  "Others",
] as const
// Display labels for source values whose stored value differs from what the
// user should see. Anything not listed here is shown as its raw value.
export const LEAD_SOURCE_LABELS: Readonly<Record<string, string>> = {
  "source-test": "Source Test",
}
export const sourceLabel = (value: string): string => LEAD_SOURCE_LABELS[value] ?? value

// Row shape for the searchable Source pickers (AsyncSelect + makeStaticAsyncOptions).
export interface LeadSourceOption {
  id: string
  name: string
}
export const toLeadSourceOption = (value: string): LeadSourceOption => ({
  id: value,
  name: sourceLabel(value),
})
// Match on both the display label and the stored value ("Source Test" / "source-test").
export const leadSourceSearchText = (option: LeadSourceOption): string =>
  `${option.name} ${option.id}`
export const COMPANY_SIZES = ["Startup", "SMB", "Mid-Market", "Large Enterprise"] as const
export const NONE_VALUE = "__none__"

export function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function parseNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
