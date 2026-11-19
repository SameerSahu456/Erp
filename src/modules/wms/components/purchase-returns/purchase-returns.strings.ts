// User-facing copy for the WMS › Purchase Return (return-to-vendor) sub-feature.
// Coding-guideline §16.12 (bucket 1): titles, labels, hints, empty/error text,
// and dialog/toast copy live here as one typed `as const` object rather than
// being hardcoded in JSX. Dynamic copy is expressed as functions.

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type { PurchaseReturnItemCreate, PurchaseReturnStatus } from "../../api";

// Single source for the reason_code enum shown in the form's reason picker.
// The union is generated from the backend OpenAPI schema
// (PurchaseReturnItemCreate.reason_code); `satisfies` pins this const array to
// that union, so a backend enum change that drops a value fails typecheck here
// rather than drifting silently. Runtime iteration needs the array — a TS
// union can't be enumerated at runtime — so this is the single const the form
// and bulk bar both read.
export type ReturnReasonCode = PurchaseReturnItemCreate["reason_code"];

export const RETURN_REASON_CODES = [
  "damaged_in_transit",
  "dead_on_arrival",
  "wrong_item",
  "wrong_config",
  "not_as_specified",
  "failed_inspection",
  "other",
] as const satisfies readonly ReturnReasonCode[];

export const RETURN_REASON_LABELS: Record<ReturnReasonCode, string> = {
  damaged_in_transit: "Damaged in transit",
  dead_on_arrival: "Dead on arrival",
  wrong_item: "Wrong item",
  wrong_config: "Wrong configuration",
  not_as_specified: "Not as specified",
  failed_inspection: "Failed inspection",
  other: "Other",
};

/** Reason options for the bulk bar / per-row picker, in display order. */
export const RETURN_REASON_OPTIONS = RETURN_REASON_CODES.map((value) => ({
  value,
  label: RETURN_REASON_LABELS[value],
}));

// Physical stock-item status shown on the returnable-units list. `status` is an
// open-ended backend string, so an unmapped value falls back to a neutral badge
// (§0.8) and the raw value as its own label.
export const RETURNABLE_UNIT_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  in_transit: "In transit",
  in_operations: "In operations",
  pending_return: "Pending return",
  damaged: "Damaged",
};

export const RETURNABLE_UNIT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  available: "success",
  reserved: "warning",
  in_transit: "info",
  in_operations: "warning",
  pending_return: "warning",
  damaged: "error",
};

// Shared by the card header and the bulk bar.
const unitsSelected = (n: number) => `${n} unit${n === 1 ? "" : "s"} selected`;

export const PURCHASE_RETURN_STRINGS = {
  title: "Raise Purchase Return",
  subtitle:
    "Send serialized units received on a PO back to the vendor. Pick the units and give each a reason; procurement decides replace or refund later.",
  breadcrumbs: { wms: "WMS", purchaseReturns: "Purchase Returns", new: "New" },
  sourceSection: "Return Source",
  poPicker: "Purchase Order",
  poPickerPlaceholder: "Select a purchase order…",
  headerNotes: "Notes",
  headerNotesPlaceholder: "Optional notes for procurement / the vendor",
  cancel: "Cancel",

  // Unit table
  table: {
    unitsTitle: "Units Received on This PO",
    selectPoTitle: "Select a purchase order",
    selectPoFirst: "Select a purchase order to list its received units.",
    loading: "Loading units…",
    error: "Couldn't load the units for this PO.",
    emptyTitle: "No units to return",
    empty: "No serialized units were received on this PO.",
    selectUnitAria: (serial: string) => `Select ${serial}`,
    selectAllAria: "Select all returnable units",
    columns: {
      barcode: "Barcode",
      mfrSerial: "Mfr Serial",
      part: "Part",
      variant: "Variant",
      grnBatch: "GRN Batch",
      received: "Received",
      status: "Status",
    },
    // Line-item search + status filter toolbar.
    searchPlaceholder: "Search by serial, part or GRN",
    clearSearch: "Clear search",
    allStatuses: "All statuses",
    // Live count shown in the toolbar corner so the total is always visible.
    unitCount: (shown: number, total: number) =>
      shown === total
        ? `${total} ${total === 1 ? "unit" : "units"}`
        : `${shown} of ${total} units`,
    reasonPlaceholder: "Reason…",
    notesPlaceholder: "Notes",
    modifiedMarker: "modified",
    modifiedTitle: "Edited individually after the last bulk apply.",
  },

  // Bulk bar
  bulk: {
    reasonPlaceholder: "Reason…",
    notesPlaceholder: "Notes (optional)",
    // Disabled-Apply why-tooltip (§0.9): the bar collects a reason, so the only
    // unmet gate is a reason not yet chosen (rows are always selected here).
    needsReason: "Pick a reason to apply to the selected units.",
    apply: (n: number) => `Apply to all ${n}`,
    selectedCount: unitsSelected,
  },
  selectedCount: unitsSelected,
  // Overwrite-edited-rows confirm (bulk apply after individual edits).
  bulkClobberWarning:
    "Some rows were edited individually. Applying to all will overwrite those edits.",
  bulkClobberTitle: "Overwrite edited rows?",
  bulkClobberConfirm: "Overwrite",
  bulkClobberKeep: "Keep edits",
  // Change-PO confirm (clears the current unit selection).
  changePoWarning:
    "Changing the purchase order clears the units you've selected.",
  changePoTitle: "Change purchase order?",
  changePoConfirm: "Change PO",
  changePoKeep: "Keep units",
  // Deep-link toast: some carried units are no longer returnable.
  unitsSkipped: (n: number) =>
    `${n} unit${n === 1 ? " was" : "s were"} skipped because they are no longer returnable.`,
  blockedHint: (reason: string) => `Not returnable — ${reason}`,
  otherNeedsNotes: "Add a note explaining the reason.",

  // Logistics (disabled on the raise form)
  logistics: {
    title: "Logistics",
    locked: "Available once procurement has decided every unit.",
  },

  // Summary + submit
  unitsReturned: (n: number) => `${n} unit${n === 1 ? "" : "s"} returned`,
  awaitingDecision: (n: number) =>
    `${n} unit${n === 1 ? "" : "s"} awaiting procurement's decision`,
  raiseButton: (n: number) => (n > 0 ? `Raise Return (${n})` : "Raise Return"),
  raiseWarning: (n: number) =>
    `Raising removes ${n} unit${n === 1 ? "" : "s"} from stock immediately.`,
  created: "Purchase return raised.",

  // Client-side guard toasts
  guard: {
    noUnits: "Select at least one unit to return.",
    missingReason: "Every selected unit needs a reason.",
    missingNotes: "Every unit with reason “Other” needs a note.",
  },
} as const;

