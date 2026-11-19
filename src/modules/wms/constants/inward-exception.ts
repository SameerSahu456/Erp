import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Inward-exception display maps (return-by-count spec §8), keyed on the
// backend's INWARD_EXCEPTION_* literals. The `kind` is the scan
// classification — see constants/rental-scan.ts.

export type InwardExceptionStatus = "open" | "linked" | "voided" | "returning" | "returned"

export const INWARD_EXCEPTION_STATUS_LABEL: Record<InwardExceptionStatus, string> = {
  open: "Open",
  linked: "Linked to a rental unit",
  voided: "Voided",
  returning: "On its way back",
  returned: "Returned to customer",
}

export const INWARD_EXCEPTION_STATUS_VARIANT: Record<InwardExceptionStatus, StatusBadgeVariant> = {
  open: "warning",
  linked: "success",
  voided: "neutral",
  returning: "info",
  returned: "success",
}

export type ReturnMethod = "next_trip" | "courier"

export const RETURN_METHOD_LABEL: Record<ReturnMethod, string> = {
  next_trip: "On our next trip",
  courier: "By courier (customer pays)",
}

export const RETURN_METHOD_OPTIONS = [
  { value: "next_trip", label: RETURN_METHOD_LABEL.next_trip },
  { value: "courier", label: RETURN_METHOD_LABEL.courier },
] as const

/** What a person can do with an exception, by its kind (§8). A box that is
 *  not ours cannot be voided — it goes back; a unit not out on rent cannot
 *  be linked to a rental. */
export const EXCEPTION_ACTIONS_BY_KIND: Record<string, readonly ("link" | "void" | "return")[]> = {
  other_account: ["link", "void", "return"],
  not_on_rent: ["void", "return"],
  legacy_unit: ["link", "void", "return"],
  serial_less_candidate: ["link", "void", "return"],
  foreign: ["return"],
  duplicate_unit: ["link", "void", "return"],
  // The return named other units: this one is not taken — it goes back, or
  // a return is raised for it.
  not_requested: ["void", "return"],
}
