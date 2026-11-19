// Where a device component stands in the contents check after a PO inward or a
// return (comprint-erp-docs/modules/wms/component-tracking/ — inward-verification
// D1-D7, dispatch-return-replacement D4/D5). One label + badge tone per state, used by every view that lists a
// device's components (Coding-guideline §16.12.2).
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import type { StockItemComponent } from "@modules/ims";

export const COMPONENT_CHECK_STATE_LABELS = {
  due: "Check needed",
  missing: "Missing",
  unidentified: "Part to be identified",
} as const;

export type ComponentCheckState = keyof typeof COMPONENT_CHECK_STATE_LABELS;

export const COMPONENT_CHECK_STATE_VARIANT: Record<ComponentCheckState, StatusBadgeVariant> = {
  due: "warning",
  missing: "error",
  unidentified: "info",
};

/** Persisted by the backend when a component is marked missing
 *  (SIC_REMOVED_MISSING_ON_RETURN / SIC_REMOVED_MISSING_ON_INWARD). */
const REMOVED_MISSING_ON_RETURN = "missing_on_return";
const REMOVED_MISSING_ON_INWARD = "missing_on_inward";
/** Marked missing outside a check (SIC_REMOVED_MISSING_FROM_DEVICE). */
const REMOVED_MISSING_FROM_DEVICE = "missing_from_device";

/** A row added or pulled by hand on the device page (COMPONENT_EVENT_MANUAL_ADJUSTMENT). */
const MANUAL_ADJUSTMENT = "manual_adjustment";
/** How a row can be added on the device page — by hand (older rows) or through
 *  "Add component" (SIC_SOURCE_FOUND_ON_*). */
const ADDED_ON_DEVICE_PAGE = new Set([MANUAL_ADJUSTMENT, "found_on_inspection", "found_on_return"]);

/** Pulled out on the device page — "Add back" can undo it. */
export function isPulledOut(c: StockItemComponent): boolean {
  return c.removed_event_type === MANUAL_ADJUSTMENT && !!c.result_stock_item_id;
}

/** Still inside, and added on the device page — can be undone as a mistake. */
export function isAddedByHand(c: StockItemComponent): boolean {
  return !c.removed_at && !c.result_stock_item_id && ADDED_ON_DEVICE_PAGE.has(c.source_event_type);
}

/** Why a row is due — decides what "missing" means (inward-verification D6). */
export const VERIFICATION_REASON_INWARD = "inward";

/** Due from the inward or return until checked — mirrors the backend's is_due_for_verification. */
export function isDueForCheck(c: StockItemComponent): boolean {
  if (!c.verification_due_at || c.removed_at) return false;
  // Parsed, not compared as strings: ISO timestamps with and without
  // fractional seconds do not sort lexically.
  return !c.verified_at || Date.parse(c.verified_at) < Date.parse(c.verification_due_at);
}

export function isMarkedMissing(c: StockItemComponent): boolean {
  return (
    c.removed_event_type === REMOVED_MISSING_ON_RETURN ||
    c.removed_event_type === REMOVED_MISSING_ON_INWARD ||
    c.removed_event_type === REMOVED_MISSING_FROM_DEVICE
  );
}

/** A part listed by the supplier that never arrived (vs. kept by a customer). */
export function isMissingOnInward(c: StockItemComponent): boolean {
  return c.removed_event_type === REMOVED_MISSING_ON_INWARD;
}

/** Every state that applies — a component can be both unidentified and due. */
export function componentCheckStates(c: StockItemComponent): ComponentCheckState[] {
  const states: ComponentCheckState[] = [];
  if (isMarkedMissing(c)) states.push("missing");
  if (isDueForCheck(c)) states.push("due");
  if (!c.part_variant_id) states.push("unidentified");
  return states;
}

/** Device statuses that freeze its components on the device page — it is not
 *  physically with us (mirrors the backend DEVICE_COMPONENTS_LOCKED_STATUSES). */
const DEVICE_AWAY_STATUSES = new Set([
  "dispatched",
  "issued",
  "returned_to_vendor",
  "pending_return",
  "lost_in_transit",
  "in_transit",
  "missing",
  "scrapped",
  "consumed",
  "disposed",
  "dismantled",
]);

/** True when the device is away (dispatched, issued, at the vendor…), so its
 *  components cannot be added, checked or removed until it is back. */
export function isDeviceAway(status: string | null | undefined): boolean {
  return !!status && DEVICE_AWAY_STATUSES.has(status);
}
