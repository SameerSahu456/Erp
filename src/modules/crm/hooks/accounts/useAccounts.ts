import { useEffect, useMemo } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"

import {
  addAccountOwner,
  approveAccount,
  assignParentToChildren,
  reparentWithChildren,
  createAccount,
  createAccountAddress,
  deleteAccount,
  rejectAccount,
  deleteAccountAddress,
  fetchAccount,
  fetchAccountContacts,
  fetchAccountStats,
  fetchAccounts,
  listAccountAddresses,
  listAccountOwners,
  promoteAccountOwnerPrimary,
  removeAccountOwner,
  setAccountAddressDefault,
  updateAccount,
  updateAccountAddress,
  type AccountApprovalStatus,
  type AccountOwnerAddPayload,
  type AccountStatus,
  type AccountTypeWire,
  type AccountUpsertPayload,
  type AddressUpsertPayload,
  type CreateAccountFiles,
  type FetchAccountAddressesParams,
  type FetchAccountsParams,
} from "../../api"
import { accountEntityStatsKey, invalidateEntityStats } from "../shared/entityStats"

const KEY = ["crm", "accounts"] as const
const LIST_KEY = [...KEY, "list"] as const
const DETAIL_KEY = [...KEY, "detail"] as const
const OPTIONS_KEY = [...KEY, "options"] as const
const OWNERS_KEY = [...KEY, "owners"] as const
const ADDRESSES_KEY = [...KEY, "addresses"] as const
const PENDING_KEY = [...KEY, "pending-approvals"] as const

// ── List / detail ──────────────────────────────────────────────────────

export function useAccounts(
  params: FetchAccountsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchAccounts(params),
    enabled: options?.enabled ?? true,
  })
}

// All detail-page tab counts in one call — keeps every badge correct on first
// load, whichever tab is open.
export function useAccountStats(id: string | null | undefined) {
  return useQuery({
    queryKey: accountEntityStatsKey(id as string),
    queryFn: () => fetchAccountStats(id as string),
    enabled: !!id,
  })
}

export function useAccount(
  id: string | null | undefined,
  options?: { enabled?: boolean; bypassAccess?: boolean },
) {
  // `bypassAccess` requests the access-gate bypass on GET /accounts/{id}
  // (create/prefill flows only — see fetchAccount). It's a distinct queryKey
  // level because the response differs from the access-scoped fetch (200 vs
  // 403), so the two variants must not share a cache slot.
  const bypassAccess = options?.bypassAccess ?? false
  return useQuery({
    queryKey: [...DETAIL_KEY, id, bypassAccess ? "bypass-access" : "scoped"],
    queryFn: () => fetchAccount(id as string, { bypassAccess }),
    enabled: !!id && (options?.enabled ?? true),
  })
}

/**
 * Display names for a set of account ids — for chips / labels that hold only
 * ids (e.g. a URL-backed multi-account filter after a reload). One cached
 * detail fetch per id, sharing `useAccount`'s bypass-access cache slot (a label
 * must render even when the viewer lacks per-record access). Unresolved ids
 * are simply absent from the map.
 */
export function useAccountNames(ids: string[]): Record<string, string> {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...DETAIL_KEY, id, "bypass-access"],
      queryFn: () => fetchAccount(id, { bypassAccess: true }),
      enabled: !!id,
    })),
  })
  const names: Record<string, string> = {}
  results.forEach((r, i) => {
    if (r.data) names[ids[i]!] = r.data.name
  })
  return names
}

/**
 * Full detail record per account id — lets a picker render a SELECTED account
 * that sits on a page it has not loaded yet. Shares `useAccountNames`' cached
 * bypass-access slot (one fetch per id, reused). Unresolved ids are absent.
 */
export function useAccountsByIds(ids: string[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...DETAIL_KEY, id, "bypass-access"],
      queryFn: () => fetchAccount(id, { bypassAccess: true }),
      enabled: !!id,
    })),
  })
  const accountsById: Record<string, NonNullable<(typeof results)[number]["data"]>> = {}
  results.forEach((r, i) => {
    if (r.data) accountsById[ids[i]!] = r.data
  })
  return accountsById
}

// Infinite-scroll children walk for the Detail page's Child Accounts card.
// Mirrors useAccountOptions' pagination contract (§16.8 — multi-bucket views
// query per bucket with infinite scroll): one useInfiniteQuery keyed on the
// parent id, fetching `DEFAULT_PAGE_SIZE` rows per page and surfacing
// `total` from the envelope so the card can render the running count.
export function useChildAccountsInfinite(
  parentId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "children", parentId, pageSize],
    queryFn: ({ pageParam }) =>
      fetchAccounts({
        page: pageParam,
        page_size: pageSize,
        parent_account_id: parentId ?? undefined,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: !!parentId && (options?.enabled ?? true),
  })
}