// ── Shared lifecycle vocabulary (one source for list + detail) ───────────────

export const PURCHASE_RETURN_STATUS_LABELS: Record<PurchaseReturnStatus, string> = {
  raised: "Raised",
  // Some units are with the vendor and some are still on the dock — the state
  // an operator most needs to spot at a glance on a multi-consignment return.
  partially_dispatched: "Partially dispatched",
  dispatched: "Dispatched",
  closed: "Closed",
  cancelled: "Cancelled",
};

// A `raised` return whose units are all decided (undecided_count === 0) but not
// yet shipped is waiting on the warehouse to dispatch it — the wire status
// "Raised" undersells that, so we surface "Pending Dispatch" instead. The first
// consignment flips the wire status to `partially_dispatched`, so this label
// only ever fires while the return is still `raised`. Display-only:
// the wire status is unchanged and the badge keeps `raised`'s variant.
export const PURCHASE_RETURN_PENDING_DISPATCH_LABEL = "Pending Dispatch";

// The single source for the status label BOTH the list cell and the detail
// header render, so the "Pending Dispatch" derivation can never show on one
// screen and not the other. `undecidedCount` is the return's `undecided_count`.
export function getPurchaseReturnStatusLabel(
  status: PurchaseReturnStatus,
  undecidedCount: number,
): string {
  if (status === "raised" && undecidedCount === 0) {
    return PURCHASE_RETURN_PENDING_DISPATCH_LABEL;
  }
  return PURCHASE_RETURN_STATUS_LABELS[status];
}

export const PURCHASE_RETURN_STATUS_VARIANT: Record<PurchaseReturnStatus, StatusBadgeVariant> = {
  raised: "warning",
  // Deliberately distinct from both neighbours: "partly gone" is not "here"
  // and not "gone".
  partially_dispatched: "warning",
  dispatched: "info",
  closed: "success",
  cancelled: "neutral",
};

export const PURCHASE_RETURN_ITEM_DISPATCH_LABELS: Record<string, string> = {
  pending: "On the dock",
  dispatched: "With vendor",
  cancelled: "Cancelled",
};

export const PURCHASE_RETURN_ITEM_DISPATCH_VARIANT: Record<string, StatusBadgeVariant> = {
  pending: "warning",
  dispatched: "info",
  cancelled: "neutral",
};

export type PurchaseReturnSettlementStatus = "pending" | "settled" | "waived";

export const SETTLEMENT_STATUS_LABELS: Record<PurchaseReturnSettlementStatus, string> = {
  pending: "Pending",
  settled: "Settled",
  waived: "Waived",
};

// How a refund was settled — matches the backend PurchaseReturnSettlementMode
// literal. Shared by the settle dialog and the detail row's settlement column.
export const SETTLEMENT_MODE_LABELS: Record<string, string> = {
  cash_refund: "Cash refund",
  credit_note: "Credit note",
  adjusted_against_invoice: "Adjusted against invoice",
};

