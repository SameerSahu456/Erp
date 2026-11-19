/**
 * Vendor services API — paint, display repair, battery boost, and whatever
 * section comes next.
 *
 * ONE client for EVERY section. Nothing here takes a section-specific branch:
 * a section is a `service_sections` row, so adding one costs no code on this
 * layer at all.
 */
import type { components } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";

type Schemas = components["schemas"];

export type ServiceSection = Schemas["ServiceSectionResponse"];
export type ServiceSectionCreateRequest =
  Schemas["ServiceSectionCreateRequest"];
export type ServiceSectionPatchRequest = Schemas["ServiceSectionPatchRequest"];
export type ServiceSectionListResponse = Schemas["ServiceSectionListResponse"];

export type ServiceVendor = Schemas["ServiceVendorResponse"];
export type ServiceVendorCreateRequest = Schemas["ServiceVendorCreateRequest"];
export type ServiceVendorPatchRequest = Schemas["ServiceVendorPatchRequest"];
export type ServiceVendorListResponse = Schemas["ServiceVendorListResponse"];

/** Query params for the paginated admin service-SECTIONS table. Hand-written
 *  (mirrors `VendorJobListParams`) — a `Query()` params model is flattened in
 *  OpenAPI, so it has no generated component to derive from. */
export interface ServiceSectionListParams extends Record<string, unknown> {
  search?: string;
  include_inactive?: boolean;
  /** Status filter: true = active only, false = inactive only, omit = all. */
  is_active?: boolean;
  /** Column filters: omit = no filter. */
  tracks_replacement?: boolean;
  applies_to_servers?: boolean;
  sort?: "name" | "-name" | "code" | "-code" | "created_at" | "-created_at";
  page?: number;
  page_size?: number;
}

/** Query params for the paginated admin service-VENDORS table. */
export interface ServiceVendorListParams extends Record<string, unknown> {
  /** A section CODE — scopes the table to one section (optional). */
  section?: string;
  /** A vendor id — scopes the table to one vendor's section rows (optional). */
  vendor_id?: string;
  search?: string;
  include_inactive?: boolean;
  /** Status filter: true = active only, false = inactive only, omit = all. */
  is_active?: boolean;
  sort?:
    | "vendor_name"
    | "-vendor_name"
    | "section"
    | "-section"
    | "created_at"
    | "-created_at";
  page?: number;
  page_size?: number;
}

export type VendorJob = Schemas["VendorJobResponse"];
export type VendorJobSummary = Schemas["VendorJobSummary"];
export type VendorJobListResponse = Schemas["VendorJobListResponse"];
export type VendorJobCreateRequest = Schemas["VendorJobCreateRequest"];
export type VendorJobSendRequest = Schemas["VendorJobSendRequest"];
export type VendorJobReceiveRequest = Schemas["VendorJobReceiveRequest"];
export type VendorJobResendRequest = Schemas["VendorJobResendRequest"];
export type VendorJobCancelRequest = Schemas["VendorJobCancelRequest"];

/** The derived sub-state of a job — computed server-side from the two
 *  timestamps, never stored. These are the queue's tabs. */
export type VendorJobStage = VendorJobSummary["stage"];

export interface VendorJobListParams extends Record<string, unknown> {
  /** A section CODE. OMIT for the cross-section view — "what is outside the
   *  building right now" is one page, not three. */
  section?: string;
  stage?: VendorJobStage;
  /** `fail` IS the "Returned — not OK" tab. */
  outcome?: "pass" | "fail";
  disposition?: "repaired" | "replaced";
  service_vendor_id?: string;
  /** The vendor itself, across every section it serves. */
  vendor_id?: string;
  warehouse_id?: string;
  warehouse_ids?: string[];
  category_id?: string;
  search?: string;
  /** Range over vendor_sent_at. NOTE: awaiting-vendor rows are returned
   *  regardless of this range — a job nobody has dispatched is exactly what a
   *  section needs to see. */
  sent_from?: string;
  sent_to?: string;
  sort?: "created_at" | "-created_at" | "vendor_sent_at" | "-vendor_sent_at";
  page?: number;
  page_size?: number;
}

export interface VendorJobStats {
  awaiting_vendor: number;
  with_vendor: number;
  /** All returned jobs (both outcomes). */
  returned: number;
  cancelled: number;
  /** Returned with outcome=fail. */
  not_ok: number;
  /** Returned with outcome=pass — the count for the "Returned" tab, which
   *  excludes failed returns (those live only under "Returned — not OK").
   *  Server-computed; the FE falls back to `returned - not_ok` if a stale
   *  backend hasn't shipped it yet. */
  returned_ok?: number;
  all: number;
}

// ── masters ──

