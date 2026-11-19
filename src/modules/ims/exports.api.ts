import type { components, operations } from "@shared/api/schema.gen";
import { apiClient, compactParams, http, type BlobResponse } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

// IMS background exports. Spec: comprint-erp-docs/modules/ims/stock-adjustment/spec.md §5.

type Schemas = components["schemas"];

export type ExportJob = Schemas["IMSExportJobResponse"];
export type ExportRequest = Schemas["IMSExportRequest"];
export type ExportFilters = Schemas["IMSExportFilters"];
export type ExportDownload = Schemas["IMSExportDownload"];
export type ExportJobsPage = Schemas["PaginatedResponse_IMSExportJobResponse_"];
export type ExportType = ExportJob["export_type"];
export type ExportFormat = ExportJob["format"];
export type ExportStatus = ExportJob["status"];

export type ExportJobsParams = NonNullable<
  operations["list_ims_exports_api_v1_ims_exports_get"]["parameters"]["query"]
>;

/** Whether a request queued a new job (202) or matched an identical job that
 *  was already running (200). */
export interface RequestedExport {
  alreadyRunning: boolean;
}

const HTTP_ACCEPTED = 202;

export async function requestExport(body: ExportRequest): Promise<RequestedExport> {
  // `http` directly: the status code (202 vs 200) is the only signal that the
  // export already existed, and the typed wrapper returns the body only.
  const response = await http.post<ExportJob>(endpoints.ims.exports, body);
  return { alreadyRunning: response.status !== HTTP_ACCEPTED };
}

export async function fetchExportJobs(params: ExportJobsParams): Promise<ExportJobsPage> {
  return apiClient.get<ExportJobsPage>(endpoints.ims.exports, {
    params: compactParams(params),
  });
}

/** One status tab's count — the list endpoint's `total` at page size 1. */
export function fetchExportJobCount(params: ExportJobsParams): Promise<ExportJobsPage> {
  return fetchExportJobs({ ...params, page: 1, page_size: 1 });
}

export async function rerunExport(id: string): Promise<ExportJob> {
  return apiClient.post<ExportJob>(endpoints.ims.exportRerun(id));
}

export async function fetchExportDownload(id: string): Promise<ExportDownload> {
  return apiClient.get<ExportDownload>(endpoints.ims.exportDownloadUrl(id));
}

/** Dev-only auth-proxied file stream (local storage) — the path comes from
 *  the download-url response, already API-relative. */
export async function fetchExportFile(path: string): Promise<BlobResponse> {
  return apiClient.getBlob(path);
}
