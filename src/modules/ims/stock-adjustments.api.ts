import type { components, operations } from "@shared/api/schema.gen";
import { apiClient, compactParams, type BlobResponse } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { toPrintResult, type LabelPrintResult } from "@modules/wms";

// Stock adjustments — maker-checker stock corrections.
// Spec: comprint-erp-docs/modules/ims/stock-adjustment/spec.md §4.
// Every shape below is derived from the generated schema (§6.9 #11).

type Schemas = components["schemas"];

export type StockAdjustment = Schemas["StockAdjustmentResponse"];
export type StockAdjustmentListItem = Schemas["StockAdjustmentListItem"];
export type StockAdjustmentLine = Schemas["StockAdjustmentLineResponse"];
export type StockAdjustmentUnit = Schemas["StockAdjustmentUnitResponse"];
export type StockAdjustmentLineInput = Schemas["StockAdjustmentLineInput"];
export type StockAdjustmentCreate = Schemas["StockAdjustmentCreateRequest"];
export type StockAdjustmentUpdate = Schemas["StockAdjustmentUpdateRequest"];
export type StockAdjustmentLinePreview = Schemas["StockAdjustmentLinePreview"];
export type StockAdjustmentLinePreviewRequest = Schemas["StockAdjustmentLinePreviewRequest"];
export type StockAdjustmentImportPreview = Schemas["ImportPreviewResponse"];
export type StockAdjustmentImportRow = Schemas["ImportPreviewRow"];
export type StockAdjustmentsPage = Schemas["PaginatedResponse_StockAdjustmentListItem_"];
export type RemovableUnit = Schemas["RemovableUnit"];
export type RemovableUnitsPage = Schemas["PaginatedResponse_RemovableUnit_"];
export type RemovableUnitsParams = NonNullable<
  operations["list_removable_units_api_v1_ims_stock_adjustments_removable_units_get"]["parameters"]["query"]
>;

export type StockAdjustmentStatus = StockAdjustment["status"];
export type StockAdjustmentReason = StockAdjustment["reason"];
export type StockAdjustmentDirection = StockAdjustmentLineInput["direction"];
export type StockAdjustmentKind = StockAdjustmentLineInput["kind"];

export type StockAdjustmentsParams = NonNullable<
  operations["list_stock_adjustments_api_v1_ims_stock_adjustments_get"]["parameters"]["query"]
>;

type DeviceLabelPrintRequest = Schemas["DeviceLabelPrintRequest"];

export async function fetchStockAdjustments(
  params: StockAdjustmentsParams,
): Promise<StockAdjustmentsPage> {
  return apiClient.get<StockAdjustmentsPage>(endpoints.ims.stockAdjustments, {
    params: compactParams(params),
  });
}

/** Total-only fetch for the inactive status tabs (useTabCounts). */
export function fetchStockAdjustmentCount(params: StockAdjustmentsParams) {
  return fetchStockAdjustments({ ...params, page: 1, page_size: 1 });
}

/** Units of one variant a remove-by-serial line could pick, with blocked reasons. */
export async function fetchRemovableUnits(
  params: RemovableUnitsParams,
): Promise<RemovableUnitsPage> {
  return apiClient.get<RemovableUnitsPage>(endpoints.ims.stockAdjustmentRemovableUnits, {
    params: compactParams(params),
  });
}

export async function fetchStockAdjustment(id: string): Promise<StockAdjustment> {
  return apiClient.get<StockAdjustment>(endpoints.ims.stockAdjustment(id));
}

export async function createStockAdjustment(
  body: StockAdjustmentCreate,
): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustments, body);
}

export async function updateStockAdjustment(
  id: string,
  body: StockAdjustmentUpdate,
): Promise<StockAdjustment> {
  return apiClient.patch<StockAdjustment>(endpoints.ims.stockAdjustment(id), body);
}

export async function submitStockAdjustment(id: string): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustmentSubmit(id));
}

export async function cancelStockAdjustment(id: string): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustmentCancel(id));
}

export async function returnStockAdjustmentToDraft(id: string): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustmentReturnToDraft(id), {});
}

export async function approveStockAdjustment(
  id: string,
  body: Schemas["StockAdjustmentDecisionRequest"],
): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustmentApprove(id), body);
}

export async function rejectStockAdjustment(
  id: string,
  body: Schemas["StockAdjustmentRejectRequest"],
): Promise<StockAdjustment> {
  return apiClient.post<StockAdjustment>(endpoints.ims.stockAdjustmentReject(id), body);
}

export async function previewStockAdjustmentLine(
  body: StockAdjustmentLinePreviewRequest,
): Promise<StockAdjustmentLinePreview> {
  return apiClient.post<StockAdjustmentLinePreview>(
    endpoints.ims.stockAdjustmentPreviewLine,
    body,
  );
}

export async function downloadStockAdjustmentTemplate(): Promise<BlobResponse> {
  return apiClient.getBlob(endpoints.ims.stockAdjustmentImportTemplate);
}

type ImportPreviewBody =
  Schemas["Body_preview_stock_adjustment_import_api_v1_ims_stock_adjustments_import_preview_post"];
export type ImportPreviewParams = Omit<ImportPreviewBody, "file"> & { file: File };

export async function previewStockAdjustmentImport(
  params: ImportPreviewParams,
): Promise<StockAdjustmentImportPreview> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("warehouse_id", params.warehouse_id);
  form.append("reason", params.reason);
  form.append("notes", params.notes);
  // Overriding the default JSON content-type keeps axios from serialising the
  // FormData; its browser adapter then drops the header so the browser sets
  // the multipart boundary itself.
  return apiClient.post<StockAdjustmentImportPreview>(
    endpoints.ims.stockAdjustmentImportPreview,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
}

/** PDF labels for an explicit unit list — the units an approved adjustment added. */
export async function printUnitLabels(stockItemIds: string[]): Promise<LabelPrintResult> {
  const body: Pick<DeviceLabelPrintRequest, "stock_item_ids" | "include_labelled"> = {
    stock_item_ids: stockItemIds,
    include_labelled: false,
  };
  return toPrintResult(await apiClient.postBlob(endpoints.wms.deviceSetLabels, body));
}
