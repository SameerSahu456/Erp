import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce, useFilterParams, useUrlPagination } from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import {
  ACCOUNT_TYPE_VALUES,
  INDUSTRY_OPTIONS,
  approveAccount,
  fetchPendingApprovals,
  rejectAccount,
  type AccountTypeWire,
  type PendingApprovalListItem,
} from "../../api"
import type { ToolbarFilter } from "../../components/shared/CrmDataTable"
import type {
  AccountApproval,
  AccountApprovalDecision,
} from "../../data/accountApprovals"

const PENDING_KEY = ["crm", "accounts", "pending-approvals"] as const
const ACCOUNTS_KEY = ["crm", "accounts"] as const

function toApprovalRow(a: PendingApprovalListItem): AccountApproval {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    entityType: a.parent_account_id ? "Child" : "Parent",
    industry: a.industry ?? "—",
    accountType: a.account_type,
    submittedBy: a.created_by.name,
    submittedAt: a.created_at,
  }
}

/**
 * Container logic for the Accounts → Approval tab. Fetches the real pending
 * queue (`GET /crm/accounts/pending-approvals`, approver-only), and approves /
 * rejects via the real endpoints. A decision invalidates the pending list, the
 * accounts list, and any open detail so every surface reflects the new state.
 */
export function useAccountApprovals(options?: { enabled?: boolean }) {
  const qc = useQueryClient()
  // Visible to superusers, the SUPERADMIN / ADMIN roles, AND any user holding
  // the `crm:account_approve` permission (`can` covers superuser + the grant;
  // `isAdminRole` covers the role names). `canApprove` is derived (no fetch),
  // so tab visibility works without firing the query off-tab.
  const { isAdminRole, can } = usePermission()
  const canApprove = isAdminRole || can([...crmCan.approveAccount])
  // Gate the fetch on the caller's `enabled` (e.g. only while the Approval tab
  // is open) AND admin-only access. `canApprove` is role-derived (no fetch), so
  // tab visibility still works without firing the query off-tab.
  const active = (options?.enabled ?? true) && canApprove

  // Page, page size, and every server-side filter live in the URL under
  // tab-namespaced keys (`ap_page` / `ap_size` / `ap_search` / `ap_industry` /
  // `ap_type`) — separate from the accounts list (`page` / `search` / …) and
  // the access tab (`acc_*`) so the four Accounts tabs never collide on one
  // query string. Mirrors the Accounts list: filters survive a refresh, a
  // detail round-trip, and browser back/forward. Writing any filter clears
  // `ap_page` (via `useFilterParams`), so a filter change lands back on page 1.
  const { get, set, setMany } = useFilterParams({ pageKey: "ap_page" })
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "ap_size",
    pageKey: "ap_page",
    defaultSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })

  // Server-side filters (mirror the backend additions to
  // GET /accounts/pending-approvals). Search matches account name + code;
  // industry + account_type are exact. No parent/child filter — pending
  // accounts are always root (children inherit their approved parent's status).
  const search = get("ap_search", "")
  const industry = get("ap_industry", "")
  const accountType = (get("ap_type", "") as AccountTypeWire | "") || ""
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  const setSearch = useCallback((v: string) => set("ap_search", v || null), [set])

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      ...PENDING_KEY,
      page,
      pageSize,
      debouncedSearch,
      industry,
      accountType,
    ],
    queryFn: () =>
      fetchPendingApprovals({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        industry: industry || undefined,
        account_type: accountType || undefined,
      }),
    enabled: active,
  })

  const toolbarFilters = useMemo<ToolbarFilter[]>(
    () => [
      {
        key: "industry",
        label: "Industry",
        allLabel: "Industries",
        value: industry,
        options: INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i })),
      },
      {
        key: "account_type",
        label: "Type",
        allLabel: "Types",
        value: accountType,
        options: ACCOUNT_TYPE_VALUES.map((t) => ({ value: t, label: t })),
      },
    ],
    [industry, accountType],
  )

  const handleToolbarFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "industry") set("ap_industry", value || null)
      else if (key === "account_type") set("ap_type", value || null)
    },
    [set],
  )

  const handleClearFilters = useCallback(() => {
    setMany({ ap_search: null, ap_industry: null, ap_type: null })
  }, [setMany])

  const rows = useMemo<AccountApproval[]>(
    () => (data?.items ?? []).map(toApprovalRow),
    [data?.items],
  )
  const total = data?.total ?? 0

  // Decision dialog (inline row Approve / Reject).
  const [review, setReview] = useState<AccountApproval | null>(null)
  const [intent, setIntent] = useState<AccountApprovalDecision>("Approved")
  const [reason, setReason] = useState("")

  const openReview = useCallback(
    (id: string, withIntent: AccountApprovalDecision) => {
      const found = rows.find((r) => r.id === id)
      if (!found) return
      setReview(found)
      setIntent(withIntent)
      setReason("")
    },
    [rows],
  )

  const closeReview = useCallback(() => {
    setReview(null)
    setReason("")
  }, [])

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
  }, [qc])

  const approveMut = useMutation({
    mutationFn: ({ id, reason: r }: { id: string; reason?: string }) =>
      approveAccount(id, r),
    onSuccess: (_data, { id }) => {
      toast.success(`${rows.find((r) => r.id === id)?.name ?? "Account"} approved`)
      invalidate()
      closeReview()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not approve the account."),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason: r }: { id: string; reason: string }) =>
      rejectAccount(id, r),
    onSuccess: (_data, { id }) => {
      toast.success(`${rows.find((r) => r.id === id)?.name ?? "Account"} rejected`)
      invalidate()
      closeReview()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not reject the account."),
  })

  const confirmApprove = useCallback(() => {
    if (review) approveMut.mutate({ id: review.id, reason: reason.trim() || undefined })
  }, [review, reason, approveMut])

  const confirmReject = useCallback(() => {
    if (!review) return
    if (!reason.trim()) {
      toast.error("A rejection reason is required.")
      return
    }
    rejectMut.mutate({ id: review.id, reason: reason.trim() })
  }, [review, reason, rejectMut])

  const isDeciding = approveMut.isPending || rejectMut.isPending

  return useMemo(
    () => ({
      canApprove,
      rows,
      total,
      pendingCount: total,
      isLoading,
      isError,
      error,
      isFetching,
      page,
      pageSize,
      setPage,
      setPageSize,
      // Search + server-side filters for the toolbar.
      search,
      setSearch,
      toolbarFilters,
      handleToolbarFilterChange,
      handleClearFilters,
      review,
      intent,
      reason,
      setReason,
      openReview,
      closeReview,
      confirmApprove,
      confirmReject,
      isDeciding,
    }),
    [
      canApprove,
      rows,
      total,
      isLoading,
      isError,
      error,
      isFetching,
      page,
      pageSize,
      search,
      setSearch,
      toolbarFilters,
      handleToolbarFilterChange,
      handleClearFilters,
      review,
      intent,
      reason,
      openReview,
      closeReview,
      confirmApprove,
      confirmReject,
      isDeciding,
    ],
  )
}

export type AccountApprovalsController = ReturnType<typeof useAccountApprovals>
