import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// What a rental-return scan turned out to be (return-by-count spec §5),
// keyed on the backend's RENTAL_SCAN_* literals. Only `accepted` books
// stock; every other kind is held and becomes an inward exception (§8).

export type RentalScanKind =
  | "accepted"
  | "other_account"
  | "not_on_rent"
  | "legacy_unit"
  | "serial_less_candidate"
  | "foreign"
  | "duplicate_unit"
  | "not_requested"

export const RENTAL_SCAN_KIND_LABEL: Record<RentalScanKind, string> = {
  accepted: "Accepted",
  other_account: "On rent to another customer",
  not_on_rent: "Ours, not out on rent",
  legacy_unit: "No dispatch record",
  serial_less_candidate: "Maybe a unit sent without a serial",
  foreign: "Not our unit",
  duplicate_unit: "Serial on two units",
  not_requested: "On rent, not on this return",
}

export const RENTAL_SCAN_KIND_VARIANT: Record<RentalScanKind, StatusBadgeVariant> = {
  accepted: "success",
  other_account: "warning",
  not_on_rent: "warning",
  legacy_unit: "info",
  serial_less_candidate: "info",
  foreign: "error",
  duplicate_unit: "error",
  not_requested: "warning",
}

export function isHeldScan(kind: string): boolean {
  return kind !== "accepted"
}
