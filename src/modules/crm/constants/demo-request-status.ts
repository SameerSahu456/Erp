import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { DemoRequestReturnCondition, DemoRequestSource, DemoUnitCustody } from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2) for the CRM ›
// demo-requests sub-feature. These are the single source for how a demo
// request's lifecycle status, its source type, and the workflow stages are
// shown to the user, and for the StatusBadge tone each status maps to.

// Every display status the sub-feature can render. The list table
// (`statusToLabel` in demoRequestsConfig.ts) and the detail header
// (`wireStatusToUi` in demoRequestDetailHelpers.ts) both map wire statuses
// into this union. The legacy "Submitted" / "Dispatch Created" members only
// exist on the mock `DemoRequestStatus` union (`../types`, still consumed by
// WMS/procurement mock data) — no wire mapping can produce them, so they are
// intentionally absent here.
export type DemoStatusLabel =
  | "Draft"
  | "Pending PM Approval"
  | "Partially Approved"
  | "PM Approved"
  | "PM Rejected"
  | "Partially Dispatched"
  | "Dispatched"
  | "With Customer"
  | "Partially Returned"
  | "Returned"
  | "Converted to SO"
  | "Closed"
  | "Return Overdue"
  | "Account Approval Pending"
  | "Account Rejected"

// Display status → StatusBadge tone. Single source shared by the list table
// and the detail header (previously duplicated as `STATUS_VARIANT` in
// demoRequestsConfig.ts and demoRequestDetailHelpers.ts).
export const DEMO_STATUS_VARIANT = {
  Draft: "neutral",
  "Pending PM Approval": "warning",
  "Partially Approved": "warning",
  "PM Approved": "success",
  "PM Rejected": "error",
  "Partially Dispatched": "info",
  Dispatched: "info",
  "With Customer": "warning",
  "Partially Returned": "warning",
  "Return Overdue": "error",
  Returned: "success",
  "Converted to SO": "success",
  Closed: "neutral",
  "Account Approval Pending": "warning",
  "Account Rejected": "error",
} as const satisfies Record<DemoStatusLabel, StatusBadgeVariant>

// Per-line PM approval status → badge variant (each demo item is approved /
// rejected independently by its assigned product manager).
export const DEMO_ITEM_PM_STATUS_VARIANT = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
} as const satisfies Record<string, StatusBadgeVariant>

// Where a single dispatched demo unit currently sits → how its badge reads.
// `converted` is the customer keeping the unit and buying it, which is a good
// outcome, not a return — so it must never share a tone with `returned`.
export const DEMO_UNIT_CUSTODY_LABELS: Record<DemoUnitCustody, string> = {
  with_customer: "With Customer",
  returned: "Returned",
  converted: "Converted to SO",
}

export const DEMO_UNIT_CUSTODY_VARIANT = {
  with_customer: "warning",
  returned: "success",
  converted: "info",
} as const satisfies Record<DemoUnitCustody, StatusBadgeVariant>

// Source-type wire value → display label.
export const DEMO_REQUEST_SOURCE_LABELS: Record<DemoRequestSource, string> = {
  account: "Account",
  deal: "Deal",
  lead: "Lead",
}

// Wire return-condition enum → display label (typed map — replaces the old
// `.replace("MissingParts", …) as …` cast in demoRequestDetailHelpers).
export const DEMO_RETURN_CONDITION_LABELS = {
  Good: "Good",
  Damaged: "Damaged",
  MissingParts: "Missing Parts",
} as const satisfies Record<DemoRequestReturnCondition, string>

export type DemoReturnConditionLabel =
  (typeof DEMO_RETURN_CONDITION_LABELS)[DemoRequestReturnCondition]
