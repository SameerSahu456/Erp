import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type {
  MaterialIssueStatus,
  MaterialIssueStage,
  MaterialIssueType,
  WiredIssueType,
} from "../api";

// Domain label maps (Coding-guideline §16.12 bucket 2): single source for how a
// Material Issue wire value is shown to the user, so the list badge and the
// detail header can never drift apart.

export const MATERIAL_ISSUE_STATUS_LABELS: Record<MaterialIssueStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  cancelled: "Cancelled",
};

export const MATERIAL_ISSUE_STATUS_VARIANT: Record<
  MaterialIssueStatus,
  StatusBadgeVariant
> = {
  draft: "neutral",
  // Issued is an ACTIVE, mid-flow state (material is out with the engineer, not
  // "done") — blue reads better than green, and matches the per-line stage badge.
  issued: "info",
  cancelled: "error",
};

export function getMaterialIssueStatusVariant(
  status: string,
): StatusBadgeVariant {
  return (
    (MATERIAL_ISSUE_STATUS_VARIANT as Record<string, StatusBadgeVariant>)[
      status
    ] ?? "neutral"
  );
}

// The status tabs shown on the list page, in flow order.
export const MATERIAL_ISSUE_STATUS_TABS: MaterialIssueStatus[] = [
  "draft",
  "issued",
  "cancelled",
];

// Per-line derived stage labels + badge variants (detail & worklist).
export const MATERIAL_ISSUE_STAGE_LABELS: Record<MaterialIssueStage, string> = {
  draft: "Draft",
  issued: "Issued",
  qc_failed: "QC Failed",
  ready_for_dispatch: "Ready for Dispatch",
  dispatched: "Dispatched",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const MATERIAL_ISSUE_STAGE_VARIANT: Record<
  MaterialIssueStage,
  StatusBadgeVariant
> = {
  draft: "neutral",
  issued: "info",
  qc_failed: "error",
  ready_for_dispatch: "success",
  // Terminal, shipped-out state — the unit left the building after passing QC.
  dispatched: "success",
  returned: "warning",
  // Cancelled is a terminal-negative state (like the header status) — red, not
  // grey, so it never looks like an un-coloured/missing badge.
  cancelled: "error",
};

// The worklist stage tabs, in flow order. "All" is handled as `undefined`.
export const MATERIAL_ISSUE_STAGE_TABS: MaterialIssueStage[] = [
  "issued",
  "qc_failed",
  "ready_for_dispatch",
  "dispatched",
  "returned",
];

// Issue types — all five declared in the backend CHECK; only three are wired to
// a live demand document in v1. `wired: false` types are shown but disabled.
export interface IssueTypeMeta {
  value: MaterialIssueType;
  label: string;
  description: string;
  wired: boolean;
  // The demand-document entity type the source picker queries (wired types).
  sourceEntityType?: "sales_orders" | "demo_requests" | "replacement_requests";
}

export const ISSUE_TYPE_META: Record<MaterialIssueType, IssueTypeMeta> = {
  sale_issue: {
    value: "sale_issue",
    label: "Sales Order",
    description: "Issue against a sales order",
    wired: true,
    sourceEntityType: "sales_orders",
  },
  demo_issue: {
    value: "demo_issue",
    label: "Demo",
    description: "Issue for a demonstration",
    wired: true,
    sourceEntityType: "demo_requests",
  },
  replacement_issue: {
    value: "replacement_issue",
    label: "Replacement",
    description: "Issue a replacement part",
    wired: true,
    sourceEntityType: "replacement_requests",
  },
  internal_transfer_issue: {
    value: "internal_transfer_issue",
    label: "Internal Transfer",
    description: "Not available yet",
    wired: false,
  },
  rental_issue: {
    value: "rental_issue",
    label: "Rental",
    description: "Coming in phase 2",
    wired: false,
  },
};

export const ISSUE_TYPE_OPTIONS: IssueTypeMeta[] = Object.values(ISSUE_TYPE_META);

export const WIRED_ISSUE_TYPES: WiredIssueType[] = [
  "sale_issue",
  "demo_issue",
  "replacement_issue",
];

export function getIssueTypeLabel(issueType: string): string {
  return (
    (ISSUE_TYPE_META as Record<string, IssueTypeMeta>)[issueType]?.label ??
    issueType
  );
}

// Demand-document entity type → display label (list + detail source column).
export const SOURCE_ENTITY_LABELS: Record<string, string> = {
  sales_orders: "Sales Order",
  demo_requests: "Demo Request",
  replacement_requests: "Replacement Request",
};

export function getSourceEntityLabel(entityType: string): string {
  return SOURCE_ENTITY_LABELS[entityType] ?? entityType;
}
