import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";

import type { ExportFilters, ExportFormat, ExportStatus, ExportType } from "./export-types";

// IMS export wire enums → display labels (§16.12, §6.9 #6).

export const EXPORT_TYPE_LABEL: Record<ExportType, string> = {
  catalog: "Catalog",
  stock_units: "Stock by unit",
  stock_summary: "Stock summary",
};

export type ExportCondition = NonNullable<ExportFilters["condition"]>;

export const EXPORT_CONDITION_LABEL: Record<ExportCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
  new_pull: "New pull",
};

/** Export types that read stock units, so a warehouse filter applies. */
export const STOCK_EXPORT_TYPES: readonly ExportType[] = ["stock_units", "stock_summary"];

export const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  xlsx: "Excel (.xlsx)",
  csv: "CSV",
};

export const EXPORT_STATUS_LABEL: Record<ExportStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Ready",
  failed: "Failed",
  expired: "Expired",
};

export const EXPORT_STATUS_VARIANT: Record<ExportStatus, StatusBadgeVariant> = {
  queued: "info",
  running: "info",
  completed: "success",
  failed: "error",
  expired: "neutral",
};

/** Statuses that still change on their own — the list polls while any row is in one. */
export const ACTIVE_EXPORT_STATUSES: readonly ExportStatus[] = ["queued", "running"];

/** Known failure `error_code`s → plain-language reason; anything unlisted
 *  falls back to the job's `error_message`. Add codes as the backend names them. */
export const EXPORT_ERROR_LABEL: Readonly<Partial<Record<string, string>>> = {};
