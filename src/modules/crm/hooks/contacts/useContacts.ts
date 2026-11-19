import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"

import { PAGINATION, UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import {
  addContactAccountLink,
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  listContactAccounts,
  promoteContactAccountPrimary,
  removeContactAccountLink,
  updateContact,
  type ContactAccountAddPayload,
  type ContactStatus,
  type ContactUpsertPayload,
  type FetchContactsParams,
} from "../../api"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import { invalidateEntityStats } from "../shared/entityStats"

const KEY = ["crm", "contacts"] as const
const LIST_KEY = [...KEY, "list"] as const
const DETAIL_KEY = [...KEY, "detail"] as const
const OPTIONS_KEY = [...KEY, "options"] as const
const ACCOUNTS_KEY = [...KEY, "accounts"] as const
// Existing key shape used by useAccountContacts on AccountDetailPage —
// preserved here so its cache entries are the predicate target when a link
// mutation fires below.
const BY_ACCOUNT_KEY = [...KEY, "by-account"] as const

// ── List / detail ──────────────────────────────────────────────────────

export function useContacts(
  params: FetchContactsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchContacts(params),
    enabled: options?.enabled ?? true,
  })
}

export function useContact(
  id: string | null | undefined,
  options?: { enabled?: boolean; bypassAccess?: boolean },
) {
  // `bypassAccess` requests the access-gate bypass on GET /contacts/{id}
  // (detail/dropdown display flows only — see fetchContact). It's a distinct
  // queryKey level because the response differs from the access-scoped fetch
  // (200 vs 403), so the two variants must not share a cache slot. Mirrors
  // useAccount. Mutation invalidations target the [...DETAIL_KEY, id] prefix,
  // so they still cover both the "scoped" and "bypass-access" entries.
  const bypassAccess = options?.bypassAccess ?? false
  return useQuery({
    queryKey: [...DETAIL_KEY, id, bypassAccess ? "bypass-access" : "scoped"],
    queryFn: () => fetchContact(id as string, { bypassAccess }),
    enabled: !!id && (options?.enabled ?? true),
  })
}

// Infinite-scroll dropdown source for any future contact picker (§16.11).
// Not consumed yet, but cheap to keep here so consumers don't end up
// inventing their own off-pattern pagination.
export function useContactOptions(
  rawSearch: string,
  options: {
    status?: ContactStatus
    accountId?: string
    enabled?: boolean
  } = {},
) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
  const { accountId, enabled } = options
  // Dropdown defaults to Active contacts only; pass an explicit `status`
  // override (e.g. for admin/inactive views) to opt out.
  const status: ContactStatus = options.status ?? "Active"

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
    queryKey: [...OPTIONS_KEY, { search, status, accountId: accountId ?? null }],
    queryFn: ({ pageParam }) =>
      fetchContacts({
        page: pageParam,
        page_size: pageSize,
        search: search || undefined,
        status,
        account_id: accountId,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: enabled ?? true,
  })
}

// ── Contact mutations ──────────────────────────────────────────────────

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactUpsertPayload) => createContact(body),
    onSuccess: (created) => {
      qc.setQueryData([...DETAIL_KEY, created.id], created)
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      // If the contact was created with account links, the AccountDetail
      // Contacts tab for each linked account is now stale.
      for (const acc of created.accounts) {
        void qc.invalidateQueries({
          queryKey: [...BY_ACCOUNT_KEY, acc.account_id],
        })
        void qc.invalidateQueries({
          queryKey: ["crm", "accounts", "detail", acc.account_id],
        })
      }
      invalidateEntityStats(qc)
      toast.success(CONTACTS_STRINGS.toast.created)
    },
    // No onError toast here — the form catches and inspects the ApiError
    // for CONTACT_EMAIL_EXISTS to render a deep-link banner instead of a
    // generic toast.
  })
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactUpsertPayload) => updateContact(id, body),
    onSuccess: (updated) => {
      qc.setQueryData([...DETAIL_KEY, id], updated)
      // The active detail query now carries a scoped/bypass-access queryKey
      // suffix, so the setQueryData above (bare-prefix key) doesn't reach it.
      // Prefix-invalidate so both variants refetch and the edited contact shows
      // immediately (e.g. DealContactSelect's inline-edit → trigger label).
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      toast.success(CONTACTS_STRINGS.toast.updated)
    },
    onError: (error: Error) => {
      toast.error(error.message || CONTACTS_STRINGS.toast.updateFailed)
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: [...DETAIL_KEY, id] })
      void qc.invalidateQueries({ queryKey: LIST_KEY })
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      // Any account-scoped contacts list (AccountDetailPage's tab) is now
      // potentially stale; bare-prefix invalidate is cheap and safe.
      void qc.invalidateQueries({ queryKey: BY_ACCOUNT_KEY })
      invalidateEntityStats(qc)
      toast.success(CONTACTS_STRINGS.toast.deleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || CONTACTS_STRINGS.toast.deleteFailed)
    },
  })
}

// ── Contact ↔ Account links ───────────────────────────────────────────

export function useContactAccounts(
  contactId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, contactId],
    queryFn: () => listContactAccounts(contactId as string),
    enabled: !!contactId && (options?.enabled ?? true),
  })
}

export function useAddContactAccountLink(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactAccountAddPayload) =>
      addContactAccountLink(contactId, body),
    onSuccess: (link) => {
      void qc.invalidateQueries({ queryKey: [...ACCOUNTS_KEY, contactId] })
      // ContactResponse embeds accounts[] + account_count + primary_account_id,
      // so the detail card needs to refresh.
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, contactId] })
      // The account whose tab now has a new contact is stale.
      void qc.invalidateQueries({
        queryKey: [...BY_ACCOUNT_KEY, link.account_id],
      })
      void qc.invalidateQueries({
        queryKey: ["crm", "accounts", "detail", link.account_id],
      })
      invalidateEntityStats(qc)
      toast.success(CONTACTS_STRINGS.toast.accountLinked)
    },
    onError: (error: Error) => {
      toast.error(error.message || CONTACTS_STRINGS.toast.accountLinkFailed)
    },
  })
}

export function useRemoveContactAccountLink(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) =>
      removeContactAccountLink(contactId, accountId),
    onSuccess: (_, accountId) => {
      void qc.invalidateQueries({ queryKey: [...ACCOUNTS_KEY, contactId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, contactId] })
      void qc.invalidateQueries({ queryKey: [...BY_ACCOUNT_KEY, accountId] })
      void qc.invalidateQueries({
        queryKey: ["crm", "accounts", "detail", accountId],
      })
      invalidateEntityStats(qc)
      toast.success(CONTACTS_STRINGS.toast.accountUnlinked)
    },
    onError: (error: Error) => {
      toast.error(error.message || CONTACTS_STRINGS.toast.accountUnlinkFailed)
    },
  })
}

export function usePromoteContactAccountPrimary(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) =>
      promoteContactAccountPrimary(contactId, accountId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...ACCOUNTS_KEY, contactId] })
      void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, contactId] })
      // Primary swap doesn't change which accounts the contact appears
      // under, so we don't refetch BY_ACCOUNT lists.
      toast.success(CONTACTS_STRINGS.toast.primaryUpdated)
    },
    onError: (error: Error) => {
      toast.error(error.message || CONTACTS_STRINGS.toast.primaryUpdateFailed)
    },
  })
}
