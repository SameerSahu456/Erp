import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import type { PageResponse } from "@/shared/api/pagination";
import { PAGINATION } from "@/shared/constants";

// ─── User Sales Target wire types ─────────────────────────────────────────
// Mirrors app/modules/crm/schemas/user_sales_target.py (verified against the
// backend schema module 2026-10-08). Values are Capitalized on the wire —
// no casing adapter — because the backend's enum CHECK is Capitalized too.

export type TargetStatus =
  "Draft" | "PendingApproval" | "Approved" | "Rejected";

export const TARGET_STATUSES: readonly TargetStatus[] = [
  "Draft",
  "PendingApproval",
  "Approved",
  "Rejected",
] as const;

// ``scope`` narrows the list to a slice of users:
//  - ``self`` (default)  → actor's own targets only.
//  - ``team``            → actor + reporting subtree via users.manager_ids.
//  - ``all``             → every user; admin-only (service enforces).
export type TargetListScope = "self" | "team" | "all";

export const TARGET_LIST_SCOPES: readonly TargetListScope[] = [
  "self",
  "team",
  "all",
] as const;

export interface UserEmbed {
  id: string;
  name: string;
}

export interface UserSalesTarget {
  id: string;
  user: UserEmbed;
  fy_start_year: number;
  fy_label: string; // "2026-2027" (full years, dash separator; backend CHECK ^\d{4}-\d{4}$)
  // Monthly (12 stored, FY order Apr → Mar). Service-split from the user's
  // quarterly input via `split_quarter`. apr+may+jun === q1 to the paisa.
  apr_target: string;
  may_target: string;
  jun_target: string;
  jul_target: string;
  aug_target: string;
  sep_target: string;
  oct_target: string;
  nov_target: string;
  dec_target: string;
  jan_target: string;
  feb_target: string;
  mar_target: string;
  // Quarterly (4 stored — user's input of record).
  q1_target: string;
  q2_target: string;
  q3_target: string;
  q4_target: string;
  // Annual (service-computed as q1+q2+q3+q4 on every write).
  annual_target: string;
  status: TargetStatus;
  submitted_by: UserEmbed | null;
  submitted_at: string | null;
  reviewed_by: UserEmbed | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_by: UserEmbed;
  created_at: string;
  updated_at: string;
}

// Shape of the paginated response envelope used by GET /crm/user-targets.
export type UserSalesTargetListResponse = PageResponse<UserSalesTarget>;

// ─── Request bodies ────────────────────────────────────────────────────────

export interface UserSalesTargetCreatePayload {
  user_id: string;
  fy_start_year: number;
  q1_target: string;
  q2_target: string;
  q3_target: string;
  q4_target: string;
}

export interface UserSalesTargetUpdatePayload {
  q1_target?: string;
  q2_target?: string;
  q3_target?: string;
  q4_target?: string;
}

export interface UserSalesTargetRejectPayload {
  notes: string;
}

// ─── List params ───────────────────────────────────────────────────────────

export interface FetchUserTargetsParams {
  scope?: TargetListScope;
  fy_start_year?: number;
  status?: readonly TargetStatus[];
  /** Narrow the result to specific target subjects. Intersected with scope
   *  server-side — a non-admin passing an id outside their team gets zero
   *  rows, never a 403. */
  user_ids?: readonly string[];
  page?: number;
  page_size?: number;
}

// ─── Wire adapters ─────────────────────────────────────────────────────────
// Decimal money fields come across the wire as strings to preserve paisa
// precision (NUMERIC(14, 2) → JSON number would downgrade to IEEE-754).
// Nothing to convert on the FE — rendering uses Number(…) at display time
// via the formatCurrency helper.

// ─── Fetch wrappers ───────────────────────────────────────────────────────

// ``apiClient.<verb><T>()`` already returns the parsed body as ``T`` (the
// request helper + response interceptor in ``shared/api/client.ts`` unwrap
// ``response.data`` and strip the ApiResponse envelope when present). So the
// wrappers below just return the call directly — never ``response.data`` on
// top of it. Matches the pattern used by ``fetchMeetings`` / ``fetchLeads``.

export async function fetchUserTargets(
  params: FetchUserTargetsParams = {},
): Promise<UserSalesTargetListResponse> {
  const query: Record<string, string | number | string[]> = {};
  if (params.scope) query.scope = params.scope;
  if (params.fy_start_year !== undefined)
    query.fy_start_year = params.fy_start_year;
  if (params.status && params.status.length > 0) {
    // FastAPI accepts repeated query params for list[Literal]; axios serialises
    // ``status: ['Draft', 'Approved']`` as ``?status=Draft&status=Approved``.
    query.status = [...params.status];
  }
  if (params.user_ids && params.user_ids.length > 0) {
    // Repeated ``?user_ids=<uuid>&user_ids=<uuid>`` — backend takes a list.
    query.user_ids = [...params.user_ids];
  }
  query.page = params.page ?? 1;
  query.page_size = params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE;
  return apiClient.get<UserSalesTargetListResponse>(endpoints.crm.userTargets, {
    params: query,
  });
}