// ── List screen ──────────────────────────────────────────────────────────────

export const PURCHASE_RETURNS_LIST_STRINGS = {
  title: "Purchase Returns",
  subtitle: "Units sent back to vendors: procurement decisions, dispatch, and credit settlement.",
  newButton: "New Purchase Return",
  searchPlaceholder: "Search by return, PO, or vendor…",
  breadcrumbs: { wms: "WMS", purchaseReturns: "Purchase Returns" },
  tabs: { all: "All" },
  filters: {
    po: "PO",
    allPos: "All POs",
    vendor: "Vendor",
    allVendors: "All vendors",
  },
  columns: {
    pretNumber: "PRET Number",
    po: "Purchase Order",
    vendor: "Vendor",
    units: "Units",
    status: "Status",
    awaiting: "Awaiting Decision",
    creditPending: "Credit Pending",
    created: "Created",
  },
  loading: "Loading purchase returns…",
  error: "Couldn't load purchase returns.",
  empty: {
    title: "No purchase returns",
    description: "Returns you raise against a vendor PO will show up here.",
  },
  // Lifecycle status counts + the operational KPIs (units still needing a
  // decision, vendor credit owed). "All" is the sum of the four live states.
  // (The "Open Returns" rollup tile was removed.)
  kpis: {
    all: "All Returns",
    raised: "Raised",
    dispatched: "Dispatched",
    closed: "Closed",
    cancelled: "Cancelled",
    awaiting: "Units Awaiting Decision",
    creditPending: "Credit Pending",
  },
} as const;

// ── Detail screen ────────────────────────────────────────────────────────────

