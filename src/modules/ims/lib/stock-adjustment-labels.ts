import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { humanizeEnum } from "@shared/lib/humanize-enum";

import type {
  StockAdjustmentDirection,
  StockAdjustmentImportRow,
  StockAdjustmentKind,
  StockAdjustmentReason,
  StockAdjustmentStatus,
} from "../stock-adjustments.api";

// Stock-adjustment wire enums → display labels (§16.12, §6.9 #6).

export const STOCK_ADJUSTMENT_STATUS_LABEL: Record<StockAdjustmentStatus, string> = {
  draft: "Draft",
  submitted: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STOCK_ADJUSTMENT_STATUS_VARIANT: Record<StockAdjustmentStatus, StatusBadgeVariant> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
};

export const STOCK_ADJUSTMENT_STATUSES = Object.keys(
  STOCK_ADJUSTMENT_STATUS_LABEL,
) as StockAdjustmentStatus[];

export const STOCK_ADJUSTMENT_REASON_LABEL: Record<StockAdjustmentReason, string> = {
  opening_stock: "Opening stock",
  audit: "Physical audit",
  damaged: "Damaged / write-off",
  other: "Other",
};

export const STOCK_ADJUSTMENT_REASONS = Object.keys(
  STOCK_ADJUSTMENT_REASON_LABEL,
) as StockAdjustmentReason[];

// A value newer than this build falls back to a neutral, humanized label.
const labelOf = (map: Record<string, string>, value: string) => map[value] ?? humanizeEnum(value);

export const adjustmentStatusLabel = (status: string) => labelOf(STOCK_ADJUSTMENT_STATUS_LABEL, status);
export const adjustmentStatusVariant = (status: string): StatusBadgeVariant =>
  (STOCK_ADJUSTMENT_STATUS_VARIANT as Record<string, StatusBadgeVariant>)[status] ?? "neutral";
export const adjustmentReasonLabel = (reason: string) => labelOf(STOCK_ADJUSTMENT_REASON_LABEL, reason);

export const STOCK_ADJUSTMENT_DIRECTION_LABEL: Record<StockAdjustmentDirection, string> = {
  add: "Add",
  remove: "Remove",
};

export const STOCK_ADJUSTMENT_DIRECTIONS = Object.keys(
  STOCK_ADJUSTMENT_DIRECTION_LABEL,
) as StockAdjustmentDirection[];

export const STOCK_ADJUSTMENT_KIND_LABEL: Record<StockAdjustmentKind, string> = {
  by_count: "By count",
  by_serial: "By serial",
  restore: "Restore",
};

export const STOCK_ADJUSTMENT_KINDS = Object.keys(STOCK_ADJUSTMENT_KIND_LABEL) as StockAdjustmentKind[];

type ImportRowStatus = StockAdjustmentImportRow["status"];

export const IMPORT_ROW_STATUS_LABEL: Record<ImportRowStatus, string> = { ok: "OK", error: "Error" };
export const IMPORT_ROW_STATUS_VARIANT: Record<ImportRowStatus, StatusBadgeVariant> = {
  ok: "success",
  error: "error",
};

/** List tabs: "All" plus one per status, in lifecycle order. */
export type AdjustmentTabId = "all" | StockAdjustmentStatus;
export const ADJUSTMENT_TAB_LABEL: Record<AdjustmentTabId, string> = {
  all: "All",
  ...STOCK_ADJUSTMENT_STATUS_LABEL,
};
export const ADJUSTMENT_TAB_IDS = Object.keys(ADJUSTMENT_TAB_LABEL) as AdjustmentTabId[];

const ITEM_SEPARATOR = " · ";

/** `SKU · Part name` — the one way an adjustment names a variant. */
export const adjustmentItemLabel = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(ITEM_SEPARATOR);

/** Directions each reason allows (spec D3). */
export const REASON_DIRECTIONS: Record<StockAdjustmentReason, readonly StockAdjustmentDirection[]> = {
  opening_stock: ["add"],
  audit: ["add", "remove"],
  damaged: ["remove"],
  other: ["add", "remove"],
};

/** Kinds valid per direction — Restore is an add that re-activates a removed unit (D4). */
export const DIRECTION_KINDS: Record<StockAdjustmentDirection, readonly StockAdjustmentKind[]> = {
  add: ["by_count", "by_serial", "restore"],
  remove: ["by_count", "by_serial"],
};

/** `other` needs a real explanation (D3). Mirrors the backend minimum. */
export const OTHER_REASON_NOTES_MIN = 20;
/** Add-by-count cap per line (D4). */
export const MAX_COUNT_PER_LINE = 500;
/** Header / line notes cap — mirrors the backend Form max_length. */
export const NOTES_MAX = 4000;
/** Serial caps — mirror the stock-item columns. */
export const INTERNAL_SERIAL_MAX = 10;
export const MANUFACTURER_SERIAL_MAX = 255;
/** Import upload cap (D11). */
export const IMPORT_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_FILE_ACCEPT = ".xlsx,.csv";
