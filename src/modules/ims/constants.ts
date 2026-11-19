import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { PAGINATION } from "@/shared/constants";

// Per Coding-guideline §16.6 — single page-size knob for the whole module.
// Drives both the API request and the table footer's onPageChange behaviour.
// All IMS list pages must read from this constant; no inline literals.
// Derived from the project default so page-size changes flow from one knob.
// Typed as `number` (not the literal value) so `useState(IMS_PAGE_SIZE)` can
// accept any page-size value when the operator picks a different size.
export const IMS_PAGE_SIZE: number = PAGINATION.DEFAULT_PAGE_SIZE;

// Max length of a list-search query for IMS list endpoints. Mirrors the backend
// `Query(min_length=2, max_length=100)` on every IMS `search` param
// (app/modules/ims/api/v1/endpoints.py) — the FE clamps to this before it hits
// the API so a long paste/crafted URL can't 422. Distinct
// from the app-wide UI.SEARCH_MAX_LENGTH (255), which is the WMS `q` limit.
export const IMS_SEARCH_MAX_LEN = 100;

// Stock-item lifecycle statuses — the full `ck_stock_items_status` CHECK set
// (app/modules/ims/models/stock_item.py). Drives the inventory "Status" column
// label + the inventory status filter on the Part / Variant detail pages.
// §16.12: enum display lives in a module label map, not inline strings.
export const STOCK_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  in_transit: "In transit",
  consumed: "Consumed",
  damaged: "Damaged",
  // Condemned: unrepairable and unsellable, but still physically on its shelf
  // and still occupying its slot (device-scrap D1). Reversible by the store
  // manager until disposal, which is the irreversible step. This map also
  // feeds STOCK_STATUS_OPTIONS, so the inventory status filter gets the
  // option for free.
  scrapped: "Scrapped",
  disposed: "Disposed",
  dismantled: "Dismantled",
  installed: "Installed",
  // Set at both inward doors, cleared by terminal rack-assign. Users should
  // rarely SEE this word: whenever a unit is in the pipeline it also carries a
  // `workflow_status`, and `stockDisplayStatus` shows that stage instead
  // ("In Repair", "Under QC", …). This label is the fallback for the window
  // where a unit is in_operations with no stage set.
  in_operations: "In operations",
  issued: "Issued",
  // Outbound: the unit has left the warehouse on a dispatch. A real
  // `ck_stock_items_status` value (stock_item.py) and already surfaced as a
  // "Dispatched" quick-stat, so it belongs in the inventory status filter too
  // Ordered next to `issued` to mirror the backend's status list.
  dispatched: "Dispatched",
  pending_return: "Pending return",
  returned_to_vendor: "Returned to vendor",
  // A unit marked lost while on a warehouse transfer (transfer "mark lost").
  // A real `ck_stock_items_status` value, so it belongs in the inventory
  // status filter + display. Ordered last to mirror the backend status list.
  lost_in_transit: "Lost in transit",
};

export const STOCK_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => ({ value, label }));

// Statuses actually reachable on a stock row today — the subset offered in the
// inventory "Status" filter (Part + Variant detail). The unused buckets
// (dismantled, consumed, returned_to_vendor) are dropped so operators aren't
// offered filters that match nothing. Installed (a component inside a device)
// and Disposed are reachable now, so they are offered.
// "damaged" is also dropped from the filter on request — it stays in
// STOCK_STATUS_LABELS for DISPLAY, it is just not an offered filter option.
// Derived from STOCK_STATUS_OPTIONS so labels stay single-sourced and the
// backend's status ordering is preserved.
const STOCK_STATUS_FILTER_VALUES: ReadonlySet<string> = new Set([
  "available",
  "reserved",
  "in_transit",
  "in_operations",
  "issued",
  "dispatched",
  "pending_return",
  "lost_in_transit",
  "installed",
  "disposed",
  // Condemned stock. Reachable from the moment the scrap feature ships, so it
  // IS an offered filter — unlike the terminal/unused buckets above it, which
  // are dropped because they would match nothing. A store manager needs to
  // answer "how much dead stock are we holding?" and this is the filter that
  // answers it (device-scrap D4: the meaning lives in the STATUS, not in a
  // location's name).
  "scrapped",
]);

export const STOCK_STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  STOCK_STATUS_OPTIONS.filter((o) => STOCK_STATUS_FILTER_VALUES.has(o.value));

