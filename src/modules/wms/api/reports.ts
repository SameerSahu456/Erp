import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// ─── Stage Checklist Report ─────────────────────────────────────────────────
//
// The grid's shape is DATA, not code: `columns` arrives at runtime, and its
// keys are namespaced per category whenever a result set spans categories. A
// column key is therefore never safe to hard-code in a component — always read
// `row.answers[col.key]`.

export type ChecklistReportColumn =
  components["schemas"]["ChecklistReportColumn"];
export type ChecklistReportRow = components["schemas"]["ChecklistReportRow"];
export type ChecklistReportResponse =
  components["schemas"]["ChecklistReportResponse"];

export type ReportStage = "inspection" | "repair";

export interface StageChecklistReportParams {
  po_id?: string;
  category_id?: string;
  part_id?: string;
  variant_id?: string;
  stage?: ReportStage[];
  warehouse_ids?: string[];
  engineer_id?: string;
  from_date?: string;
  to_date?: string;
  result?: string[];
  page?: number;
  page_size?: number;
}

/** Shared by the JSON read and the CSV export so the export can never drift
 *  from what the user is looking at. */
function buildQuery(params: StageChecklistReportParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.po_id) qs.set("po_id", params.po_id);
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.part_id) qs.set("part_id", params.part_id);
  if (params.variant_id) qs.set("variant_id", params.variant_id);
  if (params.engineer_id) qs.set("engineer_id", params.engineer_id);
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  for (const s of params.stage ?? []) qs.append("stage", s);
  for (const w of params.warehouse_ids ?? []) qs.append("warehouse_ids", w);
  for (const r of params.result ?? []) qs.append("result", r);
  return qs;
}

export async function fetchStageChecklistReport(
  params: StageChecklistReportParams = {},
): Promise<ChecklistReportResponse> {
  const qs = buildQuery(params);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  return apiClient.get<ChecklistReportResponse>(
    `${endpoints.wms.stageChecklistReport}?${qs.toString()}`,
  );
}

/** Full filtered set as CSV (no paging). getBlob (§6.1) surfaces REPORT_EXPORT_TOO_LARGE. */
export async function exportStageChecklistReport(
  params: StageChecklistReportParams = {},
): Promise<Blob> {
  const { blob } = await apiClient.getBlob(
    `${endpoints.wms.stageChecklistReportExport}?${buildQuery(params).toString()}`,
  );
  return blob;
}