// Infinite-scroll dropdown source for the parent-account picker (§16.11).
// `excludeId` filters the current account out so it can't pick itself.
// `excludeIds` filters out any additional accounts (e.g. the parent account
// when linking children, so it can't be linked back as a child).
export function useAccountOptions(
  rawSearch: string,
  options: {
    excludeId?: string
    excludeIds?: string[]
    /** Exact-match account-type filter. When set, the picker only surfaces
     *  accounts of this type — used so a parent/child can only be linked to an
     *  account of the SAME type. ANDed server-side with the eligible-* filters. */
    accountType?: AccountTypeWire
    /** Account status filter. Defaults to `"Active"`; pass `null` to include
     *  every status (e.g. a list filter that must reach inactive accounts). */
    status?: AccountStatus | null
    /** KYC approval filter. Defaults to `["Approved"]` so pickers only ever
     *  surface approved accounts. Pass an explicit value (e.g. `[]` mapped to
     *  undefined by the caller, or a different set) to opt out. */
    approvalStatuses?: AccountApprovalStatus[]
    // Cycle-safe server filters (recursive-CTE). Pass `eligibleParentFor` to
    // list valid parents for an account (drops it + its subtree) or
    // `eligibleChildFor` to list valid children (drops it + its ancestors).
    // The picker then never surfaces an option that would trip the backend's
    // ACCOUNT_HIERARCHY_CYCLE guard — no need to pre-exclude deep descendants
    // client-side. Pass at most one.
    eligibleParentFor?: string
    eligibleChildFor?: string
    enabled?: boolean
  } = {},
) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const {
    excludeId,
    excludeIds,
    accountType,
    eligibleParentFor,
    eligibleChildFor,
    enabled,
  } = options
  // Union of the single + list exclusions, deduped and sorted. Keyed on the
  // joined contents (not the array reference) so a fresh `excludeIds` literal
  // from the caller doesn't recompute or churn the queryKey each render.
  const excludedKey = [excludeId, ...(excludeIds ?? [])].filter(Boolean).sort().join(",")
  const excluded = useMemo(
    () => (excludedKey ? excludedKey.split(",") : []),
    [excludedKey],
  )
  // Dropdown defaults to Active accounts only — pickers should not surface
  // inactive/prospect rows. Callers that need the unfiltered view (admin
  // tools, audit screens) opt out by passing an explicit `status` override.
  const status: AccountStatus | null = options.status === undefined ? "Active" : options.status
  // Pickers only surface approved accounts — never let a user link a deal,
  // sales order, contact, or parent/child to a pending or rejected account.
  const approvalStatuses: AccountApprovalStatus[] =
    options.approvalStatuses ?? ["Approved"]
  const approvalKey = approvalStatuses.join(",")

  // When the picker closes (callers pass `enabled: open`, so this goes false),
  // drop the accumulated pages. The next open then starts fresh at page 1 — a
  // single call, exactly like the first open — instead of TanStack refetching
  // every previously-scrolled page (infinite queries refetch ALL held pages on
  // a stale refetch).
  const qc = useQueryClient()
  useEffect(() => {
    if (enabled === false) void qc.resetQueries({ queryKey: OPTIONS_KEY })
  }, [enabled, qc])

  return useInfiniteQuery({
    queryKey: [
      ...OPTIONS_KEY,
      {
        search,
        status,
        approvalKey,
        excluded,
        accountType,
        eligibleParentFor,
        eligibleChildFor,
      },
    ],
    queryFn: ({ pageParam }) =>
      fetchAccounts({
        page: pageParam,
        page_size: pageSize,
        search: search || undefined,
        status: status ?? undefined,
        account_type: accountType,
        approval_statuses: approvalStatuses,
        eligible_parent_for: eligibleParentFor,
        eligible_child_for: eligibleChildFor,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: enabled ?? true,
    select: (data) =>
      excluded.length
        ? {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              items: p.items.filter((i) => !excluded.includes(i.id)),
            })),
          }
        : data,
  })
}

// ── Account mutations ──────────────────────────────────────────────────

// 2026-05-19: createAccount is now multipart and optionally carries up to 5
// KYC files alongside the JSON `data` field. The mutation arg is split into
// `{ payload, files }` so the form page can pass file slots without polluting
// the upsert payload shape.
export interface CreateAccountVars {
  payload: AccountUpsertPayload
  files?: CreateAccountFiles
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, files }: CreateAccountVars) =>
      createAccount(payload, files),
    onSuccess: (created) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      toast.success(S.toast.created)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.createFailed)
    },
  })
}

