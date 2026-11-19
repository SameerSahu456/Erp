import type {
  MaterialIssueLineRow,
  MaterialIssueStage,
} from "../../api";
import { MATERIAL_ISSUE_STAGE_LABELS } from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

export type MiTabId = MaterialIssueStage | "all";

// "All" leads (the user's explicit ask), then the lifecycle stages in flow
// order. `draft` and `cancelled` both map to a real line status, so the
// derived-stage filter (stage_filter_predicate on the backend) surfaces them
// too — a draft machine is shown here so it can be issued without hunting for
// a separate documents page.
export const TAB_LABELS: Record<MiTabId, string> = {
  all: S.worklist.tabs.all,
  draft: S.worklist.tabs.draft,
  issued: S.worklist.tabs.issued,
  qc_failed: S.worklist.tabs.qcFailed,
  ready_for_dispatch: S.worklist.tabs.readyForDispatch,
  dispatched: S.worklist.tabs.dispatched,
  returned: S.worklist.tabs.returned,
  cancelled: MATERIAL_ISSUE_STAGE_LABELS.cancelled,
};

export const TAB_IDS: MiTabId[] = [
  "all",
  "draft",
  "issued",
  "qc_failed",
  "ready_for_dispatch",
  "dispatched",
  "returned",
  "cancelled",
];

// Tabs whose rows carry no worklist action hide the actions column entirely
// (rather than show a dead, empty column). Terminal stages (dispatched /
// returned / cancelled) have never had one; ready_for_dispatch joins them —
// its rows are waiting on dispatch, with nothing to do from here.
export const NO_ACTION_TABS = new Set<MiTabId>([
  "ready_for_dispatch",
  "dispatched",
  "returned",
  "cancelled",
]);

// The line-list API now carries each row's variant label inline
// (variant_sku_code / variant_name), so the worklist no longer fans out a
// per-id variant fetch just to name the part. Prefer the SKU (what operators
// scan by), fall back to the human name, then a short id as a last resort.
export const variantRowLabel = (r: MaterialIssueLineRow) =>
  r.variant_sku_code || r.variant_name || r.part_variant_id.slice(0, 8);

export const columns = [
  { key: "issueNo", label: S.worklist.columns.issueNo, width: "17%", sortable: true },
  { key: "part", label: S.worklist.columns.part, width: "21%", sortable: true },
  { key: "serial", label: S.worklist.columns.serial, width: "14%", sortable: true },
  { key: "type", label: S.worklist.columns.type, width: "11%", sortable: true },
  // `stage` is derived per row; the backend ranks it in lifecycle order for sort.
  { key: "stage", label: S.worklist.columns.stage, width: "11%", sortable: true },
  {
    key: "issuedTo",
    label: S.worklist.columns.issuedTo,
    filterable: true,
    sortable: true,
    width: "20%",
  },
  {
    key: "actions",
    label: S.worklist.columns.actions,
    align: "right" as const,
    width: "10%",
  },
];

// Table column key → backend `sort` field. Only columns the /wms/material-issue
// lines endpoint can order server-side are here; each sort is a fresh API call.
export const SORT_FIELD_MAP: Record<string, string> = {
  issueNo: "mi_number",
  // Item column shows the SKU (variant_sku_code) first, so sort by the same
  // SKU-first value on the backend — not the variant name.
  part: "variant_label",
  serial: "internal_serial",
  type: "issue_type",
  stage: "stage",
  issuedTo: "issued_to_name",
};

// Backend `q` is maxLength 50 — cap so a long paste never 422s the list.
export const MI_LINES_SEARCH_MAX = 50;

// A QC-only engineer owns post-inspection outward-QC work, so their tab set is
// just the three stages they can act on — no "All" (CP-193 #8).
export const QC_ONLY_TAB_IDS: MiTabId[] = ["issued", "qc_failed", "ready_for_dispatch"];