export async function fetchServiceSections(
  includeInactive = false,
): Promise<ServiceSection[]> {
  return apiClient.get<ServiceSection[]>(endpoints.wms.serviceSections, {
    params: { include_inactive: includeInactive },
  });
}

/** The admin table view — server-side search / sort / pagination. Distinct
 *  from `fetchServiceSections`, which returns the whole array the sidebar nav
 *  and pickers need. */
export async function searchServiceSections(
  params: ServiceSectionListParams,
): Promise<ServiceSectionListResponse> {
  return apiClient.get<ServiceSectionListResponse>(
    endpoints.wms.serviceSectionsSearch,
    { params },
  );
}

export async function createServiceSection(
  body: ServiceSectionCreateRequest,
): Promise<ServiceSection> {
  return apiClient.post<ServiceSection>(endpoints.wms.serviceSections, body);
}

export async function patchServiceSection(
  id: string,
  body: ServiceSectionPatchRequest,
): Promise<ServiceSection> {
  return apiClient.patch<ServiceSection>(
    endpoints.wms.serviceSection(id),
    body,
  );
}

export async function fetchServiceVendors(
  sectionCode?: string,
  includeInactive = false,
): Promise<ServiceVendor[]> {
  return apiClient.get<ServiceVendor[]>(endpoints.wms.serviceVendors, {
    params: { section: sectionCode, include_inactive: includeInactive },
  });
}

/** The admin table view — server-side search / sort / pagination. The plain
 *  `fetchServiceVendors` stays the picker source (whole section-scoped array). */
export async function searchServiceVendors(
  params: ServiceVendorListParams,
): Promise<ServiceVendorListResponse> {
  return apiClient.get<ServiceVendorListResponse>(
    endpoints.wms.serviceVendorsSearch,
    { params },
  );
}

export async function createServiceVendor(
  body: ServiceVendorCreateRequest,
): Promise<ServiceVendor> {
  return apiClient.post<ServiceVendor>(endpoints.wms.serviceVendors, body);
}

export async function patchServiceVendor(
  id: string,
  body: ServiceVendorPatchRequest,
): Promise<ServiceVendor> {
  return apiClient.patch<ServiceVendor>(endpoints.wms.serviceVendor(id), body);
}

// ── queue ──

export async function fetchServiceJobsPage(
  params: VendorJobListParams,
): Promise<VendorJobListResponse> {
  return apiClient.get<VendorJobListResponse>(endpoints.wms.serviceJobs, {
    params,
  });
}

export async function fetchServiceJobStats(
  params: VendorJobListParams,
): Promise<VendorJobStats> {
  // Stats take the list's filters but not its paging — the backend rejects
  // unknown query params on this endpoint.
  const { page: _page, page_size: _pageSize, ...filters } = params;
  void _page;
  void _pageSize;
  return apiClient.get<VendorJobStats>(endpoints.wms.serviceJobStats, {
    params: filters,
  });
}

export async function fetchDeviceServiceJobs(
  deviceId: string,
): Promise<VendorJobSummary[]> {
  return apiClient.get<VendorJobSummary[]>(
    endpoints.wms.deviceServiceJobs(deviceId),
  );
}

// ── actions (all keyed by JOB id, never by device) ──

export async function raiseServiceJob(
  deviceId: string,
  body: VendorJobCreateRequest,
): Promise<VendorJob> {
  return apiClient.post<VendorJob>(
    endpoints.wms.deviceServiceJobs(deviceId),
    body,
  );
}

export async function sendServiceJobToVendor(
  deviceId: string,
  jobId: string,
  body: VendorJobSendRequest,
): Promise<VendorJob> {
  return apiClient.post<VendorJob>(
    endpoints.wms.deviceServiceJobSend(deviceId, jobId),
    body,
  );
}

export async function receiveServiceJob(
  deviceId: string,
  jobId: string,
  body: VendorJobReceiveRequest,
): Promise<VendorJob> {
  return apiClient.post<VendorJob>(
    endpoints.wms.deviceServiceJobReceive(deviceId, jobId),
    body,
  );
}

/** Returns the NEW job, not the one it came from. */
export async function resendServiceJob(
  deviceId: string,
  jobId: string,
  body: VendorJobResendRequest,
): Promise<VendorJob> {
  return apiClient.post<VendorJob>(
    endpoints.wms.deviceServiceJobResend(deviceId, jobId),
    body,
  );
}

export async function cancelServiceJob(
  deviceId: string,
  jobId: string,
  body: VendorJobCancelRequest,
): Promise<VendorJob> {
  return apiClient.post<VendorJob>(
    endpoints.wms.deviceServiceJobCancel(deviceId, jobId),
    body,
  );
}