export function useUpdateAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AccountUpsertPayload) => updateAccount(id, body),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      toast.success(S.toast.updated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.updateFailed)
    },
  })
}

// Reconcile the set of children for `parentId`: `toAdd` accounts get their
// `parent_account_id` set to this parent (linked), `toRemove` accounts get it
// cleared to null (unlinked). Drives the Child Accounts manage modal — the
// multi-select seeds with current children, and Save applies the diff.
//
// Adds go through the bulk parent-child-relationships endpoint
// (assignParentToChildren) — the single hierarchy-assignment path. A candidate
// that itself already has children can't simply become a child (a child can't
// keep its own children under the 2-level policy), so those ids are passed in
// `reparentIds` and routed through reparentWithChildren — the candidate AND its
// descendants all move under this parent. Unlinks still clear
// parent_account_id per-account because the bulk endpoint can't express a
// "clear" (backend to be extended later); once it can, toRemove moves over too.
//
// Targeted invalidation (§16.9): the parent's children list (LIST_KEY carries
// the parent_account_id filter), the parent detail, and each touched child.
export function useSyncChildAccounts(parentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      toAdd,
      toRemove,
      reparentIds = [],
    }: {
      toAdd: string[]
      toRemove: string[]
      // Subset of toAdd whose own subtree must be flattened under this parent.
      reparentIds?: string[]
    }) => {
      const reparentSet = new Set(reparentIds)
      const flatAdds = toAdd.filter((id) => !reparentSet.has(id))
      if (flatAdds.length) await assignParentToChildren(parentId, flatAdds)
      // Each candidate-with-children moves with its descendants. Collect the
      // grandchild ids that rode up so their detail caches refresh too.
      const cascadedGrandchildren: string[] = []
      for (const id of reparentIds) {
        const moved = await reparentWithChildren(id, parentId)
        for (const m of moved) {
          if (m.id !== id) cascadedGrandchildren.push(m.id)
        }
      }
      const unlinked = await Promise.all(
        toRemove.map((id) => updateAccount(id, { parent_account_id: null })),
      )
      return {
        unlinked,
        addedIds: [...toAdd, ...cascadedGrandchildren],
        added: toAdd.length,
        removed: toRemove.length,
      }
    },
    onSuccess: ({ unlinked, addedIds, added, removed }) => {
      // Unlinks return the full account → write straight to its detail cache.
      for (const acc of unlinked) {
        qc.setQueryData([...DETAIL_KEY, acc.id], acc)
      }
      // Bulk-added children come back as slim rows, so invalidate their detail
      // rather than seeding it.
      for (const id of addedIds) {
        void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      }
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, parentId] })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      const parts: string[] = []
      if (added) parts.push(S.toast.childAccountsLinked(added))
      if (removed) parts.push(S.toast.childAccountsUnlinked(removed))
      toast.success(
        parts.length
          ? S.toast.childAccountsUpdatedDetail(parts.join(", "))
          : S.toast.childAccountsUpdated,
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.childAccountsUpdateFailed)
    },
  })
}

// Set or clear THIS account's parent ("Add / Change / Remove parent").
//
// The 2-level hierarchy policy: a child account can't keep its own children, so
// the path depends on whether this account already HAS children:
//   • No children → set the parent via the bulk parent-child-relationships
//     endpoint, inverted (the picked account is the parent, this account is the
//     lone child).
//   • Has children → call reparentWithChildren so this account AND all its live
//     descendants move under the new parent in one transaction (the children
//     ride up — they can't stay under a now-child account).
// Clearing (parentId = null) always uses the per-account updateAccount(null)
// path (the bulk endpoint can't express a clear). Either way the server's
// cycle/depth guard (ACCOUNT_HIERARCHY_CYCLE / ACCOUNT_DEPTH_EXCEEDED) applies
// and surfaces via the error.message toast.
//
// `hasChildren` is passed by the caller (the detail page knows the child total)
// so the hook picks the right path without an extra fetch.
//
// Targeted invalidation (§16.9): this account's detail, the children lists
// (LIST_KEY carries parent_account_id, so both the old and new parent's Child
// cards refresh), and the new parent's detail. When children move too we also
// invalidate each moved child's detail (returned as slim rows).
export function useSetParentAccount(
  accountId: string,
  options?: { hasChildren?: boolean },
) {
  const qc = useQueryClient()
  const hasChildren = options?.hasChildren ?? false
  return useMutation({
    mutationFn: async (parentId: string | null) => {
      if (!parentId) {
        await updateAccount(accountId, { parent_account_id: null })
        return { parentId, movedChildIds: [] as string[] }
      }
      if (hasChildren) {
        const moved = await reparentWithChildren(accountId, parentId)
        // The account itself is in the moved list — keep only the children.
        const movedChildIds = moved
          .map((m) => m.id)
          .filter((id) => id !== accountId)
        return { parentId, movedChildIds }
      }
      await assignParentToChildren(parentId, [accountId])
      return { parentId, movedChildIds: [] as string[] }
    },
    onSuccess: ({ parentId, movedChildIds }) => {
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      for (const id of movedChildIds) {
        void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      }
      if (parentId)
        void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, parentId] })
      toast.success(
        parentId ? S.toast.parentAccountSet : S.toast.parentAccountCleared,
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.parentAccountUpdateFailed)
    },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      toast.success(S.toast.deleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.deleteFailed)
    },
  })
}