// WMS ops-pipeline stages (`ck_stock_items_workflow_status_values`). A unit in
// the pipeline is physically `status='available'` but not yet racked/QC'd, so
// the inventory shows its pipeline STAGE instead of "Available". Mirrors the WMS
// device labels (kept module-local so IMS doesn't reach into WMS internals).
export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending_inspection: "Pending Inspection",
  under_inspection: "Under Inspection",
  inspected: "Inspected",
  in_repair: "In Repair",
  // The device is out at a third-party service vendor. Reads as SERVICE WORK,
  // not "the unit is gone": what physically left is usually a component (a
  // display panel, a battery) while the laptop itself sits on the bench — the
  // vendor-services spec calls this out as "a laptop whose battery is still at
  // the lab". A device can also enter this from inspection or QC, not only
  // repair, so the label stays stage-neutral.
  //
  // This key was MISSING and `in_paint` was here in its place: the
  // vendor-services migration renamed in_paint -> at_external_vendor in the DB
  // and the backend, and these maps were never updated. Every device with a
  // part at a vendor rendered the raw string "at_external_vendor" through the
  // `?? workflowStatus` fallback, on the device header AND every IMS surface.
  at_external_vendor: "In Vendor Service",
  waiting_for_spares: "Waiting for Spares",
  pending_qc: "Pending QC",
  under_qc: "Under QC",
  awaiting_rack: "Awaiting Rack",
  pending_return: "Pending Return",
  returned_to_vendor: "Returned to Vendor",
};

const WORKFLOW_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  pending_inspection: "warning",
  under_inspection: "info",
  inspected: "success",
  in_repair: "warning",
  at_external_vendor: "info",
  waiting_for_spares: "warning",
  pending_qc: "warning",
  under_qc: "info",
  awaiting_rack: "neutral",
  pending_return: "warning",
  returned_to_vendor: "error",
};

function physicalStatusVariant(status: string): StatusBadgeVariant {
  if (status === "available") return "success";
  if (status === "reserved") return "warning";
  if (
    status === "damaged" ||
    status === "scrapped" ||
    status === "disposed" ||
    status === "lost_in_transit"
  )
    return "error";
  // Physically present, deliberately not sellable — the same reading as the
  // pipeline stages it stands in for.
  if (status === "in_operations") return "warning";
  return "neutral";
}

/**
 * Inventory status badge for a stock unit. A unit inside the WMS ops pipeline
 * (`workflow_status` set) shows its STAGE — "Pending Inspection", "In Repair",
 * "Awaiting Rack", … — because a just-inwarded unit is `status='available'`
 * long before it's actually available for dispatch. Once it exits the pipeline
 * (`workflow_status` null), the physical status is shown.
 */
export function stockDisplayStatus(
  status: string,
  workflowStatus?: string | null,
  vendorPriorStatus?: string | null,
  vendorSectionNames?: readonly string[] | null,
): { label: string; variant: StatusBadgeVariant } {
  if (workflowStatus) {
    // A unit at a vendor keeps working its real stage. What physically left is
    // usually a COMPONENT — a display panel, a battery — while the unit sits on
    // the bench, so "In Vendor Service" alone reads as though it is gone. Show
    // the stage it was actually in, with the vendor trip as a qualifier.
    // `vendorPriorStatus` is set by the backend only while the device is held,
    // and is the exact value it will be restored to when the last item returns.
    if (workflowStatus === "at_external_vendor" && vendorPriorStatus) {
      // Name the section(s) the unit is actually out to — "In Repair · Display
      // Repair" — so the operator knows WHICH job is holding it. Several
      // sections at once is a normal case (a bad screen AND a dead battery),
      // so they are listed. Falls back to a generic qualifier if the sections
      // are unavailable (an older deploy, or the jobs already closed).
      const where =
        vendorSectionNames && vendorSectionNames.length > 0
          ? vendorSectionNames.join(", ")
          : "At Vendor";
      return {
        label: `${WORKFLOW_STATUS_LABELS[vendorPriorStatus] ?? vendorPriorStatus} · ${where}`,
        variant: WORKFLOW_STATUS_VARIANT[vendorPriorStatus] ?? "info",
      };
    }
    return {
      label: WORKFLOW_STATUS_LABELS[workflowStatus] ?? workflowStatus,
      variant: WORKFLOW_STATUS_VARIANT[workflowStatus] ?? "info",
    };
  }
  return {
    label: STOCK_STATUS_LABELS[status] ?? status,
    variant: physicalStatusVariant(status),
  };
}