export async function fetchUserTarget(id: string): Promise<UserSalesTarget> {
  return apiClient.get<UserSalesTarget>(endpoints.crm.userTarget(id));
}

export async function createUserTarget(
  payload: UserSalesTargetCreatePayload,
): Promise<UserSalesTarget> {
  return apiClient.post<UserSalesTarget>(endpoints.crm.userTargets, payload);
}

export async function updateUserTarget(
  id: string,
  payload: UserSalesTargetUpdatePayload,
): Promise<UserSalesTarget> {
  return apiClient.patch<UserSalesTarget>(
    endpoints.crm.userTarget(id),
    payload,
  );
}

export async function submitUserTarget(id: string): Promise<UserSalesTarget> {
  return apiClient.post<UserSalesTarget>(endpoints.crm.userTargetSubmit(id));
}

export async function approveUserTarget(id: string): Promise<UserSalesTarget> {
  return apiClient.post<UserSalesTarget>(endpoints.crm.userTargetApprove(id));
}

export async function rejectUserTarget(
  id: string,
  payload: UserSalesTargetRejectPayload,
): Promise<UserSalesTarget> {
  return apiClient.post<UserSalesTarget>(
    endpoints.crm.userTargetReject(id),
    payload,
  );
}

export async function reviseUserTarget(id: string): Promise<UserSalesTarget> {
  return apiClient.post<UserSalesTarget>(endpoints.crm.userTargetRevise(id));
}

export async function deleteUserTarget(id: string): Promise<void> {
  await apiClient.delete<void>(endpoints.crm.userTarget(id));
}

// ─── Bifurcation lines (plan.md §9) ────────────────────────────────────
// Lines break a target's quarterly / annual amount down by
// (category, OEM, condition). Each key is nullable server-side (NULL =
// wildcard). The 17 money columns of the header get rolled up from Σ lines
// on every PUT. See docs for the invariants + no-overlap rule.

export type UserSalesTargetLineCondition = "New" | "Refurbished" | "New Pull";

export const USER_SALES_TARGET_LINE_CONDITIONS: readonly UserSalesTargetLineCondition[] =
  ["New", "Refurbished", "New Pull"] as const;

export interface UserSalesTargetLine {
  id: string;
  // null on any of these three → wildcard at that key.
  category_id: string | null;
  oem_id: string | null;
  condition: UserSalesTargetLineCondition | null;
  // Same 17 money columns as the header — Decimal strings on the wire so
  // paisa precision survives JSON. apr → mar (FY order), then Q1-Q4, then
  // the annual rollup (service-computed as Σ quarters per line).
  apr_target: string;
  may_target: string;
  jun_target: string;
  jul_target: string;
  aug_target: string;
  sep_target: string;
  oct_target: string;
  nov_target: string;
  dec_target: string;
  jan_target: string;
  feb_target: string;
  mar_target: string;
  q1_target: string;
  q2_target: string;
  q3_target: string;
  q4_target: string;
  annual_target: string;
}

// Replace-all request body — the server soft-deletes existing lines and
// inserts the new set in a single transaction. Empty ``lines`` clears the
// breakdown and leaves the header's existing totals in place.
export interface UserSalesTargetLineInput {
  category_id?: string | null;
  oem_id?: string | null;
  condition?: UserSalesTargetLineCondition | null;
  q1_target: string;
  q2_target: string;
  q3_target: string;
  q4_target: string;
}

export interface ReplaceUserSalesTargetLinesPayload {
  lines: UserSalesTargetLineInput[];
}

// Response wrappers — the GET endpoint is paginated (infinite scroll), the
// PUT response returns the full new set in a flat ``lines`` array because
// the FE just posted them.
export type UserSalesTargetLinesPaginatedResponse =
  PageResponse<UserSalesTargetLine>;

export interface UserSalesTargetLinesResponse {
  user_sales_target_id: string;
  lines: UserSalesTargetLine[];
}

export interface FetchUserTargetLinesParams {
  page?: number;
  page_size?: number;
}

export async function fetchUserTargetLines(
  targetId: string,
  params: FetchUserTargetLinesParams = {},
): Promise<UserSalesTargetLinesPaginatedResponse> {
  const query: Record<string, number> = {
    page: params.page ?? 1,
    page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
  };
  return apiClient.get<UserSalesTargetLinesPaginatedResponse>(
    endpoints.crm.userTargetLines(targetId),
    { params: query },
  );
}

export async function replaceUserTargetLines(
  targetId: string,
  payload: ReplaceUserSalesTargetLinesPayload,
): Promise<UserSalesTargetLinesResponse> {
  return apiClient.put<UserSalesTargetLinesResponse>(
    endpoints.crm.userTargetLines(targetId),
    payload,
  );
}