// ── Approval ───────────────────────────────────────────────────────────

export function useApproveAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => approveAccount(id, reason),
    onSuccess: (updated) => {
      // The detail query keys on a 3rd segment ("scoped" | "bypass-access"),
      // so writing to `[...DETAIL_KEY, id]` alone misses the mounted query and
      // the header keeps the stale approval_status until a manual refresh.
      // Seed the scoped slot for an instant flip, then invalidate the whole
      // `[...DETAIL_KEY, id]` prefix so every variant refetches.
      qc.setQueryData([...DETAIL_KEY, id, "scoped"], updated)
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: PENDING_KEY })
      toast.success("Account approved")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve account")
    },
  })
}

export function useRejectAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => rejectAccount(id, reason),
    onSuccess: (updated) => {
      // See useApproveAccount: the detail query keys on a 3rd segment, so seed
      // the scoped slot and invalidate the `[...DETAIL_KEY, id]` prefix so the
      // header flips to "Rejected" immediately instead of after a refresh.
      qc.setQueryData([...DETAIL_KEY, id, "scoped"], updated)
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: PENDING_KEY })
      toast.success("Account rejected")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject account")
    },
  })
}

// ── Owners ─────────────────────────────────────────────────────────────

export function useAccountOwners(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...OWNERS_KEY, accountId],
    queryFn: () => listAccountOwners(accountId as string),
    enabled: !!accountId && (options?.enabled ?? true),
  })
}

export function useAddAccountOwner(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AccountOwnerAddPayload) => addAccountOwner(accountId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...OWNERS_KEY, accountId] })
      // Detail embeds account_owner_ids / primary_owner_id, so refresh it.
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      toast.success(S.toast.ownerAdded)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.ownerAddFailed)
    },
  })
}

export function useRemoveAccountOwner(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeAccountOwner(accountId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...OWNERS_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      toast.success(S.toast.ownerRemoved)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.ownerRemoveFailed)
    },
  })
}

export function usePromoteAccountOwnerPrimary(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      promoteAccountOwnerPrimary(accountId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...OWNERS_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      toast.success(S.toast.primaryUpdated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.primaryUpdateFailed)
    },
  })
}

// ── Addresses ──────────────────────────────────────────────────────────

export function useAccountAddresses(
  accountId: string | null | undefined,
  params: FetchAccountAddressesParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ADDRESSES_KEY, accountId, params],
    queryFn: () => listAccountAddresses(accountId as string, params),
    enabled: !!accountId && (options?.enabled ?? true),
  })
}

export function useCreateAccountAddress(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddressUpsertPayload) =>
      createAccountAddress(accountId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADDRESSES_KEY, accountId] })
      // default_billing_address / default_shipping_address are embedded in
      // AccountResponse, so the detail card needs to refresh too.
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      invalidateEntityStats(qc, { type: "account", id: accountId })
      toast.success(S.toast.addressAdded)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.addressAddFailed)
    },
  })
}

export function useUpdateAccountAddress(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      addressId,
      body,
    }: {
      addressId: string
      body: Partial<AddressUpsertPayload>
    }) => updateAccountAddress(accountId, addressId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADDRESSES_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      toast.success(S.toast.addressUpdated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.addressUpdateFailed)
    },
  })
}

export function useSetAccountAddressDefault(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) =>
      setAccountAddressDefault(accountId, addressId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADDRESSES_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      toast.success(S.toast.defaultAddressUpdated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.defaultAddressFailed)
    },
  })
}

// ── Contacts linked to an account ──────────────────────────────────────

export function useAccountContacts(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["crm", "contacts", "by-account", accountId],
    queryFn: () => fetchAccountContacts(accountId as string),
    enabled: !!accountId && (options?.enabled ?? true),
  })
}

export function useDeleteAccountAddress(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) =>
      deleteAccountAddress(accountId, addressId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ADDRESSES_KEY, accountId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, accountId] })
      invalidateEntityStats(qc, { type: "account", id: accountId })
      toast.success(S.toast.addressDeleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.addressDeleteFailed)
    },
  })
}
