import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION, UI } from "@/shared/constants"
import {
  useDebounce,
  useFilterParams,
  useUrlMultiFilter,
  useUrlPagination,
} from "@/shared/hooks"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import {
  ACCOUNT_TYPE_VALUES,
  approveAccessRequest,
  fetchAccessRequests,
  rejectAccessRequest,
  requestAccountAccess,
  type AccountAccessRequest,
  type AccountTypeWire,
} from "../../api"
import type { ToolbarFilter } from "../../components/shared/CrmDataTable"

const ACCESS_KEY = ["crm", "accounts", "access-requests"] as const
const ACCOUNTS_KEY = ["crm", "accounts"] as const

export type AccessDecision = "Approved" | "Rejected"

/**
 * Container logic for the Accounts → Access tab. Fetches the real pending
 * access-request queue (`GET /crm/accounts/access-requests`, approver-only)
 * and approves / rejects via the real endpoints. A decision invalidates the
 * queue + the accounts list so every surface reflects the new state.
 */
export function useAccessRequests(options?: { enabled?: boolean }) {
  const qc = useQueryClient()
  const { can, isAdminRole } = usePermission()
  // admin/superadmin (by role name) OR the crm:account_request_approve grant
  // (which also covers is_superuser via `can`). This is the access-request
  // gate — distinct from the KYC `crm:account_approve` gate on the Approval tab.
  const canApprove = isAdminRole || can([...crmCan.approveAccountRequest])
  // Gate the fetch on the caller's `enabled` (only while the Access tab is open)
  // AND admin-only access. `canApprove` is role-derived (no fetch), so tab
  // visibility still works without firing the query off-tab.
  const active = (options?.enabled ?? true) && canApprove

  // Page, page size, and every server-side filter live in the URL under
  // tab-namespaced keys (`acc_page` / `acc_size` / `acc_search` / `acc_type`)
  // — separate from the accounts list (`page` / `search` / …) and the approval
  // tab (`ap_*`) so the four Accounts tabs never collide on one query string.
  // Mirrors the Accounts list: filters survive a refresh, a detail round-trip,
  // and browser back/forward. Writing any filter clears `acc_page` (via
  // `useFilterParams`), so a filter change always lands back on page 1.
  const { get, set, setMany } = useFilterParams({ pageKey: "acc_page" })
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "acc_size",
    pageKey: "acc_page",
    defaultSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })

  // Server-side filters (mirror the backend additions to
  // GET /accounts/access-requests). Search matches the request's account name +
  // code; account_type narrows by channel type (and composes with the caller's
  // own channel scope).
  const search = get("acc_search", "")
  const accountType = (get("acc_type", "") as AccountTypeWire | "") || ""
  // Multi-select "Requested By" — repeated `?requested_by=` keys on the API.
  const [selectedRequestedBy, setSelectedRequestedBy] = useUrlMultiFilter("acc_requested_by")
  const requestedBy = selectedRequestedBy.length > 0 ? selectedRequestedBy : undefined
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  const setSearch = useCallback((v: string) => set("acc_search", v || null), [set])

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [...ACCESS_KEY, "queue", page, pageSize, debouncedSearch, accountType, requestedBy],
    queryFn: () =>
      fetchAccessRequests({
        status: "Pending",
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        account_type: accountType || undefined,
        requested_by: requestedBy,
      }),
    enabled: active,
  })

  const toolbarFilters = useMemo<ToolbarFilter[]>(
    () => [
      {
        key: "account_type",
        label: "Type",
        allLabel: "Types",
        value: accountType,
        options: ACCOUNT_TYPE_VALUES.map((t) => ({ value: t, label: t })),
      },
    ],
    [accountType],
  )

  const handleToolbarFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "account_type") set("acc_type", value || null)
    },
    [set],
  )

  const handleClearFilters = useCallback(() => {
    setMany({ acc_search: null, acc_type: null, acc_requested_by: null })
  }, [setMany])

  const requests = useMemo<AccountAccessRequest[]>(
    () => data?.items ?? [],
    [data?.items],
  )
  const total = data?.total ?? 0

  // Decision dialog (inline row Grant / Reject).
  const [review, setReview] = useState<AccountAccessRequest | null>(null)
  const [intent, setIntent] = useState<AccessDecision>("Approved")
  const [note, setNote] = useState("")

  const openReview = useCallback(
    (id: string, withIntent: AccessDecision) => {
      const found = requests.find((r) => r.id === id)
      if (!found) return
      setReview(found)
      setIntent(withIntent)
      setNote("")
    },
    [requests],
  )

  const closeReview = useCallback(() => {
    setReview(null)
    setNote("")
  }, [])

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
  }, [qc])

  const approveMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveAccessRequest(id, notes),
    onSuccess: (_data, { id }) => {
      const who = requests.find((r) => r.id === id)?.requested_by.name ?? "User"
      toast.success(`Access granted to ${who}`)
      invalidate()
      closeReview()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not grant access."),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      rejectAccessRequest(id, notes),
    onSuccess: (_data, { id }) => {
      const who = requests.find((r) => r.id === id)?.requested_by.name ?? "User"
      toast.success(`Access rejected for ${who}`)
      invalidate()
      closeReview()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not reject the request."),
  })

  const confirmApprove = useCallback(() => {
    if (review) approveMut.mutate({ id: review.id, notes: note.trim() || undefined })
  }, [review, note, approveMut])

  const confirmReject = useCallback(() => {
    if (!review) return
    if (!note.trim()) {
      toast.error("A rejection note is required.")
      return
    }
    rejectMut.mutate({ id: review.id, notes: note.trim() })
  }, [review, note, rejectMut])

  const isDeciding = approveMut.isPending || rejectMut.isPending

  return useMemo(
    () => ({
      canApprove,
      requests,
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
      selectedRequestedBy,
      setSelectedRequestedBy,
      toolbarFilters,
      handleToolbarFilterChange,
      handleClearFilters,
      review,
      intent,
      note,
      setNote,
      openReview,
      closeReview,
      confirmApprove,
      confirmReject,
      isDeciding,
    }),
    [
      canApprove,
      requests,
      total,
      isLoading,
      isError,
      error,
      isFetching,
      page,
      pageSize,
      setPage,
      search,
      setSearch,
      selectedRequestedBy,
      setSelectedRequestedBy,
      toolbarFilters,
      handleToolbarFilterChange,
      handleClearFilters,
      review,
      intent,
      note,
      openReview,
      closeReview,
      confirmApprove,
      confirmReject,
      isDeciding,
    ],
  )
}

export type AccessRequestsController = ReturnType<typeof useAccessRequests>

/**
 * Requester-side mutation: raise an access request for an account, carrying the
 * user's reason. Invalidates the accounts list so any per-row state refreshes.
 */
export function useRequestAccountAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountId,
      requestedNotes,
    }: {
      accountId: string
      requestedNotes: string
    }) => requestAccountAccess(accountId, requestedNotes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      toast.success("Access request sent for approval")
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Could not send the access request.",
      ),
  })
}
