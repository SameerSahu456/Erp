import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import type { PageResponse } from "@/shared/api/pagination";

// ─── Category approvers (approval.md T3) ────────────────────────────
//
// Wire shapes mirror
// `comprint-erp-backend/app/modules/crm/schemas/category_approver.py`.
// Day-1 only `scope=quote` is live; the enum is listed here in full so
// the FE is ready when sales_order / purchase_request / demo_request
// adopt the shared `category_approvers` table.

export type ApprovalScope =
  "quote" | "sales_order" | "purchase_request" | "demo_request";

export const APPROVAL_SCOPES_ALL: readonly ApprovalScope[] = [
  "quote",
  "sales_order",
  "purchase_request",
  "demo_request",
] as const;

export interface CategoryApproverWire {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string | null;
  threshold: string; // backend returns a Decimal — serialize-safe string
  created_at: string;
}

export interface CategoryApproversScopedResponseWire {
  category_id: string;
  scope: ApprovalScope;
  // The complete set (the unpaginated read and the PUT response).
  approvers: CategoryApproverWire[];
}

// One page of a (category, scope) approver set.
export interface CategoryApproversPageWire extends PageResponse<CategoryApproverWire> {
  category_id: string;
  scope: ApprovalScope;
}

export interface CategoryApproversAllScopesResponseWire {
  category_id: string;
  approvers_by_scope: Record<ApprovalScope, CategoryApproverWire[]>;
}

export interface EligibleApproverWire {
  user_id: string;
  user_name: string;
  user_role: string | null;
  is_superuser: boolean;
}

export interface EligibleApproversResponseWire {
  scope: ApprovalScope;
  users: EligibleApproverWire[];
}

export interface CategoryApproverReplaceItem {
  user_id: string;
  threshold: string | number; // service accepts either; string keeps precision for large values
}

export interface CategoryApproversReplacePayload {
  approvers: CategoryApproverReplaceItem[];
}

// ─── Reads ──────────────────────────────────────────────────────────

export async function fetchCategoryApprovers(
  categoryId: string,
  scope?: ApprovalScope,
): Promise<
  CategoryApproversScopedResponseWire | CategoryApproversAllScopesResponseWire
> {
  return apiClient.get(
    endpoints.crm.categoryApprovers(categoryId),
    scope ? { params: { scope } } : undefined,
  );
}

export async function fetchCategoryApproversForScope(
  categoryId: string,
  scope: ApprovalScope,
): Promise<CategoryApproversScopedResponseWire> {
  return apiClient.get<CategoryApproversScopedResponseWire>(
    endpoints.crm.categoryApprovers(categoryId),
    { params: { scope } },
  );
}

// One page of a (category, scope) approver set — the table on the Category
// page. The Manage dialog must NOT use this: its save is a full replace, so
// it needs `fetchCategoryApproversForScope` (the complete set).
export async function fetchCategoryApproversPage(
  categoryId: string,
  scope: ApprovalScope,
  page: number,
  pageSize: number,
): Promise<CategoryApproversPageWire> {
  return apiClient.get<CategoryApproversPageWire>(
    `${endpoints.crm.categoryApprovers(categoryId)}/${scope}`,
    { params: { page, page_size: pageSize } },
  );
}

// ─── Writes ─────────────────────────────────────────────────────────

export async function replaceCategoryApprovers(
  categoryId: string,
  scope: ApprovalScope,
  payload: CategoryApproversReplacePayload,
): Promise<CategoryApproversScopedResponseWire> {
  return apiClient.put<CategoryApproversScopedResponseWire>(
    endpoints.crm.categoryApprovers(categoryId),
    payload,
    { params: { scope } },
  );
}

// ─── Dropdown source ────────────────────────────────────────────────

export async function fetchEligibleApprovers(
  scope: ApprovalScope,
): Promise<EligibleApproversResponseWire> {
  return apiClient.get<EligibleApproversResponseWire>(
    endpoints.crm.eligibleApprovers,
    { params: { scope } },
  );
}
