// Display labels for the location-layout screen's enum-like values:
//   - occupancy tone (empty / healthy / filling / full) → legend label
//   - stock-item status → operator label + badge tone
//
// Coding-guideline §16.12: enum/status labels live in a shared `constants/`
// record, never hardcoded ("naked") in the derivation helpers or components.
// `locationModel.ts` reads these to build its TONE + STOCK_STATUS maps.

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type { UtilTone } from "../components/locations/locationModel";

/** Occupancy tone → legend label. */
export const UTIL_TONE_LABELS: Record<UtilTone, string> = {
  empty: "Empty",
  healthy: "In use",
  filling: "Filling",
  full: "Full",
};

// stock_items.status values a unit sitting in a rack or bin can carry; they are
// also the contents table's Status filter. Anything else falls back to a neutral
// badge (see locationModel `STOCK_STATUS`) so a new status can't crash a row.
export const STOCK_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  // A device in the inspection / repair / QC pipeline while parked in a slot.
  in_operations: "In operations",
  reserved: "Reserved",
  pending_return: "Pending return",
  returned_to_vendor: "Returned to vendor",
  consumed: "Consumed",
  damaged: "Damaged",
  // Condemned but still physically here, still occupying this slot
  // (device-scrap D1/D3) — which is exactly why it must appear on the
  // location-layout screen rather than reading as an empty shelf.
  scrapped: "Scrapped",
  disposed: "Disposed",
};

export const STOCK_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  available: "success",
  in_operations: "info",
  reserved: "info",
  pending_return: "warning",
  returned_to_vendor: "neutral",
  consumed: "neutral",
  damaged: "warning",
  scrapped: "error",
  disposed: "error",
};
