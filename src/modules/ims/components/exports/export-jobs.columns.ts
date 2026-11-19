import type { ExportTabId } from "../../hooks/exports/useExportJobsList";
import { EXPORT_STATUS_LABEL } from "../../lib/export-labels";
import { EXPORTS_STRINGS as S } from "./exports.strings";

const C = S.columns;

export const EXPORT_TAB_LABEL: Record<ExportTabId, string> = {
  ...EXPORT_STATUS_LABEL,
  all: S.list.allTab,
};

export function exportJobColumns(showRequestedBy: boolean) {
  return [
    // Format rides under the type, and rows / size / downloads share one File
    // cell, so the register fits the page width (§8.7).
    { key: "type", label: C.type },
    { key: "filters", label: C.filters, width: "150px" },
    ...(showRequestedBy ? [{ key: "requestedBy", label: C.requestedBy }] : []),
    { key: "requested", label: C.requested, align: "right" as const },
    { key: "status", label: C.status },
    { key: "rows", label: C.file, align: "right" as const },
    { key: "expires", label: C.expires },
    { key: "actions", label: C.actions, align: "right" as const },
  ];
}