export const PURCHASE_RETURN_DETAIL_STRINGS = {
  title: "Purchase return",
  loading: "Loading purchase return…",
  error: "Couldn't load purchase return.",
  notFoundTitle: "Purchase return not found",
  notFoundDescription: "It may have been cancelled, or the link is out of date.",
  dispatch: "Dispatch",
  dispatchBlocked: (n: number) =>
    `${n} unit${n === 1 ? " is" : "s are"} still awaiting a disposition decision.`,
  allDispatched: "Every unit on this return has already been dispatched.",
  noWarehouse:
    "This return has no warehouse recorded, so a consignment cannot be raised.",
  meta: {
    vendor: "Vendor",
    purchaseOrder: "Purchase Order",
    // Clicking the PO number without PO read access.
    poNoAccess: "You don't have permission to access this Purchase Order.",
    raisedBy: "Raised By",
    raisedOn: "Raised On",
    notes: "Notes",
  },
  sections: {
    overview: "Return Details",
    consignments: "Consignments",
  },
  // A return ships on one or more consignments. Without this panel the only
  // evidence a shipment happened was the per-unit "Dispatched" badge.
  consignments: {
    columns: {
      number: "Consignment",
      status: "Status",
      dispatched: "Dispatched",
      awb: "AWB",
      driver: "Driver",
      expectedDelivery: "Expected Delivery",
      returnAddress: "Return address",
    },
    empty: "Nothing has shipped on this return yet.",
    error: "Could not load this return's consignments.",
    retry: "Retry",
    notDispatched: "—",
  },
  stats: {
    units: "Units",
    unitsSub: (replace: number, refund: number) => `${replace} replace · ${refund} refund`,
    replaced: "Replaced Units",
    refunded: "Refunded Units",
    awaiting: "Awaiting Decision",
    awaitingSub: "replace or refund",
    creditValue: "Credit Value",
    creditValueSub: "total if all refunded",
    creditPending: "Credit Pending",
    creditPendingSub: "decided, not yet settled",
  },
  units: {
    title: "Returned Units",
    awaiting: (n: number) => `${n} awaiting decision`,
    // Line-item search + status filter toolbar. One filter per status
    // axis: whereabouts (dispatch), disposition, and settlement.
    searchPlaceholder: "Search by serial, part or reason",
    // The Reason cell's expand control (full note opens in a row below).
    toggleReason: (open: boolean) => (open ? "Hide full reason" : "Show full reason"),
    allDispositions: "All dispositions",
    noMatch: "No units match your search.",
    // Sub-line under the no-match title, mirroring the listing pages' empty state.
    noMatchHint: "Try clearing the search or adjusting the filters to see more units.",
    // No-match empty-state reset buttons, shown per active facet.
    clearSearch: "Clear search",
    clearFilters: "Clear filters",
    // Live count shown in the toolbar corner so the total is always visible.
    unitCount: (shown: number, total: number) =>
      shown === total
        ? `${total} ${total === 1 ? "unit" : "units"}`
        : `${shown} of ${total} units`,
    disposition: "Disposition",
    applyToSelected: (n: number) => `Apply to ${n} selected`,
    rejectSelected: "Reject selected",
    // Disabled bulk-action why-tooltips (§0.9), named to the first unmet gate.
    // Shared by Apply-to-selected and Reject-selected (both need a selection).
    pickDisposition: "Pick a disposition to apply.",
    selectUndecided: "Select at least one undecided unit.",
    // A named checkbox, never a bare serial, for a screen reader (§0.15/§14).
    selectUnitAria: (serial: string) => `Select ${serial}`,
    selectAllAria: "Select all undecided units",
    // One summary toast after a bulk loop, never one per item (§0.13).
    bulkApplied: (n: number) =>
      n === 1 ? "Disposition applied to 1 unit" : `Disposition applied to ${n} units`,
    bulkRejected: (n: number) =>
      n === 1 ? "1 unit rejected" : `${n} units rejected`,
    columns: {
      serial: "Serial",
      part: "Part / Variant",
      reason: "Reason",
      whereabouts: "Whereabouts",
      disposition: "Disposition",
      settlement: "Settlement",
      credit: "Credit",
      actions: "Actions",
    },
    decide: "Decide",
    replace: "Replace",
    refund: "Refund",
    reject: "Reject",
    rejectConfirmTitle: "Reject this unit?",
    rejectConfirmBody:
      "This takes the unit off the return and restores it to its previous stock state. It can't be undone.",
    rejectSelectedConfirmTitle: "Reject the selected units?",
    rejectSelectedConfirmBody: (n: number) =>
      `This takes ${n} unit${n === 1 ? "" : "s"} off the return and restores ${
        n === 1 ? "it" : "them"
      } to the previous stock state. It can't be undone.`,
    confirmReject: "Confirm rejection",
    // Bulk apply confirms before running, like its sibling reject (§12).
    applySelectedConfirmTitle: "Apply this disposition?",
    applySelectedConfirmBody: (n: number) =>
      `The chosen disposition will be set on ${n} selected unit${n === 1 ? "" : "s"}.`,
    confirmApply: "Apply disposition",
    remove: "Remove",
    removeConfirmTitle: "Remove this unit from the return?",
    removeConfirmBody:
      "This takes the unit off the return and restores it to its previous stock state. It can't be undone.",
    confirmRemove: "Remove unit",
    settle: "Settle",
    waive: "Waive",
    awaitingDecision: "Awaiting Decision",
    rejected: "Rejected",
    noAction: "—",
    rowActions: "Row actions",
    setDispositionFailed: "Failed to set disposition",
    rejectFailed: "Failed to reject item",
    removeFailed: "Failed to remove unit",
  },
  dispatchDialog: {
    title: "Dispatch Return to Vendor",
    description: "Complete the challan details before the units leave the warehouse.",
    cancel: "Cancel",
    // Disabled-Dispatch why-tooltips (§0.9): AWB is the backend's own final gate
    // and a consignment needs at least one unit aboard.
    needsAwb: "Enter the AWB number to dispatch.",
    noUnitsSelected: "Select at least one unit to dispatch.",
    // Counts the units on THIS consignment, because a return can leave on
    // several trips — "Dispatch" alone would imply the whole return is going.
    dispatch: (selected: number, total: number) =>
      selected === total
        ? `Dispatch ${selected} unit${selected === 1 ? "" : "s"}`
        : `Dispatch ${selected} of ${total}`,
    unitPicker: {
      label: "Units on this consignment",
      hint: "Untick anything staying behind — it ships on a later consignment.",
    },
    // AWB lives in the Logistics block (the Dispatch Request form's own copy).
    sections: {
      logistics: "Logistics",
      driver: "Driver and delivery",
      documents: "Documents",
    },
    documentsHint: "Optional. Uploaded to the dispatch once it is created.",
    fields: {
      driverName: "Driver name",
      driverPhone: "Driver phone",
      expectedDelivery: "Expected delivery date",
      returnAddress: "Return address",
    },
    placeholders: {
      driverName: "e.g. Ramesh Kumar",
      driverPhone: "10-digit mobile number",
      returnAddress: "e.g. Vendor warehouse, Plot 12, MIDC, Pune 411001",
    },
  },
  settlementDialog: {
    settleTitle: "Record settlement",
    waiveTitle: "Waive vendor credit",
    settleDescription: "Record how the vendor settled this refund.",
    waiveDescription: "Waiving credit needs a written reason.",
    modeLabel: "Settlement mode",
    modePlaceholder: "Select settlement mode",
    // Disabled-confirm why-tooltips (§0.9): settle needs a mode chosen, waive a
    // written reason.
    settleNeedsMode: "Choose a settlement mode.",
    waiveNeedsReason: "Enter a reason to waive this credit.",
  },
} as const;
